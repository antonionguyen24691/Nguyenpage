"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Holding = {
  stock_code: string;
  weight: number;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff6b6b', '#6b8e23', '#20b2aa', '#ffb6c1', '#87cefa'];

export default function FundHoldingsPie({ data }: { data: Holding[] }) {
  if (!data || data.length === 0) {
    return <div className="h-[400px] flex items-center justify-center text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">Chưa có dữ liệu danh mục cho quỹ này trong tháng hiện tại.</div>;
  }

  // Lấy top 10 cho biểu đồ, phần còn lại gom vào "Khác"
  const topData = data.slice(0, 10);
  const othersWeight = data.slice(10).reduce((sum, item) => sum + Number(item.weight), 0);
  if (othersWeight > 0) {
      topData.push({ stock_code: 'Khác', weight: othersWeight });
  }

  return (
    <div className="h-[400px] w-full border rounded-xl bg-white shadow-sm p-4 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={topData}
            dataKey="weight"
            nameKey="stock_code"
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={2}
            label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(1) : 0}%`}
          >
            {topData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Tỷ trọng']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
