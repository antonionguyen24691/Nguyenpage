import { crawlAllFunds } from './crawler';
import { db } from '../db';

export async function syncFunds() {
  console.log('Starting fund sync at', new Date().toISOString());
  const data = await crawlAllFunds();

  let successCount = 0;

  for (const item of data) {
    // Dùng Supabase client insert, upsert nếu bị trùng ngày
    const { error } = await db
      .from('fund_nav')
      .upsert(
        {
          fund_code: item.fund,
          nav: item.nav,
          date: item.date,
          source: item.source
        },
        { onConflict: 'fund_code,date', ignoreDuplicates: false }
      );

    if (error) {
      console.error(`Failed to sync ${item.fund}:`, error.message);
    } else {
      successCount++;
      console.log(`Synced ${item.fund} on ${item.date} with NAV = ${item.nav}`);
    }
  }

  return {
    totalAttempted: data.length,
    successCount,
    timestamp: new Date().toISOString()
  };
}
