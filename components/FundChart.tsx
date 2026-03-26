"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, ISeriesApi } from 'lightweight-charts';

type ChartData = {
  time: string;
  value: number;
};

type FundChartProps = {
  data: ChartData[];
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
        textColor: '#666',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
    });
    
    chartRef.current = chart;

    // Thêm Area Series
    const newSeries = (chart as any).addAreaSeries({
      lineColor: '#2962FF',
      topColor: '#2962FF',
      bottomColor: 'rgba(41, 98, 255, 0.28)',
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
      // Sắp xếp dữ liệu từ cũ đến mới (yêu cầu của lightweight-charts)
      const sortedData = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      seriesRef.current.setData(sortedData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  return (
    <div className="w-full h-[400px] border rounded-xl overflow-hidden bg-white shadow-sm p-4" ref={chartContainerRef} />
  );
}
