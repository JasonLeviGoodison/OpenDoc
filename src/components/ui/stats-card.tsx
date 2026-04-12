import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export function StatsCard({ label, value, change, changeType = 'neutral', className }: StatsCardProps) {
  return (
    <div className={cn('py-4', className)}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      {change && (
        <p className={cn(
          'text-xs mt-1.5',
          changeType === 'positive' && 'text-success',
          changeType === 'negative' && 'text-danger',
          changeType === 'neutral' && 'text-muted'
        )}>
          {change}
        </p>
      )}
    </div>
  );
}
