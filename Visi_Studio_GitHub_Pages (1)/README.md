# VISI STUDIO — WEB APP THỰC TẾ

Ứng dụng web làm đẹp dành cho người dùng Việt Nam, tối ưu điện thoại. Không phải một bản thiết kế tĩnh: các form, checklist, lịch, ảnh, bộ lọc, bộ sưu tập và lưu dữ liệu đều có mã hoạt động.

## Những gì ĐÃ CÓ

- **Tổng quan**: các công cụ chính, gợi ý makeup theo lựa chọn đã lưu, lịch sắp tới.
- **Makeup Planner**: 5/10/20/35 phút; tùy loại da, tông da, hoàn cảnh, kinh nghiệm; checklist từng bước, tiến độ, lưu/mở lại quy trình, in/PDF qua trình duyệt.
- **Photo Beauty Studio**: tải ảnh JPG/PNG/WEBP (<=16 MB), giảm kích thước về tối đa 1800px, 6 preset, 5 thanh tinh chỉnh, so sánh trước/sau, cọ son/má thủ công, tẩy, hoàn tác, lưu ảnh PNG.
- **AI thử makeup (tùy chọn)**: dùng MediaPipe Face Landmarker để tìm điểm khuôn mặt và phủ thử màu son/má hồng. Tải mô hình AI từ CDN + Google ở lần sử dụng đầu, cần có Internet. Ảnh được xử lý cục bộ; kết quả là lớp màu thử nghiệm, không phải photorealistic generative AI. Không thể bảo đảm nhận diện mọi góc mặt.
- **Chăm sóc da**: gợi ý buổi sáng/tối theo loại da, checklist hàng ngày.
- **Lịch làm đẹp**: thêm lịch, hoàn tất/mở lại/xóa. Đây là lịch trên web; chưa gửi notification ngoài trình duyệt.
- **Bộ sưu tập**: lưu/xem/tải/xóa ảnh bằng IndexedDB ngay trong trình duyệt; quản lý quy trình makeup đã lưu.
- **Cài đặt**: xuất/nhập hồ sơ và lịch dạng JSON; xóa dữ liệu. Ảnh cần tải riêng, không chứa trong bản sao JSON.
- **PWA**: có manifest, service worker; có thể thêm vào màn hình chính, truy cập phần giao diện ngoại tuyến sau lượt tải ban đầu. AI lần đầu vẫn cần mạng.

## Phần CHƯA CÓ (CẦN TRƯỚC KHI BÁN ĐẠI TRÀ)

- Tài khoản người dùng, đăng nhập, đồng bộ giữa nhiều thiết bị.
- Backend lưu ảnh đám mây, quyền xóa dữ liệu và chính sách lưu trữ hình ảnh trên máy chủ.
- Thanh toán, gói thành viên, phân quyền Premium, ví credit, hóa đơn, quản trị viên.
- AI tạo ảnh mới từ prompt, đổi background, kiểu tóc, trang phục, xóa vật thể và makeup chân thực cao cấp qua mô hình tạo sinh.
- Giới hạn tần suất, chống abuse, hàng đợi xử lý, báo cáo doanh thu, monitoring.
- Pháp lý/điều khoản, quy trình xử lý ảnh và sự đồng ý của người dùng trước khi bán.

## CHẠY NGAY TRÊN MÁY TÍNH

1. Giải nén ZIP.
2. Trong thư mục có `index.html`, nhấp đúp để mở bằng Chrome/Edge. Một số browser giới hạn IndexedDB/AI nếu mở bằng `file://`.
3. Cách chắc chắn: mở PowerShell trong thư mục, chạy `python -m http.server 3000` (máy có Python), vào `http://localhost:3000`.
4. Chọn **Makeup Planner**, đổi lựa chọn và lưu một quy trình; vào **Photo Studio**, chọn ảnh để thử.

## ĐƯA LÊN GITHUB PAGES (KHÔNG CẦN VERCEL)

