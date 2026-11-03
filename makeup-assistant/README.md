# Visi Studio — Dynamic AI Makeup Curriculum (7 styles)

Một ứng dụng HTML/CSS/JavaScript thuần, được phát triển từ Visi Studio AI Makeup Assistant. Chạy được dưới `/visi-studio/makeup-assistant/` trên GitHub Pages hoặc tại một website tĩnh khác. **Không có gói Cơ bản/Nâng cao và không khóa lộ trình theo 7/14 bước.**

## 1. Cách hoạt động

Người dùng chọn một trong 7 phong cách: **Việt Nam tự nhiên, Douyin trong trẻo, Âu Mỹ sắc nét, Thái Lan quyến rũ, Hàn Quốc thanh lịch, Clean Girl, Latin / Fox Eye**. Họ cho phép camera hoặc tải ảnh để MediaPipe Face Landmarker tìm điểm trên mặt. Ứng dụng **ước lượng** nhóm tông da từ điểm má (phụ thuộc rất mạnh vào ánh sáng); người dùng có thể chuyển nhóm thủ công. Cuối cùng, người dùng kiểm tra và đánh dấu các loại mỹ phẩm, dụng cụ họ thực sự sở hữu.

`curriculum.js` nhận `{ style, tone, skinType, timeOfDay, inventory }`, sau đó:

1. Lấy `styles[style].stepOrder` — thứ tự **phong cách** (không phải số bước cố định).
2. Bỏ các bước không phù hợp thời điểm (chống nắng buổi tối) và điều kiện loại da.
3. Với mỗi bước, kiểm tra `requiredInventoryAnyOf`: **mỗi nhóm cần ít nhất 1 loại mỹ phẩm đã được xác nhận**. Nếu thiếu, bỏ qua bước và đưa sản phẩm vào danh sách cần chuẩn bị; không hướng dẫn thoa thứ người dùng không có.
4. Tạo `palette` từ `styles[style].skinTonePalette[tone]` và thông tin hướng dẫn từ `skinTypeConditions`, `toneSuggestions`, `styleVariations` của công đoạn.
5. Cấp file video cục bộ đúng phong cách: `media/styles/<style>/<step>.mp4`. Không dùng YouTube và không lấy video của phong cách khác.
6. Ghi tiến độ của từng cấu hình vào `localStorage` (trên thiết bị).

`VisiCurriculum.buildPlan(data, opts)` trả về:

```javascript
{
  style, styleInfo, tone, skinType, timeOfDay, inventory,
  steps: [{ id, title, actions, availableProducts, videoUrl, imageUrl,
            suggestedColors, skinGuidance, quantityGuidance, styleGuidance }],
  stepIds, skipped, missing, requiredTools, palette,
  totalMinutes, suggestionCategories, warnings
}
```

Ví dụ:

```javascript
const data = await fetch('./data/steps.sample.json').then(r => r.json());
const profile = VisiCurriculum.validate(data);
const plan = VisiCurriculum.buildPlan(profile, {
  style:'douyin', tone:'tan', skinType:'oily', timeOfDay:'day',
  inventory:['lipstick','blush','eyeshadow','brush']
});
console.log(plan.stepIds); // ['eyeshadow','blush','lipstick']
```

## 2. Cấu trúc thư mục

```
makeup-assistant/
  index.html             # giao diện 2 màn hình
  style.css              # style mới + giao diện cũ
  inventory.css          # tủ mỹ phẩm / quét ảnh
  script.js              # camera, makeup, video, tương tác
  inventory-ai.js        # nhận diện mỹ phẩm thử nghiệm, xác nhận thủ công
  curriculum.js          # pure-js dynamic planner, không phụ thuộc DOM
  data/steps.sample.json # 7 phong cách + 15 công đoạn và điều kiện
  assets/styles/*.svg    # 7 ảnh minh họa đồ họa 1200 x 800
  media/styles/*/*.mp4   # 105 video MP4 đồ họa theo phong cách + công đoạn
  tests/check-dynamic.js # 280 tình huống lựa chọn
```

