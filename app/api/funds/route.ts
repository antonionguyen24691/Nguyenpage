import { NextResponse } from 'next/server';
import { db } from '../../../packages/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Lấy danh sách các quỹ
    const { data: funds, error } = await db
      .from('funds')
      .select('*')
      .order('code');

    if (error) {
      throw error;
    }

    // Mảng lưu danh sách quỹ kèm NAV hiện tại
    const results = [];

    // Lấy top 1 NAV mới nhất cho từng quỹ
    for (const fund of funds) {
      const { data: navData, error: navError } = await db
        .from('fund_nav')
        .select('nav, date')
        .eq('fund_code', fund.code)
        .order('date', { ascending: false })
        .limit(1)
        .single();
        
      if (!navError && navData) {
        results.push({
          ...fund,
          nav: navData.nav,
          nav_date: navData.date
        });
      } else {
        results.push({
          ...fund,
          nav: null,
          nav_date: null
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
