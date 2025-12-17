'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { VisualizationData } from '@bank-app/shared';

interface SpendingChartProps {
  data: VisualizationData;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SpendingChart({ data }: SpendingChartProps) {
  if (data.type !== 'pie') {
    return null;
  }

  const chartData = data.data.map((item) => ({
    name: item.label,
    value: item.value,
    percentage: item.metadata?.percentage || 0,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            ${payload[0].value.toFixed(2)} ({payload[0].payload.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 my-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{data.title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
