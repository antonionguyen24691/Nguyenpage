async function test() {
  try {
    const res = await fetch('https://api.fmarket.vn/res/products/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ types: ["NEW_FUND", "TRADING_FUND"], status: 3, isFundV2: true })
    });
    const data = await res.json();
    if (data && data.data && data.data.rows) {
      console.log(JSON.stringify(data.data.rows.map((f) => ({
        id: f.id, 
        code: f.shortName,
      })).filter((f) => ['DCBC', 'DCDS', 'DCIP', 'DCBF', 'SSISCA', 'SSIBF'].includes(f.code)), null, 2));
    } else {
      console.log('Cant find rows');
    }
  } catch(e) { console.error(e) }
}
test();
