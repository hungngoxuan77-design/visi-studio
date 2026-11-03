# Visi Studio — Giai đoạn 1: Mobile PWA + Accordion

**Nguồn:** Visi Studio Dynamic 7 Phong Cách. Phần AI/JSON/video hiện tại được giữ nguyên.

## Cập nhật chính
- `<820px`: camera được đưa lên trên toàn bộ các lựa chọn bằng CSS `display:contents` cho `.workspace`; desktop vẫn 2 cột.
- Các bước động đọc JSON và hiển thị thành accordion native `<details>` trên mobile. Có hướng dẫn thao tác thực tế từ `VisiCurriculum.personalize`, sản phẩm đang sở hữu, trạng thái hoàn thành, và nút xem video theo bước.
- Bảng màu son/má nằm trong một menu `<details>` riêng: mặc định thu gọn trên mobile, mở trên desktop.
- Chặn tràn ngang từ các grid/ảnh/video, thu gọn các nút theo màn hình 320–820px.
- PWA: `manifest.webmanifest`, 2 icon PNG, `service-worker.js` chỉ hoạt động trong thư mục `makeup-assistant/`, cache mã nguồn và JSON; không cache trước 105 MP4 để tiết kiệm dung lượng.

## Cập nhật lên GitHub
1. Giải nén ZIP. Dùng GitHub Desktop, mở repository `visi-studio` qua **Show in Explorer**.
2. Chép **thư mục `makeup-assistant`** từ ZIP vào thư mục repo cùng cấp `index.html` của web cũ.
3. Vì đây là cập nhật của ứng dụng con, chỉ thay thế các file trong `makeup-assistant`; không xóa `index.html`, `app.js`, `sw.js` ở gốc website.
4. Commit và Push origin.
5. Truy cập `https://hungngoxuan77-design.github.io/visi-studio/makeup-assistant/` và Ctrl+Shift+R. Nếu PWA còn giữ CSS cũ, đóng tab cũ, mở lại. Có thể gỡ phiên bản PWA cũ rồi cài lại.

## Kiểm tra
- Bật chế độ responsive trong Chrome DevTools ở các độ rộng 320, 375, 390, 768, 1024 và 1440 px.
- Trên 390 px camera nằm sau phần giới thiệu và banner JSON, trước bảng chọn phong cách.
- Thử mở/đóng từng accordion, chọn bài học, chuyển video, đổi màu và mở/đóng bảng màu.
- Camera: chỉ có thể kiểm thử bằng thiết bị người dùng; nút tải ảnh vẫn dùng được khi camera không khả dụng.
- Offline: trình duyệt có thể mở shell và dữ liệu đã cache, nhưng video chưa tải sẽ không chạy offline và mô hình MediaPipe/CLIP từ CDN chưa được đóng gói offline.

## Lưu ý
Chỉ sử dụng các video MP4 cục bộ trong `media/styles/`; không nhúng video YouTube. Lần cài đầu cần HTTPS và internet. Giai đoạn 2 AR nâng cao chưa được triển khai.
