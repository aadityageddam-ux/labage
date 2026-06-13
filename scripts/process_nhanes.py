"""
NHANES 2017-2018 percentile processing script.

Downloads NHANES cycle J XPT files from the CDC public HTTPS endpoint,
merges them by SEQN, applies standard exclusion criteria, computes PhenoAge
for each participant using the Levine 2018 algorithm, then writes stratified
percentile data to data/nhanes_reference.json.

Usage:
    python scripts/process_nhanes.py

Output:
    data/nhanes_reference.json

Reference:
    Levine et al., Aging (Albany NY), 2018. PMID: 29676998
    NHANES 2017-2018: https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?BeginYear=2017
"""

from __future__ import annotations

import json
import math
import urllib.request
from io import BytesIO
from pathlib import Path

import numpy as np
import pandas as pd

# ─── Paths ────────────────────────────────────────────────────────────────────

REPO_ROOT   = Path(__file__).resolve().parent.parent
CACHE_DIR   = REPO_ROOT / ".nhanes_cache"
OUTPUT_PATH = REPO_ROOT / "data" / "nhanes_reference.json"

CACHE_DIR.mkdir(exist_ok=True)

# ─── NHANES 2017-2018 (cycle J) XPT file URLs ────────────────────────────────

XPT_FILES = {
    "DEMO":   "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/DEMO_J.xpt",
    "BIOPRO": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BIOPRO_J.xpt",
    "CRP":    "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/HSCRP_J.xpt",
    "CBC":    "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/CBC_J.xpt",
}

# ─── Levine 2018 PhenoAge Coefficients ────────────────────────────────────────
# Coefficients operate on SI units; inputs must be converted before applying.

COEFF = {
    "intercept":      -19.9067,
    "albumin":         -0.0336,   # per g/L    (NHANES: g/dL × 10)
    "creatinine":       0.0095,   # per μmol/L (NHANES: mg/dL × 88.4)
    "glucose":          0.1953,   # per mmol/L (NHANES: mg/dL × 0.0555)
    "crp_ln":           0.0954,   # per ln(mg/dL) (NHANES: mg/L × 0.1, then ln)
    "lymphocyte_pct":  -0.0120,   # per %
    "mcv":              0.0268,   # per fL
    "rdw":              0.3306,   # per %
    "alp":              0.00188,  # per U/L
    "wbc":              0.0554,   # per K/μL
    "age":              0.0804,   # per year
}

GOMPERTZ_GAMMA  = 0.0076927
GOMPERTZ_T      = 120            # months (10-year horizon)
GOMPERTZ_FACTOR = (math.exp(GOMPERTZ_GAMMA * GOMPERTZ_T) - 1) / GOMPERTZ_GAMMA

PHENO_ALPHA = 141.50225
PHENO_BETA  = -0.00553
PHENO_GAMMA =  0.09165

CRP_FLOOR_MGDL = 0.001          # prevents ln(0)

# ─── Helpers ─────────────────────────────────────────────────────────────────


