import { cn } from '@/lib/utils';
import { LeadStatus, LEAD_STATUS_CONFIG } from '@/types';

interface BadgeProps {
  status: LeadStatus;
  className?: string;
}

export default function Badge({ status, className }: BadgeProps) {
  const config = LEAD_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
