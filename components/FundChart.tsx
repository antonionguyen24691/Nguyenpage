"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, ISeriesApi, AreaSeries } from 'lightweight-charts';

type ChartData = {
  time: string;
  value: number;
};

type FundChartProps = {
  data: ChartData[];
};

// Helper function to convert 'YYYY-MM-DD' or ISO string to standard YYYY-MM-DD that lightweight-charts understands
const formatTime = (timeStr: string) => {
  return timeStr.substring(0, 10);
};

export default function FundChart({ data }: FundChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Khởi tạo chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280', // neutral-500
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: '#f3f4f6', style: 1 }, // dashed
        horzLines: { color: '#f3f4f6', style: 1 }, // dashed
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: true,
        alignLabels: true,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      crosshair: {
        vertLine: {
          color: '#9ca3af',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: '#9ca3af',
          width: 1,
          style: 3,
        },
      },
    });
    
    chartRef.current = chart;

    // Tính toán baseValue là mức thấp nhất để phần xanh (Area) không kéo dài tận mốc 0
    // Ta set autoScale: true, và bottomColor trong suốt dần
    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: '#4f46e5', // Indigo-600
      topColor: 'rgba(79, 70, 229, 0.4)',
      bottomColor: 'rgba(79, 70, 229, 0.0)',
      lineWidth: 2,
    });
    seriesRef.current = newSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Cập nhật dữ liệu mỗi khi props.data thay đổi
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      // Sắp xếp dữ liệu từ cũ đến mới và format ngày
      const formattedData = [...data]
        .map(item => ({
          time: formatTime(item.time),
          value: item.value
        }))
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      // Loại bỏ các phần tử bị lặp timestamp (nếu có)
      const uniqueData = formattedData.filter((item, index, self) => 
        index === 0 || item.time !== self[index - 1].time
      );

      // Lightweight charts requires time property to be strictly ordered and unique
      seriesRef.current.setData(uniqueData as any);
      
      // Cho chart tự động fit khung nhìn
      setTimeout(() => {
         chartRef.current?.timeScale().fitContent();
      }, 50);
    }
  }, [data]);

  return (
    <div className="w-full h-[400px] border border-neutral-100 rounded-xl overflow-hidden bg-white shadow-sm p-4 relative" ref={chartContainerRef} />
  );
}
