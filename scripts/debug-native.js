async function test() {
  console.log("VC Fetching...");
  try {
    const vcReq = await fetch('https://vinacapital.com/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ action: 'getchartfundnav', fundname: 'VESAF' })
    });
    console.log("VC Status:", vcReq.status);
  } catch(e) { console.error(e); }

  console.log("\nFM Fetching...");
  try {
    const fmReq = await fetch('https://api.fmarket.vn/res/product/get-nav-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAllData: 1, productId: 28, searchField: "", sortBy: "", sortOrder: "" })
    });
    console.log("FM Status:", fmReq.status);
    const text = await fmReq.text();
    console.log("FM output:", text.substring(0, 100));
  } catch(e) { console.error(e); }
}
test();
