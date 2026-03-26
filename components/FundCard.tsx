import React from 'react';

type FundCardProps = {
  fundCode: string;
  fundName: string;
  nav: number | null;
  navDate: string | null;
  onClick?: () => void;
  isActive?: boolean;
};

export default function FundCard({ fundCode, fundName, nav, navDate, onClick, isActive }: FundCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`cursor-pointer p-5 rounded-2xl shadow-sm border transition-all duration-200 ${
        isActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-neutral-200 hover:border-primary/50 bg-white'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-neutral-800">{fundCode}</h3>
        {nav && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
            {Number(nav).toLocaleString('vi-VN')} ₫
          </span>
        )}
      </div>
      <p className="text-sm text-neutral-500 line-clamp-2 min-h-[40px]">{fundName}</p>
      {navDate && (
        <p className="text-xs text-neutral-400 mt-3 pt-3 border-t">
          Cập nhật: {new Date(navDate).toLocaleDateString('vi-VN')}
        </p>
      )}
    </div>
  );
}
