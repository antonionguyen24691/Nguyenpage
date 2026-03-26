import { NextResponse } from 'next/server';
import { db } from '../../../packages/db';
import { analyzeFund } from '../../../packages/ai/fund-analysis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get('fund');
    const days = parseInt(searchParams.get('days') || '30');

    if (!fundCode) {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã quỹ (fund parameter)' },
        { status: 400 }
      );
    }

    // Lấy lịch sử NAV của quỹ cụ thể trong N ngày (Lấy cái mới nhất lên đầu)
    const { data, error } = await db
      .from('fund_nav')
      .select('*')
      .eq('fund_code', fundCode.toUpperCase())
      .order('date', { ascending: false })
      .limit(days);

    if (error) {
      throw error;
    }

    // Chạy AI phân tích tự động dựa trên mảng data
    const analysis = await analyzeFund(data);

    return NextResponse.json({
      success: true,
      fund: fundCode.toUpperCase(),
      data: data,
      ai_insight: analysis
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
