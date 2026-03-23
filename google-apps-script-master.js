/**
 * MASTER SCRIPT - GOOGLE APPS SCRIPT CHO BANKER SYSTEM 
 * Dùng để nhận dữ liệu Form Đăng Ký và Request Khách hàng từ Website.
 *
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở một file Google Sheet mới của bạn.
 * 2. Trên thanh menu, chọn Tện ích mở rộng (Extensions) > Apps Script.
 * 3. Xóa toàn bộ code cũ và DÁN đoạn code bên dưới vào.
 * 4. Bấm Lưu (biểu tượng đĩa mềm 💾).
 * 5. Bấm Triển khai (Deploy) > Triển khai mới (New deployment).
 *    - Chọn loại: Ứng dụng Web (Web app).
 *    - Ai có quyền truy cập: "Bất kỳ ai" (Anyone).
 * 6. Bấm Triển khai (Deploy), cấp quyền truy cập. Sau đó Copy dải Webhook URL.
 * 7. Vào trang Cài đặt & Tích hợp trong Admin Nguyen Page dán URL đó vào ô Tích hợp CRM!
 */

function doPost(e) {
  try {
    // Kết nối đến Sheet đang mở (Sheet1 mặc định)
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getActiveSheet();
    
    // Đọc headers (dòng 1) để biết đang có những cột nào. Nếu chưa có header thì tự tạo.
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
    if (!headers || headers[0] === "") {
      headers = ["Thời gian", "Họ Tên", "Số điện thoại", "Email", "Dịch vụ quan tâm", "CCCD / Ghi chú", "Toàn bộ Data thô"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }

    // Đọc Data bắn về từ Web
    var data = {};
    if (e.postData && e.postData.contents) {
      // Request dạng JSON từ Next.js Client / API
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      // Dạng Form Data truyền thống
      data = e.parameter;
    }

    // Map các trường dữ liệu phổ biến thường có trong Form
    var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    var name = data.name || data.hoTen || data.fullName || "Khách ẩn danh";
    var phone = data.phone || data.soDienThoai || "";
    var email = data.email || "";
    var service = data.service || data.dichVu || data.type || "Chưa xác định";
    var cccd = data.cccd || data.notes || data.message || "";
    var rawDataDump = JSON.stringify(data); // Lưu back-up dạng text để ko bị rớt trường nào

    // Chèn dữ liệu mới vào một dòng mới dưới cùng
    var newRow = [timestamp, name, phone, email, service, cccd, rawDataDump];
    sheet.appendRow(newRow);

    // Trả về JSON Báo Thành công cho Web (Để Web hiện dấu tick "Đăng ký Thành công")
    var response = {
      status: "success",
      message: "Dữ liệu đã được lưu trữ thành công vào Google Sheet CRM.",
      rowInjected: newRow
    };

    return ContentService.createTextOutput(JSON.stringify(response))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    // Trong trường hợp có lỗi, trả về Error Log để Debug Website
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString(),
      e: e 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Bắt Options để xử lý CORS cho các Request từ Lading Page
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
}
