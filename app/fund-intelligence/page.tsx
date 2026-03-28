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
  const [selectedHoldingsDate, setSelectedHoldingsDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  // Load funds once
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

  // Fetch NAV when fund changes
  useEffect(() => {
    if (selectedFund) {
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
    }
  }, [selectedFund]);

  // Fetch Holdings when fund or selected date changes
  useEffect(() => {
     if (selectedFund) {
        setHoldingsLoading(true);
        const dateQuery = selectedHoldingsDate ? `&date=${selectedHoldingsDate}` : '';
        fetch(`/api/holdings?fund=${selectedFund}${dateQuery}`)
          .then(r => r.json())
          .then(res => {
            if (res.success && res.data) {
              setHoldings(res.data);
              setHoldingsDate(res.date);
              setAvailableDates(res.availableDates || []);
              if (!selectedHoldingsDate && res.date) {
                 setSelectedHoldingsDate(res.date);
              }
            } else {
              setHoldings([]);
              setHoldingsDate(null);
            }
            setHoldingsLoading(false);
          })
          .catch(e => { console.error('Lỗi fetch holdings:', e); setHoldingsLoading(false); });
     }
  }, [selectedFund, selectedHoldingsDate]);

  const handleFundSwitch = (fundCode: string) => {
      setSelectedFund(fundCode);
      setSelectedHoldingsDate(null); // Reset to fetch latest holdings for new fund
  };

  const renderMarkdown = (text: string) => {
    return { __html: text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="text-primary animate-pulse font-medium text-lg">Đang kết nối trung tâm dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-neutral-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Tài sản Quỹ (Fund Intelligence)</h1>
        <p className="text-neutral-500 mt-2">
          Theo dõi dữ liệu Net Asset Value (NAV) và nhận định xu hướng bằng hệ thống AI nội bộ.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 xl:gap-8">
        <div className="xl:col-span-1 space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
          {funds.map(fund => (
            <FundCard
              key={fund.id}
              fundCode={fund.code}
              fundName={fund.name}
              nav={fund.nav}
              navDate={fund.nav_date}
              isActive={selectedFund === fund.code}
              onClick={() => handleFundSwitch(fund.code)}
            />
          ))}
        </div>

        <div className="xl:col-span-3 space-y-6">
          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-white p-1 rounded-xl w-fit shadow-sm border border-neutral-100">
             <button 
               onClick={() => setActiveTab('nav')}
               className={`px-6 py-2 rounded-lg font-medium transition-all text-sm ${
                 activeTab === 'nav' ? 'bg-primary text-white shadow-md' : 'text-neutral-500 hover:text-neutral-900'
               }`}
             >Biểu đồ NAV</button>
             <button 
               onClick={() => setActiveTab('holdings')}
               className={`px-6 py-2 rounded-lg font-medium transition-all text-sm ${
                 activeTab === 'holdings' ? 'bg-primary text-white shadow-md' : 'text-neutral-500 hover:text-neutral-900'
               }`}
             >Danh mục cập nhật</button>
          </div>

          {activeTab === 'nav' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-neutral-800">
                    Biểu đồ NAV - {selectedFund}
                  </h2>
                  {chartLoading && <span className="text-sm text-primary animate-pulse font-medium">Đang tải biểu đồ...</span>}
                </div>
                {!chartLoading && chartData.length > 0 ? (
                  <FundChart data={chartData} />
                ) : (
                  !chartLoading && <div className="h-[400px] flex items-center justify-center text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">Chưa có đủ dữ liệu NAV cho quỹ này.</div>
                )}
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 p-6 rounded-2xl border border-indigo-100/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                <h3 className="text-indigo-900 font-bold mb-3 flex items-center gap-2 text-lg">
                  <span className="text-2xl">🤖</span> Nhận định tự động
                </h3>
                <div className="text-indigo-900/90 leading-relaxed text-sm md:text-base">
                  {chartLoading ? (
                     <div className="animate-pulse flex items-center gap-2">Hệ thống AI đang tổng hợp và phân tích dữ liệu...</div>
                  ) : (
                     <div dangerouslySetInnerHTML={renderMarkdown(insight || 'Chưa có nhận định nào.')} />
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holdings' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-800">
                      Cơ cấu danh mục - {selectedFund}
                    </h2>
                    {holdingsDate && (
                        <p className="text-sm text-neutral-500 mt-1">Báo cáo gần nhất: {new Date(holdingsDate).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })}</p>
                    )}
                  </div>
                  
                  {/* Lọc theo tháng lịch sử */}
                  {availableDates.length > 0 && (
                     <div className="flex items-center gap-3 bg-neutral-50 py-1.5 px-3 rounded-lg border border-neutral-200">
                        <label className="text-sm font-medium text-neutral-600">Tháng:</label>
                        <select 
                          className="bg-transparent text-sm font-semibold outline-none cursor-pointer text-indigo-700"
                          value={selectedHoldingsDate || holdingsDate || ''}
                          onChange={(e) => setSelectedHoldingsDate(e.target.value)}
                        >
                          {availableDates.map(d => (
                             <option key={d} value={d}>
                               {new Date(d).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}
                             </option>
                          ))}
                        </select>
                     </div>
                  )}
                </div>
                
                {holdingsLoading ? (
                    <div className="h-[400px] flex items-center justify-center text-primary animate-pulse font-medium">Đang truy xuất dữ liệu từ trung tâm lưu trữ...</div>
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
