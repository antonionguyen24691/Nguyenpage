async function test() {
  console.log("VC Fetching...");
  try {
    const vcReq = await fetch('https://vinacapital.com/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Origin': 'https://vinacapital.com',
        'Referer': 'https://vinacapital.com/vi/quy-mo/'
      },
      body: new URLSearchParams({
        action: 'getchartfundnav',
        fundname: 'VESAF',
      })
    });
    console.log("VC Status:", vcReq.status);
    const text = await vcReq.text();
    console.log("VC Data:", text.substring(0, 100));
  } catch(e) { console.error(e); }

  console.log("\nFM Fetching...");
  try {
    const fmReq = await fetch('https://api.fmarket.vn/res/product/get-nav-history', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify({ isAllData: 1, productId: 28, searchField: "", sortBy: "", sortOrder: "" })
    });
    console.log("FM Status:", fmReq.status);
    const fmText = await fmReq.text();
    console.log("FM Data:", fmText.substring(0, 100));
  } catch(e) { console.error(e); }
}
test();
