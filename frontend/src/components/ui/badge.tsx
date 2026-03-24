import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border bg-secondary text-secondary-foreground',
        healthy:
          'border-status-healthy/30 bg-status-healthy/10 text-status-healthy',
        error:
          'border-status-error/30 bg-status-error/10 text-status-error',
        warning:
          'border-status-warning/30 bg-status-warning/10 text-status-warning',
        unknown:
          'border-border bg-muted text-muted-foreground',
        accent:
          'border-primary/30 bg-primary/10 text-primary',
        firing:
          'border-status-error/30 bg-status-error/10 text-status-error',
        resolved:
          'border-status-healthy/30 bg-status-healthy/10 text-status-healthy',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'healthy'
      ? 'healthy'
      : status === 'unhealthy'
        ? 'error'
        : status === 'degraded'
          ? 'warning'
          : 'unknown'

  return (
    <Badge variant={variant}>
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'healthy' && 'bg-status-healthy animate-pulse-dot',
          status === 'unhealthy' && 'bg-status-error animate-pulse-dot',
          status === 'degraded' && 'bg-status-warning',
          !['healthy', 'unhealthy', 'degraded'].includes(status) &&
            'bg-status-unknown'
        )}
      />
      {status}
    </Badge>
  )
}

export { Badge, badgeVariants }
