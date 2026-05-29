import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DeviceChartProps {
  data: { name: string; value: number }[];
  height?: number;
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DeviceChart({ data, height = 300 }: DeviceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-secondary-400 text-sm">No device data</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          isAnimationActive={true}
          animationDuration={800}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            background: 'rgba(255,255,255,0.95)',
          }}
          formatter={(value: number, name: string) => [value, name]}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value: string) => (
            <span className="text-xs text-secondary-600 dark:text-secondary-400">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
