# VISI STUDIO — AI Makeup Coach (2 màn hình)

Web app thực tế bằng HTML, CSS, JavaScript thuần, giao diện tiếng Việt. Không dùng framework/build/npm.

## Những gì chạy được

- **Gương trái**: xin quyền webcam khi người dùng bấm; hình trực tiếp từ camera, hoặc tải ảnh JPG/PNG/WEBP nếu không có camera. Tắt camera dừng media tracks.
- **Thử son/má ảo**: khi MediaPipe Face Landmarker đã tải và nhận diện được khuôn mặt, dựng son/má hồng trên `<canvas>` theo các điểm khuôn mặt. Đổi màu, chỉnh độ đậm 0–100%, trước/sau, Undo/Redo/Reset, xuất PNG.
- **AI ước lượng tông da**: đọc vài điểm màu ở vùng má trên ảnh/camera để gợi ý nhóm sáng/trung bình/ngăm, cập nhật màu son/má cùng lời khuyên trong bước nền, mắt, má và môi. Đây là *ước lượng độ sáng có phụ thuộc ánh sáng*, không phát hiện chính xác undertone, không thay thế thử mỹ phẩm thật. Người dùng có thể chỉnh thủ công.
- **Hướng dẫn bên phải**: trình phát video HTML5, 5 video đồ họa **do dự án tạo** cho các nhóm bước chuẩn bị, nền, mắt, má, môi; cho phép nạp video MP4/WebM riêng và ảnh makeup tham khảo của người dùng. Các clip đồ họa không phải video quay chuyên gia.
- **Lộ trình**: 3 phong cách Việt Nam, Douyin, Âu Mỹ; gói Cơ bản **7 bước** và Nâng cao **14 bước**. Các bước có sản phẩm/dụng cụ/thứ tự/mẹo cụ thể; checklist và lưu tiến độ `localStorage`.
- Thiết kế hai cột desktop, xếp dọc trên điện thoại, nút/bảng màu điều khiển tương tác.

## Giới hạn cần biết

- Bản này là **MVP web tĩnh**, chưa có tài khoản khách hàng, thanh toán, kho dữ liệu tập trung, video chuyên gia thực tế hoặc thư viện mẫu của cộng đồng.
- MediaPipe tải thư viện qua jsDelivr và mô hình từ Google ở lần đầu; **cần Internet và trình duyệt hỗ trợ**. Ảnh/video không được tự tải lên máy chủ; mô hình phân tích trên thiết bị. Khi AI không tải được, camera hoặc ảnh vẫn hiển thị nhưng **không có lớp makeup AI**.
- Son và má là **hiệu ứng Canvas 2D cơ bản**, chưa phải face parsing/phân vùng chi tiết, chưa hỗ trợ chính xác vùng mắt, nền hay hiệu ứng son ombre. Màu mỹ phẩm chỉ mang tính hình dung.
- Máy không có webcam hoặc trả `NotReadableError` có thể dùng nút **Tải ảnh**. Nếu webcam đang bị chiếm dụng, đóng Zalo/Zoom/OBS/Camera, kiểm tra quyền Windows và Chrome.
- Video và ảnh tham khảo do người dùng tải lên chỉ tồn tại trong phiên hiện tại; phải chọn lại sau khi tải lại trang. Chỉ tiến độ học và tùy chọn được lưu trong browser.

## Các file

```
index.html              giao diện
style.css               thiết kế responsive
script.js               lộ trình, camera, MediaPipe, thử màu, video
assets/logo.svg         logo
assets/guide-poster.svg ảnh poster tĩnh
media/prep.mp4          minh họa chuẩn bị
media/base.mp4          minh họa tán nền
media/eye.mp4           minh họa mắt
media/blush.mp4         minh họa má hồng
media/lip.mp4           minh họa son
```

## Cách chạy

**GitHub Pages** (được khuyên dùng vì camera cần HTTPS):

- Nếu muốn giữ nguyên Visi Studio cũ tại trang chủ, đặt toàn bộ các file vào thư mục `coach/` trong repository `hungngoxuan77-design/visi-studio`, sao cho đường dẫn `coach/index.html` và `coach/media/prep.mp4` tồn tại. Khi GitHub Pages đã bật nhánh `main` thư mục gốc, truy cập: `https://hungngoxuan77-design.github.io/visi-studio/coach/`.
- Nếu dùng repository riêng: đặt các file tại thư mục gốc, bật `Settings → Pages → Deploy from branch → main / (root)`. Truy cập đường dẫn Pages do GitHub cung cấp.
- **Không ghi đè** `index.html` của Visi Studio cũ nếu muốn giữ cả hai ứng dụng.

**Chạy cục bộ**: trong thư mục chứa `index.html`, mở Terminal và chạy `python -m http.server 8000`, sau đó mở `http://localhost:8000`. Không nên mở trực tiếp bằng đường dẫn `file://` cho tính năng camera.

## Thử nhanh

1. Chọn gói **Cơ bản**, kiểm tra 7 bước. Chọn **Nâng cao**, kiểm tra 14 bước.
2. Chọn phong cách Việt Nam/Douyin/Âu Mỹ, kiểm tra bảng son/má và video minh họa.
3. Chọn tông da thủ công và mở bước **Tán lớp nền**, **Đánh má hồng**, **Thử son** để kiểm tra gợi ý được thay đổi.
4. Bật camera → cấp quyền; nếu không có webcam, dùng **Tải ảnh**. Khi AI đã tải, nhìn trực diện dưới ánh sáng tốt để nhận diện môi/má.
5. Chỉnh màu/độ đậm → Undo / Redo / Trước-sau → Lưu ảnh PNG.
6. Chọn **Video của bạn**, tải MP4/WebM; chọn **Ảnh makeup mẫu** để đối chiếu.

## Kiểm thử đã thực hiện

- Kiểm tra cú pháp JavaScript bằng Node `--check`.
- Kiểm tra Chrome headless với các tương tác chọn gói Nâng cao 14 bước, chuyển phong cách, chọn tông da, đánh dấu hoàn thành, đổi màu, hoàn tác/làm lại; thử layout desktop và mobile.
- Kiểm tra tải ảnh vào canvas khi không có camera, kích thước canvas được tạo.
- Kiểm tra phát một MP4 gốc trên Chromium (`readyState=4`).
- Chưa kiểm chứng MediaPipe inference hay quyền webcam trên thiết bị thực trong môi trường hiện tại.

**Tính năng nâng cấp cho bản thương mại:** video hướng dẫn thực tế theo từng bài, face parsing chính xác hơn, tối ưu WebGL/GPU, tài khoản/đồng bộ, hệ thống quản trị video, gói hội viên, bảo vệ dữ liệu khách hàng, đo chất lượng theo thiết bị.
