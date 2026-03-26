import { syncFunds } from '../packages/fund-engine';

async function main() {
  console.log("Bat dau chay crawler...");
  try {
    const result = await syncFunds();
    console.log("Crawl thanh cong!", result);
  } catch (error) {
    console.error("Loi:", error);
  }
  process.exit(0);
}

main();
