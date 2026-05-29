import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface ClicksChartProps {
  data: { date: string; clicks: number }[];
  height?: number;
  color?: string;
  showAnimation?: boolean;
}

export default function ClicksChart({ data, height = 300, color = '#6366f1', showAnimation = true }: ClicksChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: format(parseISO(d.date), 'MMM d'),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="formattedDate"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            background: 'rgba(255,255,255,0.95)',
          }}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          formatter={(value: number) => [value, 'Clicks']}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${color})`}
          isAnimationActive={showAnimation}
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
