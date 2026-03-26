async function test() {
  const payloads = [
    { isAllData: 1, productId: 28, searchField: "", sortBy: "", sortOrder: "" },
    { isAllData: 1, productId: "28" },
    { productId: 28, isAllData: true },
    { productId: 28, fromDate: "20230101", toDate: "20240101" }
  ];
  
  for (let p of payloads) {
    console.log("Testing:", p);
    try {
      const res = await fetch('https://api.fmarket.vn/res/product/get-nav-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      const data = await res.json();
      if (data && data.status === 200) {
        console.log("SUCCESS!", Object.keys(data.data));
        if(Array.isArray(data.data)) console.log(data.data[0]);
        break;
      } else {
         console.log(data.status, data.message);
      }
    } catch(e) { console.error(e) }
  }
}
test();
