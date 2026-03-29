import { fundCatalog } from "@/lib/fundCatalog";
import { persistFundData } from "@/lib/fundDataStore";
import { crawlAllFunds } from "./crawler";

export async function syncFunds() {
  console.log("Starting fund sync at", new Date().toISOString());
  const data = await crawlAllFunds();
  console.log("Total crawled records:", data.length);

  const persistence = await persistFundData({
    funds: fundCatalog.map((entry) => ({
      code: entry.code,
      name: entry.name,
      company: entry.company,
      category: entry.category,
    })),
    nav: data.map((item) => ({
      fund_code: item.fund,
      nav: item.nav,
      date: item.date,
      source: item.source,
    })),
  });

  return {
    totalAttempted: data.length,
    successCount: data.length,
    timestamp: new Date().toISOString(),
    persistence,
  };
}