105 clip là **video minh họa đồ họa do ứng dụng tạo** (mỗi video hiển thị quy trình/thao tác minh họa), **không phải footage của nghệ sĩ trang điểm chuyên nghiệp**. Khi có video chuyên gia được cấp phép phù hợp, bạn có thể thay video MP4 đúng đường dẫn và giữ nguyên JSON. Người dùng cũng có thể nhập video của mình trong trình duyệt; video người dùng không được tự động lưu lên server.

Các ảnh phong cách là minh họa vector SVG gốc (không phải ảnh mẫu người thật). Có thể thay bằng ảnh JPG/WebP chất lượng cao **mà bạn có quyền sử dụng**, sửa cả `styles[].imageUrl` và `steps[].mediaByStyle[].image`. Hãy giữ ảnh trong `assets/styles/` để có thể truy cập ổn định trên GitHub Pages.

## 3. Đưa lên GitHub Pages (không ghi đè website chính)

1. Giải nén gói ZIP.
2. Mở repository `https://github.com/hungngoxuan77-design/visi-studio` → **Add file → Upload files**.
3. Kéo **nguyên thư mục `makeup-assistant`** ở cấp gốc vào vùng tải lên (thay file cũ trong thư mục này nếu đã có).
4. Kiểm tra đường dẫn `makeup-assistant/index.html`, `makeup-assistant/data/steps.sample.json`, `makeup-assistant/media/styles/douyin/lipstick.mp4` xuất hiện trong bản commit.
5. **Commit changes**. Trong Settings → Pages, giữ `Deploy from a branch` → `main` → `/(root)`.
6. Mở `https://hungngoxuan77-design.github.io/visi-studio/makeup-assistant/` sau khi workflow GitHub Pages thành công. Dùng `Ctrl+Shift+R` nếu bị cache.

**Không cần upload lại hoặc thay file `index.html` ở thư mục gốc** của website Visi Studio.

## 4. Chạy thử và kiểm thử

Chạy máy chủ cục bộ ở thư mục chứa `makeup-assistant`:

```bash
python -m http.server 8080
```

Mở `http://localhost:8080/makeup-assistant/`. Không mở trực tiếp file HTML `file://` vì JavaScript phải `fetch()` dữ liệu JSON. MediaPipe và CLIP (dùng tùy chọn) tải mô hình từ bên thứ ba khi dùng, cần Internet.

```bash
node makeup-assistant/tests/check-dynamic.js
node --check makeup-assistant/script.js
node --check makeup-assistant/curriculum.js
node --check makeup-assistant/inventory-ai.js
```

## 5. Giới hạn cần minh bạch trước khi bán

- MediaPipe xác định điểm trên khuôn mặt. **Phân loại tông da hiện vẫn là phép ước lượng độ sáng từ vài vùng má, không phải mô hình tone matching đã được thẩm định.** Màu makeup ảo không đủ tin cậy để quyết định mã kem nền khi mua.
- Không đo loại da chính xác chỉ từ ảnh. Loại da do người dùng tự chọn. Lượng dùng phụ thuộc loại da, sản phẩm và nhu cầu, không chỉ dựa vào mức da sáng/tối.
- Quét sản phẩm bằng CLIP chạy thử nghiệm trên thiết bị, có thể nhận nhầm; chỉ thêm loại mỹ phẩm sau khi người dùng xác nhận.
- Khi máy không có webcam hoặc Chrome báo `NotReadableError`, dùng chế độ tải ảnh. Không cam kết đã kiểm thử webcam thật trong môi trường tự động.
- Website tĩnh không có xác thực tài khoản, thương mại điện tử, hay cơ sở dữ liệu nhiều người dùng. Để bán gói cần dịch vụ backend, quyền truy cập và quản lý dữ liệu.
- Hình SVG và MP4 là nội dung hướng dẫn đồ họa mang tính demo; cần thay bằng media được sản xuất chuyên nghiệp và cấp phép trước khi gọi đây là khóa học của chuyên gia.
