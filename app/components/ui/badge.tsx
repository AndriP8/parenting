import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 backdrop-blur-sm',
        secondary:
          'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 backdrop-blur-sm',
        destructive:
          'border-rose-500/30 bg-rose-500/10 text-rose-400 backdrop-blur-sm',
        warning:
          'border-amber-500/30 bg-amber-500/10 text-amber-400 backdrop-blur-sm',
        outline: 'border-white/20 text-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
