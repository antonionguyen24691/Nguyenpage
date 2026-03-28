import { NextResponse } from 'next/server';
import { db } from '../../../packages/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundCode = searchParams.get('fund');
    const targetDate = searchParams.get('date');

    if (!fundCode) {
      return NextResponse.json({ success: false, error: 'Thiếu mã quỹ (fund)' }, { status: 400 });
    }

    // 1. Lấy tất cả các ngày (dates) đã có trong database của quỹ này để làm tính năng lịch sử
    const { data: allDatesData, error: datesError } = await db
      .from('fund_holdings')
      .select('date')
      .eq('fund_code', fundCode.toUpperCase())
      .order('date', { ascending: false });

    let availableDates: string[] = [];
    if (!datesError && allDatesData) {
      // Distinct dates
      const uniqueDates = Array.from(new Set(allDatesData.map(d => d.date)));
      availableDates = uniqueDates;
    }

    // 2. Định dạng ngày cần truy xuất
    let dateToFetch = targetDate;
    if (!dateToFetch && availableDates.length > 0) {
       dateToFetch = availableDates[0]; // Mặc định lấy tháng mới nhất
    }

    if (!dateToFetch) {
      return NextResponse.json({
        success: true,
        fund: fundCode.toUpperCase(),
        data: [],
        date: null,
        availableDates: []
      });
    }

    // 3. Lấy toàn bộ danh mục của tháng được chọn
    const { data, error } = await db
      .from('fund_holdings')
      .select('*')
      .eq('fund_code', fundCode.toUpperCase())
      .eq('date', dateToFetch)
      .order('weight', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      fund: fundCode.toUpperCase(),
      date: dateToFetch,
      data: data,
      availableDates: availableDates
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
