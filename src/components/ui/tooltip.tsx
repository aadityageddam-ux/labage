'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export const TooltipProvider  = TooltipPrimitive.Provider
export const Tooltip          = TooltipPrimitive.Root
export const TooltipTrigger   = TooltipPrimitive.Trigger
export const TooltipPortal    = TooltipPrimitive.Portal

export function TooltipContent({
  children,
  side = 'top',
  ...props
}: TooltipPrimitive.TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={6}
        className="z-50 max-w-[260px] rounded-md bg-[#18181B] px-3 py-2 text-xs leading-relaxed text-white shadow-lg animate-in fade-in-0 zoom-in-95"
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-[#18181B]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}
