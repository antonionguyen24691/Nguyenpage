import { NextResponse } from 'next/server';
import { db } from '../../../packages/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get('fund');

    if (!fundCode) {
      return NextResponse.json({ success: false, error: 'Thiếu mã quỹ (fund)' }, { status: 400 });
    }

    // Tự động tìm tháng báo cáo mới nhất của quỹ này
    const { data: latestEntry, error: latestError } = await db
      .from('fund_holdings')
      .select('date')
      .eq('fund_code', fundCode.toUpperCase())
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latestEntry) {
      return NextResponse.json({
        success: true,
        fund: fundCode.toUpperCase(),
        data: [],
        date: null
      });
    }

    // Lấy toàn bộ danh mục của tháng mới nhất đó
    const { data, error } = await db
      .from('fund_holdings')
      .select('*')
      .eq('fund_code', fundCode.toUpperCase())
      .eq('date', latestEntry.date)
      .order('weight', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      fund: fundCode.toUpperCase(),
      date: latestEntry.date,
      data: data
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
