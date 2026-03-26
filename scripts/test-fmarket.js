async function test() {
  const res = await fetch('https://api.fmarket.vn/res/products/filter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ types: ["NEW_FUND", "TRADING_FUND"], status: 3, isFundV2: true })
  });
  const data = await res.json();
  if (data && data.data && data.data.rows) {
    const all = data.data.rows.map((f) => ({ id: f.id, code: f.shortName }));
    const targets = ['VESAF', 'VEOF', 'VLGF', 'VFF', 'VIBF', 'DCBC', 'DCDS', 'DCIP', 'DCBF', 'SSIBF', 'SSISCA'];
    console.log(JSON.stringify(all.filter((f) => targets.includes(f.code)), null, 2));
  }
}
test();
