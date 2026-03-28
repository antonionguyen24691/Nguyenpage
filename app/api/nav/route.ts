import { NextResponse } from 'next/server';
import { db } from '../../../packages/db';
import { analyzeFund } from '../../../packages/ai/fund-analysis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get('fund');
    const days = parseInt(searchParams.get('days') || '90');

    if (!fundCode) {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã quỹ (fund parameter)' },
        { status: 400 }
      );
    }

    // Lấy lịch sử NAV của quỹ cụ thể trong N ngày (Lấy cái mới nhất lên đầu)
    const { data: navData, error: navError } = await db
      .from('fund_nav')
      .select('*')
      .eq('fund_code', fundCode.toUpperCase())
      .order('date', { ascending: false })
      .limit(days);

    if (navError) {
      throw navError;
    }

    // Lấy danh mục mới nhất làm bối cảnh cho AI phân tích
    const { data: latestDateObj } = await db
      .from('fund_holdings')
      .select('date')
      .eq('fund_code', fundCode.toUpperCase())
      .order('date', { ascending: false })
      .limit(1)
      .single();

    let topHoldings: any[] = [];
    if (latestDateObj?.date) {
      const { data: holdingsData } = await db
        .from('fund_holdings')
        .select('stock_code, weight')
        .eq('fund_code', fundCode.toUpperCase())
        .eq('date', latestDateObj.date)
        .order('weight', { ascending: false })
        .limit(10);
      
      topHoldings = holdingsData || [];
    }

    // Chạy AI phân tích tự động dựa trên mảng data nav & holdings
    const analysis = await analyzeFund({
      fundCode: fundCode.toUpperCase(),
      navHistory: navData || [],
      topHoldings: topHoldings
    });

    return NextResponse.json({
      success: true,
      fund: fundCode.toUpperCase(),
      data: navData,
      ai_insight: analysis
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
