import { HTMLAttributes } from 'react'

export type BadgeColor = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor
  size?: 'sm' | 'md'
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-accent/15 text-accent border-accent/25',
  blue: 'bg-info/15 text-info border-info/25',
  amber: 'bg-warning/15 text-warning border-warning/25',
  red: 'bg-danger/15 text-danger border-danger/25',
  gray: 'bg-white/8 text-muted border-white/12',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
}

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
}

export default function Badge({ color = 'gray', size = 'md', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${colorClasses[color]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
