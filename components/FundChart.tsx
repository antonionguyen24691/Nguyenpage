"use client";

import React, { useEffect, useRef } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
} from "lightweight-charts";
import type { CandlePoint, ChartPoint } from "@/lib/fundAnalytics";

type FundChartProps = {
  data: ChartPoint[];
  mode: "area" | "line" | "candles" | "heikin" | "compare";
  comparisonSeries?: Array<{
    code: string;
    color: string;
    data: ChartPoint[];
  }>;
  candles?: CandlePoint[];
  benchmarkSeries?: ChartPoint[];
};

function formatTime(value: string) {
  return value.slice(0, 10);
}

export default function FundChart({
  data,
  mode,
  comparisonSeries = [],
  candles = [],
  benchmarkSeries = [],
}: FundChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }

    const getChartHeight = () => chartContainerRef.current?.clientHeight || 340;
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#5c6b7c",
      },
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight(),
      grid: {
        vertLines: { color: "rgba(135,149,168,0.18)" },
        horzLines: { color: "rgba(135,149,168,0.18)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(31,77,183,0.35)" },
        horzLine: { color: "rgba(31,77,183,0.35)" },
      },
    });

    if (mode === "compare") {
      comparisonSeries.forEach((series) => {
        const line = chart.addSeries(LineSeries, {
          color: series.color,
          lineWidth: 2,
          priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01,
          },
        });
        line.setData(
          series.data.map((item) => ({
            time: formatTime(item.time),
            value: item.value,
          })),
        );
      });
    } else if (mode === "candles" || mode === "heikin") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#0c7a69",
        downColor: "#c73a3a",
        borderVisible: false,
        wickUpColor: "#0c7a69",
        wickDownColor: "#c73a3a",
      });
      series.setData(
        candles.map((item) => ({
          time: formatTime(item.time),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        })),
      );
    } else if (mode === "line") {
      const series = chart.addSeries(LineSeries, {
        color: "#1f4db7",
        lineWidth: 2,
      });
      series.setData(
        data.map((item) => ({
          time: formatTime(item.time),
          value: item.value,
        })),
      );
      if (benchmarkSeries.length > 1) {
        const benchmark = chart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 2,
          lineStyle: 2,
        });
        benchmark.setData(
          benchmarkSeries.map((item) => ({
            time: formatTime(item.time),
            value: item.value,
          })),
        );
      }
    } else {
      const series = chart.addSeries(AreaSeries, {
        lineColor: "#0c7a69",
        topColor: "rgba(12,122,105,0.35)",
        bottomColor: "rgba(12,122,105,0.02)",
        lineWidth: 2,
      });
      series.setData(
        data.map((item) => ({
          time: formatTime(item.time),
          value: item.value,
        })),
      );
      if (benchmarkSeries.length > 1) {
        const benchmark = chart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 2,
          lineStyle: 2,
        });
        benchmark.setData(
          benchmarkSeries.map((item) => ({
            time: formatTime(item.time),
            value: item.value,
          })),
        );
      }
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: getChartHeight(),
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [benchmarkSeries, candles, comparisonSeries, data, mode]);

  return (
    <div
      ref={chartContainerRef}
      className="h-[260px] w-full overflow-hidden rounded-[1.5rem] border border-white/70 bg-[rgba(255,255,255,0.7)] md:h-[340px] xl:h-[360px]"
    />
  );
}
