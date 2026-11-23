import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

const alertVariants = cva('relative flex gap-2.5 rounded-lg border p-3 text-xs leading-relaxed', {
  variants: {
    tone: {
      info: 'border-neutral-300 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300 [&>svg]:text-neutral-500',
      success: 'border-green-600/30 text-green-700 dark:border-green-400/30 dark:text-green-300 [&>svg]:text-green-600 dark:[&>svg]:text-green-400',
      warning: 'border-yellow-600/35 text-yellow-800 dark:border-yellow-400/30 dark:text-yellow-200 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-300',
      danger: 'border-red-600/30 text-red-700 dark:border-red-400/30 dark:text-red-300 [&>svg]:text-red-600 dark:[&>svg]:text-red-400',
    },
  },
  defaultVariants: { tone: 'info' },
})

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: ShieldAlert }

function Alert({
  tone = 'info',
  title,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & VariantProps<typeof alertVariants> & { title?: React.ReactNode }) {
  const Icon = icons[tone ?? 'info']
  return (
    <div data-slot="alert" role={tone === 'danger' ? 'alert' : 'status'} className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-montserrat text-xs font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  )
}

export { Alert, alertVariants }
