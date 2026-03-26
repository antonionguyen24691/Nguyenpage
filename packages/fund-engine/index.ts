import { crawlAllFunds } from './crawler';
import { db } from '../db';

export async function syncFunds() {
  console.log('Starting fund sync at', new Date().toISOString());
  const data = await crawlAllFunds();
  console.log('Total crawled records:', data.length);

  let successCount = 0;

  // Bulk upsert chunks of 500 to avoid payload size errors
  const chunkSize = 500;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize).map(item => ({
      fund_code: item.fund,
      nav: item.nav,
      date: item.date,
      source: item.source
    }));

    const { error } = await db
      .from('fund_nav')
      .upsert(chunk, { onConflict: 'fund_code,date', ignoreDuplicates: false });

    if (error) {
      console.error(`Failed to sync chunk starting at index ${i}:`, error.message);
    } else {
      successCount += chunk.length;
      console.log(`Synced ${chunk.length} entries for chunk ${i / chunkSize + 1}`);
    }
  }

  return {
    totalAttempted: data.length,
    successCount,
    timestamp: new Date().toISOString()
  };
}
