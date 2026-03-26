const axios = require('axios');

async function test() {
  console.log("VC Fetching...");
  try {
    const vcReq = await axios.post('https://vinacapital.com/wp-admin/admin-ajax.php', 
      'action=getchartfundnav&fundname=VESAF',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );
    console.log("VC Status:", vcReq.status);
    console.log("VC Array Length:", Array.isArray(vcReq.data) ? vcReq.data.length : "Not Array");
  } catch(e) { console.error("VC Error", e.response?.status); }

  console.log("\nFM Fetching...");
  try {
    const fmReq = await axios.post('https://api.fmarket.vn/res/product/get-nav-history', 
      { isAllData: 1, productId: 28 },
      {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      }
    );
    console.log("FM Status:", fmReq.status);
    console.log("FM Array Length:", Array.isArray(fmReq.data?.data) ? fmReq.data.data.length : "Not Array");
  } catch(e) { console.error("FM Error", e.response?.status, e.response?.data); }
}
test();
