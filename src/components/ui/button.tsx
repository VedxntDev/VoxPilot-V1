import { Slot, Slottable } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { ArrowUpRight } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * ChaiUI button variants:
 * - `soft` is default: light grey on dark.
 * - `solid` is white one with asymmetric corners (btn-asym). Use at most once per screen. Carries ArrowUpRight.
 * - `outline` mirrors corners (btn-asym-mirror) and sits beside solid.
 * - `danger` red fill ONLY inside destructive confirm dialog.
 * Orange never fills a button.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        soft: 'rounded-md bg-neutral-200 font-semibold text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
        solid: 'btn-asym bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-montserrat font-medium tracking-tight',
        outline:
          'btn-asym-mirror border border-neutral-300 bg-transparent text-foreground hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-white/5 font-montserrat',
        muted:
          'rounded-md bg-[#d4d4d866] font-montserrat text-[#52525b] hover:bg-[#d4d4d8] dark:bg-[#71717a33] dark:text-[#d4d4d8] dark:hover:bg-black/70',
        ghost: 'rounded-md text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800',
        danger: 'rounded-md bg-red-600 font-semibold text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-sm',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'soft',
      size: 'md',
    },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    iconRight?: React.ReactNode
  }

function Button({ className, variant, size, asChild = false, iconRight, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  const icon = iconRight === undefined && variant === 'solid' && size !== 'icon' ? <ArrowUpRight /> : iconRight
  return (
    <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props}>
      <Slottable>{children}</Slottable>
      {icon ? (
        <span aria-hidden="true" className="-ml-1 inline-flex">
          {icon}
        </span>
      ) : null}
    </Comp>
  )
}

export { Button, buttonVariants }