1. Trên GitHub tạo repository tên `visi-studio`. Nếu dùng GitHub Free, chọn **Public** để có GitHub Pages. Tích **Add a README file** để khởi tạo nhánh `main`. Lưu ý mã nguồn trong repository Public ai cũng có thể xem.
2. Đưa **các file ở ngay thư mục gốc**, đặc biệt là `index.html`, lên nhánh `main` (không upload nguyên file ZIP). File `.nojekyll` có thể hiển thị nếu bật tùy chọn hiện file ẩn.
3. Trong repository vào **Settings → Pages → Build and deployment → Source: Deploy from a branch**, chọn `main` và `/(root)` rồi nhấn Save.
4. Trang web sẽ có dạng `https://TEN-TAI-KHOAN.github.io/visi-studio/`. Đường dẫn thực tế chỉ hoạt động sau khi GitHub Pages xây dựng/publish thành công.
5. Vì web app không có backend, dữ liệu hồ sơ và thư viện ảnh lưu riêng trên từng thiết bị. Phần AI MediaPipe cần kết nối mạng khi tải model, không có AI tạo sinh từ prompt.

Ứng dụng đã dùng tài nguyên **tương đối** (`./`) để chạy đúng trên `/<repo-name>/`, bao gồm PWA service worker và manifest.

## NHÚNG VÀO WEBSITE CÓ SẴN

Thay `https://TEN-TAI-KHOAN.github.io/visi-studio/` bằng địa chỉ sau khi triển khai:

```html
<iframe
  src="https://TEN-TAI-KHOAN.github.io/visi-studio/"
  title="Visi Studio"
  loading="lazy"
  style="width:100%;height:900px;border:0;border-radius:16px"
  allow="clipboard-write"
></iframe>
```

Nếu muốn hoàn toàn đồng nhất URL/thương hiệu, đặt app tại subdomain riêng (`beauty.tenmien.vn`) hoặc cấu hình reverse proxy dưới `/beauty` trên website chính. **Nhúng iframe không giúp giấu mã frontend và không bảo vệ khóa API.** Khóa backend phải ở server.

## HƯỚNG TRIỂN KHAI CHO 10.000+ NGƯỜI DÙNG

1. Thêm auth + database (Supabase Auth/Postgres, RLS theo user ID) và blob storage có signed URL; chọn vùng đặt dữ liệu phù hợp.
2. Dùng payment provider phù hợp Việt Nam; server webhook xác minh thanh toán và quản lý quyền gói; không tin thông tin giá/credit từ frontend.
3. Bố trí AI tạo sinh bằng server endpoint, hàng đợi công việc và giới hạn theo tài khoản, ngân sách, kích thước ảnh. Không đặt secret trên client.
4. Thêm giám sát lỗi, chống spam, rate limit, thử tải, chính sách xóa dữ liệu, backup và khôi phục.
5. Kiểm thử trên Android, iOS Safari và Chrome với ảnh thật + các góc mặt khác nhau trước khi bán.

## CẤU TRÚC

- `index.html`: giao diện khung và thanh điều hướng
- `styles.css`: toàn bộ giao diện responsive
- `app.js`: tính năng chính, lưu trữ, chỉnh ảnh, AI Face Landmark
- `manifest.webmanifest`, `sw.js`, `icon.svg`: PWA
- `.nojekyll`: bỏ qua Jekyll khi dùng GitHub Pages

## QUYỀN RIÊNG TƯ AI

Khi dùng AI Face Landmarker, trình duyệt tải thư viện và model từ bên thứ ba. Thuật toán xử lý **ảnh đầu vào trên thiết bị**, nhưng theo tài liệu nhà cung cấp, phiên bản MediaPipe hiện đại có thể gửi thống kê hiệu năng/sử dụng (không bao gồm dữ liệu ảnh) đến Google. App hiển thị thông báo đồng ý trước khi dùng. Hãy tự rà soát nghĩa vụ thông báo/đồng ý nếu triển khai thương mại.

## LICENSE & SỞ HỮU

Mã giao diện và logic của demo do ChatGPT tạo cho dự án của người dùng. MediaPipe/model thuộc giấy phép/điều khoản riêng của nhà cung cấp; cần kiểm tra khi phân phối.

## ĐỔI TÊN TỪ LUMI SANG VISI

Tên hiển thị, PWA, file tải và repository là **Visi Studio**. Các khóa bộ nhớ nội bộ cũ (`lumi-beauty-state-v1` và `lumi-beauty-gallery`) được giữ để không làm mất dữ liệu lưu trên trình duyệt ở những cài đặt hiện hữu. Khi nhập sao lưu JSON, ứng dụng chấp nhận cả bản LUMI cũ và Visi mới.
