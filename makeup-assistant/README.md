# Visi Studio — AI Makeup Assistant · JSON-driven edition

Ứng dụng web HTML/CSS/JavaScript thuần. **Mọi bài học, quy tắc lọc và nội dung cá nhân hóa được đọc từ `data/steps.sample.json` khi tải trang**, không còn một danh sách `COURSE` viết cứng trong `script.js`.

## Chạy thử tại máy

```bash
cd makeup-assistant
python -m http.server 8000
```

Mở `http://localhost:8000`. **Đừng mở `index.html` trực tiếp qua `file://`**: trình duyệt thường chặn `fetch()` tới file JSON. Camera chỉ hoạt động trong môi trường an toàn (HTTPS hoặc localhost) với quyền và webcam phù hợp.

## Đưa lên GitHub Pages

1. Giữ nguyên cấu trúc `makeup-assistant/` và tải **cả thư mục** vào gốc repo `hungngoxuan77-design/visi-studio` (hoặc thay các file tương ứng trong thư mục `makeup-assistant` nếu đã có).
2. Kiểm tra các đường dẫn `makeup-assistant/index.html`, `makeup-assistant/script.js`, `makeup-assistant/curriculum.js`, `makeup-assistant/inventory-ai.js`, `makeup-assistant/data/steps.sample.json`, `makeup-assistant/media/`.
3. Trong GitHub Pages chọn nhánh `main`, thư mục `/(root)`; sau deploy mở `https://hungngoxuan77-design.github.io/visi-studio/makeup-assistant/`.
4. Nếu đã có bản cũ, thử cửa sổ ẩn danh hoặc Ctrl+Shift+R.

## Cấu trúc

```text
makeup-assistant/
├── index.html              # Giao diện hai màn hình và bộ lọc
├── style.css               # Thiết kế + thẻ gợi ý cá nhân hóa
├── inventory.css           # Giao diện quét/tủ mỹ phẩm
├── curriculum.js           # ENGINE đọc, kiểm tra và lọc theo các rule JSON
├── script.js               # fetch JSON lúc khởi động, giao diện, camera, bài học
├── inventory-ai.js        # Tủ mỹ phẩm + quét một sản phẩm AI thử nghiệm
├── data/steps.sample.json  # 14 bước, schema 1.2 (mở rộng từ 1.1)
├── assets/                 # Logo và ảnh minh họa
└── media/                  # 5 video minh họa MP4
```

## Dữ liệu JSON nối vào chức năng nào?

| Trường JSON | Trên web app |
|---|---|
| `displayConditions.plans` | Chọn Cơ bản / Nâng cao; số bước tự lấy từ JSON (7/14) |
| `displayConditions.timeOfDay` | Chọn ban ngày / buổi tối; ví dụ chống nắng chỉ có vào ban ngày |
| `displayConditions.eligibleSkinTypes` và `skinTypeConditions[skin].enabled` | Điều kiện được hiển thị theo loại da |
| `displayConditions.inventoryCategories`, `optional`, `missingInventoryAction` | Ẩn bước tùy chọn thiếu mỹ phẩm ở gói Tự động; hiện cảnh báo thiếu món trong gói chọn tay |
| `instructionSteps` | Các thao tác chi tiết, thứ tự, dụng cụ, thời lượng và vị trí khuôn mặt |
| `skinTypeConditions` | Lưu ý theo da dầu, khô, thường, hỗn hợp hoặc nhạy cảm; gợi ý lượng dùng |
| `toneSuggestions` | Màu gợi ý theo tông sáng / trung bình / ngăm / sẫm |
| `styleVariations` | Hướng dẫn khác nhau cho Việt Nam / Douyin / Âu Mỹ |
| `productNotes` | Ghi chú mua/chọn mỹ phẩm, lượng dùng và phương án thay thế |
| `localIllustrationVideoUrl` | Video MP4 riêng của từng công đoạn |
| `placeholderImageUrl` | Ảnh minh họa công đoạn |
| `expertResourceUrl`, `expertVideoUrl` | Tài liệu và video từ nguồn tham khảo |

**Tự sửa JSON:** đổi nội dung, số bước, điều kiện, video tại `data/steps.sample.json`, commit lên GitHub. Tải lại trang là có dữ liệu mới, không phải chép `COURSE` vào `script.js`. Nhớ giữ schema hợp lệ; nếu JSON sai, app hiện banner báo lỗi và nút Thử lại.

**Lộ trình & tủ đồ:**
- Chưa chọn mỹ phẩm: gói Auto sử dụng chương trình Cơ bản (ban ngày tối đa 7 bước).
- Tủ đồ đủ mỹ phẩm: app đề xuất Nâng cao, chỉ giữ bước bắt buộc và các bước tùy chọn có vật dụng phù hợp.
- Chọn gói Cơ bản hoặc Nâng cao thủ công: luôn hiển thị các bước phù hợp điều kiện; cảnh báo sản phẩm còn thiếu.
- Chọn buổi tối: theo JSON mẫu, bỏ chống nắng. Các phần `skinTypeConditions` hiện đều `enabled=true` vì loại da không nên mặc định bị tước bước makeup; thay nội dung điều kiện theo nhu cầu có kiểm chứng.
- Tông da từ AI là **ước lượng dựa trên ánh sáng ảnh**, không phải đo undertone hoặc chẩn đoán da. Người dùng luôn có thể chọn tay; lượng mỹ phẩm liên quan loại da và sản phẩm, không được suy ra từ độ sáng da.

## Kiểm thử

```bash
node --check curriculum.js
node --check inventory-ai.js
node --check script.js
node tests/check-curriculum.js
```

Bài kiểm thử kiểm tra dữ liệu JSON, 30 tổ hợp gói/loại da/thời điểm, gợi ý theo tông da, liên kết video, và việc ẩn chống nắng ban đêm. Kiểm thử này không thay cho kiểm tra thao tác camera AI trên thiết bị thật.

## Quyền riêng tư và giới hạn

Camera không mở tự động; khung hình được xử lý trên trình duyệt qua MediaPipe khi có quyền. Mô hình MediaPipe và CLIP tải từ dịch vụ thứ ba, cần mạng. CLIP là bộ phân loại dựa trên tương đồng, có thể nhận diện sai; người dùng xác nhận thủ công trước khi đưa vào tủ. Không có máy chủ lưu ảnh, cơ sở dữ liệu người dùng, thanh toán, hay phân tích tông da đủ chính xác để mua đúng mã nền. Video minh họa có sẵn chỉ là đồ họa và liên kết chuyên gia thuộc nguồn bên ngoài, không thay thế thư viện bài giảng chuyên nghiệp đã xin bản quyền.
