import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-amber-900/15 bg-white/70 shadow-none backdrop-blur-sm transition-colors duration-200 dark:border-orange-50/15 dark:bg-black/10 dark:hover:border-orange-50/30 text-card-foreground',
        className,
      )}
      {...props}
    />
  )
}

function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-body" className={cn('flex min-w-0 flex-1 flex-col gap-1.5 p-3.5', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      className={cn('font-montserrat text-sm leading-snug font-semibold text-neutral-900 dark:text-neutral-50', className)}
      {...props}
    />
  )
}

function CardText({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-text"
      className={cn('text-xs leading-relaxed text-neutral-600 dark:text-neutral-400', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('mt-auto flex items-center justify-between gap-2 pt-2.5', className)} {...props} />
}

export { Card, CardBody, CardFooter, CardText, CardTitle }
