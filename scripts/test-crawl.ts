import { crawlVinaCapital, crawlDragonCapital, crawlSSIAM } from '../packages/fund-engine/crawler';

async function testCrawl() {
  console.log("Testing VinaCapital...");
  const vc = await crawlVinaCapital('VESAF');
  console.log("VC Length:", vc.length);
  
  console.log("Testing DragonCapital(Fmarket)...");
  const dc = await crawlDragonCapital('DCDS');
  console.log("DC Length:", dc.length);
}

testCrawl().catch(e => console.error("FATAL", e));