def download_xpt(name: str, url: str) -> pd.DataFrame:
    """Download an XPT file (cached) and return as DataFrame."""
    cache_file = CACHE_DIR / f"{name}.XPT"
    if cache_file.exists():
        print(f"  [cache] {name}")
    else:
        print(f"  [download] {name} ...")
        req = urllib.request.Request(url, headers={"User-Agent": "LabAge-NHANES-Processor/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        cache_file.write_bytes(data)
        print(f"           -> {len(data) / 1024:.0f} KB saved")
    return pd.read_sas(str(cache_file), format="xport", encoding="utf-8")


def compute_phenoage(df: pd.DataFrame) -> pd.Series:
    """
    Compute PhenoAge for each row using Levine 2018 algorithm.
    All biomarker columns must already be present (NaN rows are propagated).
    """
    crp_mgdl  = (df["crp_mgl"] * 0.1).clip(lower=CRP_FLOOR_MGDL)
    crp_ln    = np.log(crp_mgdl)

    xb = (
        COEFF["intercept"]
        + COEFF["albumin"]        * (df["albumin_gdl"]      * 10)
        + COEFF["creatinine"]     * (df["creatinine_mgdl"]   * 88.4)
        + COEFF["glucose"]        * (df["glucose_mgdl"]      * 0.0555)
        + COEFF["crp_ln"]         * crp_ln
        + COEFF["lymphocyte_pct"] *  df["lymphocyte_pct"]
        + COEFF["mcv"]            *  df["mcv_fl"]
        + COEFF["rdw"]            *  df["rdw_pct"]
        + COEFF["alp"]            *  df["alp_ul"]
        + COEFF["wbc"]            *  df["wbc_kul"]
        + COEFF["age"]            *  df["age_yr"]
    )

    M = 1 - np.exp(-np.exp(xb) * GOMPERTZ_FACTOR)
    M = M.clip(upper=0.9999)

    pheno_age = PHENO_ALPHA + np.log(PHENO_BETA * np.log(1 - M)) / PHENO_GAMMA
    return pheno_age


def percentile_stats(series: pd.Series) -> dict:
    """Return percentile stats dict for a non-null series."""
    s = series.dropna()
    if len(s) < 10:
        return {}
    ps = np.percentile(s, [5, 10, 25, 50, 75, 90, 95]).round(3).tolist()
    return {
        "n":    int(len(s)),
        "mean": round(float(s.mean()), 3),
        "sd":   round(float(s.std()),  3),
        "p5":   ps[0],
        "p10":  ps[1],
        "p25":  ps[2],
        "p50":  ps[3],
        "p75":  ps[4],
        "p90":  ps[5],
        "p95":  ps[6],
    }


def age_bin_label(age: float) -> str | None:
    """Return age-bin string like '30_40' for a given age, or None if out of range."""
    bins = [(18, 30), (30, 40), (40, 50), (50, 60), (60, 70), (70, 80), (80, 90)]
    for lo, hi in bins:
        if lo <= age < hi:
            return f"{lo}_{hi}"
    return None


# ─── Main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    print("\n=== NHANES 2017-2018 percentile processor ===\n")

    # 1. Download / load XPT files
    print("Downloading XPT files (cached after first run):")
    raw: dict[str, pd.DataFrame] = {}
    for name, url in XPT_FILES.items():
        raw[name] = download_xpt(name, url)
        print(f"           {name}: {len(raw[name])} rows, cols: {list(raw[name].columns[:6])}...")

    # 2. Inspect column names so we pick the right variables
    print("\nColumn names for variable mapping:")
    for name, df in raw.items():
        print(f"  {name}: {sorted(df.columns.tolist())}")

    # 3. Extract relevant columns
    demo = raw["DEMO"][["SEQN", "RIDAGEYR", "RIAGENDR", "RIDEXPRG"]].copy()
    demo.columns = ["seqn", "age_yr", "gender", "pregnant"]

    bio = raw["BIOPRO"][["SEQN"]].copy()
    # Map NHANES BIOPRO variable names → our names
    # We'll try both common naming conventions
    biopro_df = raw["BIOPRO"]
    bio_col_map = {}

    # Albumin
    for col in ["LBXSAL", "LBDSALSI"]:
        if col in biopro_df.columns:
            bio_col_map["albumin_gdl"] = col
            break

    # Creatinine
    for col in ["LBXSCR", "LBDSCRSI"]:
        if col in biopro_df.columns:
            bio_col_map["creatinine_mgdl"] = col
            break

    # Glucose
    for col in ["LBXSGL", "LBXGLU", "LBDSGLSI"]:
        if col in biopro_df.columns:
            bio_col_map["glucose_mgdl"] = col
            break

    # Alkaline phosphatase
    for col in ["LBXSAPSI", "LBXSAP", "LBDSAPSI"]:
        if col in biopro_df.columns:
            bio_col_map["alp_ul"] = col
            break

    print(f"\nBIOPRO column mapping: {bio_col_map}")
    missing_bio = [k for k in ["albumin_gdl", "creatinine_mgdl", "glucose_mgdl", "alp_ul"] if k not in bio_col_map]
    if missing_bio:
        print(f"WARNING: Could not map: {missing_bio}")
        print("Available BIOPRO columns:", sorted(biopro_df.columns.tolist()))

    bio = biopro_df[["SEQN"] + list(bio_col_map.values())].copy()
    bio.columns = ["seqn"] + list(bio_col_map.keys())

    # CRP
    crp_df = raw["CRP"]
    crp_col = next((c for c in ["LBXHSCRP", "LBDHRCRP"] if c in crp_df.columns), None)
    print(f"CRP column: {crp_col}, available: {sorted(crp_df.columns.tolist())}")
    crp = crp_df[["SEQN", crp_col]].copy() if crp_col else pd.DataFrame(columns=["SEQN"])
    if crp_col:
        crp.columns = ["seqn", "crp_mgl"]

    # CBC
    cbc_df = raw["CBC"]
    cbc_col_map = {}
    for col in ["LBXWBCSI", "LBXWBC"]:
        if col in cbc_df.columns:
            cbc_col_map["wbc_kul"] = col; break
    for col in ["LBXLYPCT", "LBDLYMNO"]:
        if col in cbc_df.columns:
            cbc_col_map["lymphocyte_pct"] = col; break
    for col in ["LBXMCVSI", "LBXMCV"]:
        if col in cbc_df.columns:
            cbc_col_map["mcv_fl"] = col; break
    for col in ["LBXRDW", "LBDRDWSI"]:
        if col in cbc_df.columns:
            cbc_col_map["rdw_pct"] = col; break

    print(f"CBC column mapping: {cbc_col_map}")
    cbc = cbc_df[["SEQN"] + list(cbc_col_map.values())].copy()
    cbc.columns = ["seqn"] + list(cbc_col_map.keys())

    # 4. Merge all datasets on SEQN
    merged = demo.copy()
    for df in [bio, crp, cbc]:
        merged = merged.merge(df, on="seqn", how="left")

    print(f"\nMerged dataset: {len(merged)} rows, {len(merged.columns)} columns")
    print(f"Columns: {list(merged.columns)}")

    # 5. Exclusion criteria
    # - Age 18-89 (NHANES top-codes at 80 for public data, we use ≥18)
    # - Exclude pregnant women (RIDEXPRG == 1)
    # - Exclude rows where all required biomarkers are missing
    required_cols = ["albumin_gdl", "creatinine_mgdl", "glucose_mgdl", "crp_mgl",
                     "lymphocyte_pct", "mcv_fl", "rdw_pct", "alp_ul", "wbc_kul"]
    available_required = [c for c in required_cols if c in merged.columns]

    filtered = merged[
        (merged["age_yr"] >= 18) &
        (merged["age_yr"] < 90) &
        (merged["pregnant"].isna() | (merged["pregnant"] != 1))
    ].copy()

    # Drop rows missing more than 5 of the 9 biomarkers (consistent with confidence logic)
    filtered["n_present"] = filtered[available_required].notna().sum(axis=1)
    filtered = filtered[filtered["n_present"] >= 5].copy()

    print(f"After exclusions: {len(filtered)} participants")
    print(f"Available biomarker columns: {available_required}")

    # 6. Compute PhenoAge for participants with complete data
    complete = filtered.dropna(subset=available_required).copy()
    if len(complete) > 100:
        complete["phenoage"] = compute_phenoage(complete)
        # Sanity check: phenoage should be plausible
        complete = complete[(complete["phenoage"] > 5) & (complete["phenoage"] < 130)]
        print(f"PhenoAge computed for {len(complete)} participants with complete data")
        print(f"  Mean biological age: {complete['phenoage'].mean():.1f}, "
              f"SD: {complete['phenoage'].std():.1f}")
        filtered = filtered.merge(complete[["seqn", "phenoage"]], on="seqn", how="left")
    else:
        print("WARNING: Too few complete cases for PhenoAge computation")
        filtered["phenoage"] = np.nan

    # 7. Build stratified percentile reference
    biomarker_cols = {
        "albumin":       "albumin_gdl",
        "creatinine":    "creatinine_mgdl",
        "glucose":       "glucose_mgdl",
        "crp":           "crp_mgl",
        "lymphocytePct": "lymphocyte_pct",
        "mcv":           "mcv_fl",
        "rdw":           "rdw_pct",
        "alp":           "alp_ul",
        "wbc":           "wbc_kul",
    }
    # Only include biomarker keys where we have data
    biomarker_cols = {k: v for k, v in biomarker_cols.items() if v in filtered.columns}

    strata: dict[str, dict] = {}

    for gender_code, sex_label in [(1, "male"), (2, "female")]:
        sex_df = filtered[filtered["gender"] == gender_code]
        for lo, hi in [(18, 30), (30, 40), (40, 50), (50, 60), (60, 70), (70, 80), (80, 90)]:
            age_df = sex_df[(sex_df["age_yr"] >= lo) & (sex_df["age_yr"] < hi)]
            if len(age_df) < 20:
                continue
            key = f"{sex_label}_{lo}_{hi}"
            strata[key] = {
                "n":         int(len(age_df)),
                "phenoage":  percentile_stats(age_df["phenoage"]) if "phenoage" in age_df.columns else {},
            }
            for bk, col in biomarker_cols.items():
                strata[key][bk] = percentile_stats(age_df[col])

    print(f"\nGenerated {len(strata)} strata: {list(strata.keys())}")

    # 8. Write output
    output = {
        "version":   "NHANES-2017-2018",
        "source":    "https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?BeginYear=2017",
        "citation":  "National Health and Nutrition Examination Survey, 2017-2018. CDC/NCHS.",
        "algorithm": "PhenoAge (Levine et al., Aging (Albany NY), 2018. PMID: 29676998)",
        "strata":    strata,
    }

    OUTPUT_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"\n✓ Written to {OUTPUT_PATH}")
    print(f"  Total strata: {len(strata)}")
    total_participants = sum(v["n"] for v in strata.values())
    print(f"  Total stratified participants: {total_participants}")


if __name__ == "__main__":
    main()
