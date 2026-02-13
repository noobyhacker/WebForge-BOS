import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  sparklineData?: number[];
  variant?: 'default' | 'primary' | 'warning' | 'success' | 'destructive';
  className?: string;
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/5',
  warning: 'bg-warning/5',
  success: 'bg-success/5',
  destructive: 'bg-destructive/5',
};

const iconVariantStyles = {
  default: 'bg-secondary text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
};

const sparklineColors = {
  default: 'hsl(var(--muted-foreground))',
  primary: 'hsl(var(--primary))',
  warning: 'hsl(var(--warning))',
  success: 'hsl(var(--success))',
  destructive: 'hsl(var(--destructive))',
};

export function StatCard({ title, value, icon: Icon, trend, sparklineData, variant = 'default', className }: StatCardProps) {
  const chartData = sparklineData?.map((v, i) => ({ value: v, index: i }));
  const color = sparklineColors[variant];

  return (
    <div
      className={cn(
        'rounded-lg border p-5 transition-all hover:shadow-sm relative overflow-hidden',
        variantStyles[variant],
        className
      )}
    >
      {/* Sparkline wave background */}
      {chartData && chartData.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`wave-${variant}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#wave-${variant})`}
                isAnimationActive={true}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5', iconVariantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
