"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

type Holding = {
  stock_code: string;
  weight: number;
};

// Chỉnh lại bộ màu tươi và chuyên nghiệp hơn
const COLORS = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#9ca3af'
];

export default function FundHoldingsPie({ data }: { data: Holding[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
        Chưa có dữ liệu danh mục cho quỹ này trong tháng hiện tại.
      </div>
    );
  }

  // Lấy top 10 cho biểu đồ, phần còn lại gom vào "Khác"
  const topData = data.slice(0, 10).map(item => ({...item, weight: Number(item.weight)}));
  const othersWeight = data.slice(10).reduce((sum, item) => sum + Number(item.weight), 0);
  
  if (othersWeight > 0) {
      topData.push({ stock_code: 'Khác', weight: othersWeight });
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between w-full border border-neutral-100 rounded-xl bg-white shadow-sm p-6 gap-8">
      {/* Cột 1: Biểu đồ Donut */}
      <div className="w-full md:w-1/2 h-[300px] relative flex justify-center items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={topData}
              dataKey="weight"
              nameKey="stock_code"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              stroke="none"
            >
              {topData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Tỷ trọng']} 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Chữ ở giữa Donut */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm text-neutral-400">Tổng tài sản</span>
          <span className="text-lg font-bold text-neutral-800">100%</span>
        </div>
      </div>

      {/* Cột 2: Danh sách Top list */}
      <div className="w-full md:w-1/2 flex flex-col space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        <h4 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 sticky top-0 bg-white z-10 py-1">Chi tiết danh mục</h4>
        <div className="space-y-2">
          {topData.map((item, index) => (
            <div key={index} className="flex items-center justify-between group p-2 hover:bg-neutral-50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <span 
                  className="w-3 h-3 rounded-full shadow-sm" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></span>
                <span className="font-medium text-neutral-700">{item.stock_code}</span>
              </div>
              <span className="text-neutral-600 font-semibold">{item.weight.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
