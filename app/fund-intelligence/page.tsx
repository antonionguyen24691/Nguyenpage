"use client";

import React, { useEffect, useState } from 'react';
import FundCard from '../../components/FundCard';
import FundChart from '../../components/FundChart';
import FundHoldingsPie from '../../components/FundHoldingsPie';

type Fund = {
  id: number;
  code: string;
  name: string;
  company: string;
  nav: number | null;
  nav_date: string | null;
};

type Holding = {
  stock_code: string;
  weight: number;
  date: string;
};

export default function FundIntelligenceDashboard() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'nav' | 'holdings'>('nav');

  // State for NAV Chart
  const [chartData, setChartData] = useState<any[]>([]);
  const [insight, setInsight] = useState<string>('');
  const [chartLoading, setChartLoading] = useState(false);

  // State for Holdings
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [holdingsDate, setHoldingsDate] = useState<string | null>(null);
  const [holdingsLoading, setHoldingsLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/funds')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setFunds(res.data);
          if (res.data.length > 0) {
            setSelectedFund(res.data[0].code);
          }
        }
        setLoading(false);
      })
      .catch(e => {
        console.error('Lỗi khi fetch funds:', e);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedFund) {
      // Lấy data NAV
      setChartLoading(true);
      fetch(`/api/nav?fund=${selectedFund}&days=90`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            const mapped = res.data.map((d: any) => ({ time: d.date, value: Number(d.nav) }));
            setChartData(mapped);
            setInsight(res.ai_insight || '');
          } else {
             setChartData([]);
             setInsight('');
          }
          setChartLoading(false);
        })
        .catch(e => { console.error('Lỗi fetch NAV:', e); setChartLoading(false); });

      // Lấy data Holdings
      setHoldingsLoading(true);
      fetch(`/api/holdings?fund=${selectedFund}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            setHoldings(res.data);
            setHoldingsDate(res.date);
          } else {
            setHoldings([]);
            setHoldingsDate(null);
          }
          setHoldingsLoading(false);
        })
        .catch(e => { console.error('Lỗi fetch holdings:', e); setHoldingsLoading(false); });
    }
  }, [selectedFund]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Đang tải dữ liệu quỹ...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-neutral-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Tài sản Quỹ (Fund Intelligence)</h1>
        <p className="text-neutral-500 mt-2">
          Theo dõi dữ liệu Net Asset Value (NAV) và nhận định xu hướng bằng hệ thống AI nội bộ.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {funds.map(fund => (
            <FundCard
              key={fund.id}
              fundCode={fund.code}
              fundName={fund.name}
              nav={fund.nav}
              navDate={fund.nav_date}
              isActive={selectedFund === fund.code}
              onClick={() => setSelectedFund(fund.code)}
            />
          ))}
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-neutral-200/50 p-1 rounded-xl w-fit">
             <button 
               onClick={() => setActiveTab('nav')}
               className={`px-6 py-2 rounded-lg font-medium transition-all text-sm ${
                 activeTab === 'nav' ? 'bg-white text-primary shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
               }`}
             >Biểu đồ NAV</button>
             <button 
               onClick={() => setActiveTab('holdings')}
               className={`px-6 py-2 rounded-lg font-medium transition-all text-sm ${
                 activeTab === 'holdings' ? 'bg-white text-primary shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
               }`}
             >Chi tiết danh mục (Holdings)</button>
          </div>

          {activeTab === 'nav' && (
            <>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-neutral-800">
                    Biểu đồ NAV - {selectedFund}
                  </h2>
                  {chartLoading && <span className="text-sm text-primary animate-pulse">Đang tải biểu đồ...</span>}
                </div>
                {!chartLoading && chartData.length > 0 ? (
                  <FundChart data={chartData} />
                ) : (
                  !chartLoading && <div className="h-[400px] flex items-center justify-center text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">Chưa có đủ dữ liệu NAV cho quỹ này.</div>
                )}
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100/50">
                <h3 className="text-indigo-900 font-bold mb-2 flex items-center gap-2">
                  <span className="text-xl">🤖</span> Nhận định tự động
                </h3>
                <p className="text-indigo-800 leading-relaxed">
                  {chartLoading ? 'Đang trích xuất dữ liệu...' : (insight || 'Chưa có nhận định nào.')}
                </p>
              </div>
            </>
          )}

          {activeTab === 'holdings' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-neutral-800">
                    Top 10 Cổ phiếu nắm giữ - {selectedFund}
                  </h2>
                  {holdingsDate && (
                      <p className="text-sm text-neutral-500 mt-1">Báo cáo gần nhất: {new Date(holdingsDate).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })}</p>
                  )}
                </div>
                
                {holdingsLoading ? (
                    <div className="h-[400px] flex items-center justify-center text-primary animate-pulse">Đang truy xuất dữ liệu từ báo cáo PDF...</div>
                ) : (
                    <FundHoldingsPie data={holdings} />
                )}
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
