import urllib.request
import json

url = "https://api.fmarket.vn/res/product/get-nav-history"
data = {"isAllData": 1, "productId": 28, "searchField": "", "sortBy": "", "sortOrder": ""}
payload = json.dumps(data).encode('utf-8')

req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        result = response.read().decode('utf-8')
        print("FM Status:", response.status)
        print("FM Data:", result[:100])
except urllib.error.HTTPError as e:
    print("FM HTTPError:", e.code)
    print("FM Error Data:", e.read().decode('utf-8')[:100])
except Exception as e:
    print("FM Generic Error:", str(e))
