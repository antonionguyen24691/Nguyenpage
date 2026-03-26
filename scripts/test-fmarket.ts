async function test() {
  try {
    const res = await fetch('https://api.fmarket.vn/res/products/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFundV2: true })
    });
    const data = await res.json();
    if (data && data.data && data.data.rows) {
      console.log(JSON.stringify(data.data.rows.map((f: any) => ({
        id: f.id, 
        code: f.shortName,
        name: f.name
      })).filter((f: any) => ['DCBC', 'DCDS', 'DCIP', 'DCBF', 'SSISCA', 'SSIBF'].includes(f.code)), null, 2));
    } else {
      console.log('Cant find rows:', Object.keys(data));
    }
  } catch(e) { console.error(e) }
}
test();
