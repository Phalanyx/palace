"use client"

import * as React from "react"
import {
  DropdownMenu as BaseDropdownMenu,
  DropdownMenuContent as BaseDropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface DropdownMenuContentProps extends React.ComponentProps<typeof BaseDropdownMenuContent> {
  glow?: boolean
}

/**
 * Glass UI Dropdown Menu - Enhanced dropdown menu with glassy effects
 */
export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof BaseDropdownMenuContent>,
  DropdownMenuContentProps
>(({ className, glow = false, ...props }, ref) => {
  return (
    <BaseDropdownMenuContent
      ref={ref}
      className={cn(
        "ring-0",
        glow && "shadow-purple-500/30",
        className
      )}
      style={{
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--blur)) saturate(180%)',
        WebkitBackdropFilter: 'blur(var(--blur)) saturate(180%)',
        border: '0.5px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
      {...props}
    />
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

export {
  BaseDropdownMenu as DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}
