Dưới đây là nội dung file `README.md` cho chương trình, bạn lưu vào cùng thư mục dự án.

```markdown
# RetroArch to Batocera Exporter

Chương trình giúp xuất các mục yêu thích (favorites) từ RetroArch (file `content_favorites.lpl`) cùng với ảnh thumbnails đã tải thành cấu trúc thư mục ROM chuẩn của Batocera (hỗ trợ cả ảnh nằm trong thư mục `images`).

## Tính năng

- Đọc file playlist `content_favorites.lpl` và thư mục `thumbnails` của RetroArch.
- Copy ROM vào đúng thư mục hệ máy của Batocera (dựa trên tên core).
- Copy ảnh (ưu tiên Boxart, dự phòng Titles) vào thư mục `images` bên cạnh ROM.
- Đổi tên ảnh theo tên file ROM để Batocera tự động ghép ảnh.
- Ghi log chi tiết ra console và file `export.log`.
- Hỗ trợ cả Windows, Linux, macOS.

## Yêu cầu

- Node.js (phiên bản 14 trở lên)
- npm (hoặc yarn)

## Cài đặt

1. **Tải mã nguồn** (tạo thư mục mới và copy các file `package.json`, `tsconfig.json`, `src/index.ts`).
2. **Cài đặt dependencies**:

```bash
npm install
```

3. **Build chương trình**:

```bash
npm run build
```

## Sử dụng

### Cú pháp

```bash
npm start -- "duong_dan_thu_muc_retroarch"
```

Trong đó `duong_dan_thu_muc_retroarch` là thư mục gốc chứa `content_favorites.lpl` và `thumbnails`.

### Ví dụ

**Windows:**
```bash
npm start -- "D:\RetroArch"
```

**Linux / macOS:**
```bash
npm start -- "/home/user/RetroArch"
```

### Kết quả

- Thư mục `batocera_roms` được tạo ngay trong thư mục bạn chạy lệnh.
- Cấu trúc bên trong:

```
batocera_roms/
├── export.log                # Toàn bộ log
└── roms/
    ├── nes/
    │   ├── Super Mario Bros.nes
    │   └── images/
    │       └── Super Mario Bros.png
    ├── snes/
    │   ├── Chrono Trigger.sfc
    │   └── images/
    │       └── Chrono Trigger.png
    └── unknown/              # Các core chưa được map sẽ gom vào đây
```

## Mapping core → hệ máy Batocera

Chương trình có sẵn bảng map cho các hệ máy phổ biến. Bạn có thể sửa trực tiếp trong file `src/index.ts` (object `CORE_TO_SYSTEM`).

### Các core đã được hỗ trợ

| Core name (trong playlist)                 | Thư mục Batocera |
|--------------------------------------------|------------------|
| Nintendo - Nintendo Entertainment System   | nes              |
| Nintendo - Super Nintendo Entertainment System | snes         |
| Nintendo - Nintendo 64                     | n64              |
| Nintendo - Game Boy                        | gb               |
| Nintendo - Game Boy Color                  | gbc              |
| Nintendo - Game Boy Advance                | gba              |
| Nintendo - Nintendo DS                     | nds              |
| Sega - Master System                       | mastersystem     |
| Sega - Mega Drive - Genesis                | megadrive        |
| Sega - Game Gear                           | gamegear         |
| Sega - Saturn                              | saturn           |
| Sega - Dreamcast                           | dreamcast        |
| Sony - PlayStation                         | psx              |
| Sony - PlayStation 2                       | ps2              |
| Sony - PlayStation Portable                | psp              |
| Atari - 2600                               | atari2600        |
| MAME / Arcade / Neo Geo                    | mame / arcade / neogeo |
| ... (xem chi tiết trong code)             |                  |

Nếu core của bạn không có trong danh sách, chương trình sẽ tự động chuyển vào thư mục `unknown` và ghi log cảnh báo. Bạn có thể bổ sung mapping bằng cách sửa code.

## Quy tắc xử lý ảnh

- Chương trình tìm ảnh trong thư mục `thumbnails/Named_Boxarts` trước, nếu không có thì tìm trong `thumbnails/Named_Titles`.
- Chỉ chấp nhận định dạng `.png`, `.jpg`, `.jpeg`.
- Ảnh được copy vào thư mục `images` (cùng cấp với ROM) và đổi tên thành `tên_file_ROM.png` (giữ nguyên phần mở rộng gốc của ảnh).
- Không sử dụng ảnh từ `Named_Snaps` (screenshot).

## Ghi chú

- Nếu ROM đã tồn tại trong thư mục đích, nó sẽ bị **ghi đè** (vì cùng tên). Hãy kiểm tra kỹ nếu bạn muốn giữ bản cũ.
- Nếu ảnh trùng tên cũng bị ghi đè.
- Chương trình chỉ copy ROM chứ không di chuyển, do đó dữ liệu gốc vẫn được giữ nguyên.
- Các ROM trùng đường dẫn tuyệt đối (cùng một file) sẽ chỉ được copy một lần để tránh trùng lặp.

## Log

Log được ghi đồng thời ra màn hình console và file `batocera_roms/export.log`. Mỗi dòng đều có timestamp và mức độ (INFO, WARN, ERROR). Cuối quá trình có bảng tổng kết:

```
========== EXPORT SUMMARY ==========
Total items in playlist: 50
ROMs copied: 48
Images copied: 45
Skipped (ROM missing): 2
Skipped (no image found): 3
Unknown systems mapped: 0
Output folder: /home/user/retroarch-to-batocera/batocera_roms
=====================================
```

## Xử lý lỗi thường gặp

| Lỗi                                     | Nguyên nhân & cách khắc phục |
|-----------------------------------------|------------------------------|
| `Playlist file not found`               | Đường dẫn RetroArch không chứa `content_favorites.lpl`. Kiểm tra lại. |
| `Thumbnails folder not found`           | Thiếu thư mục `thumbnails` trong thư mục RetroArch. |
| `Failed to parse playlist JSON`         | File `content_favorites.lpl` bị hỏng hoặc không đúng định dạng. |
| `ROM not found`                         | Đường dẫn ROM trong playlist không chính xác hoặc file đã bị xóa. |
| `No image found for label ...`          | Không tìm thấy ảnh boxart/title tương ứng trong thumbnails. |

## Tùy chỉnh nâng cao

### Thay đổi thư mục output

Hiện tại output luôn là `batocera_roms` ở thư mục hiện hành. Nếu muốn thay đổi, bạn có thể sửa biến `outputRoot` trong hàm `exportFavorites` (file `src/index.ts`).

### Bổ sung mapping core mới

Mở `src/index.ts`, tìm object `CORE_TO_SYSTEM`, thêm dòng:

```typescript
'[tên core chính xác trong playlist]': '[tên thư mục batocera]'
```

Ví dụ:
```typescript
'Commodore - 64': 'c64',
```

Sau đó build lại:

```bash
npm run build
```

## Giấy phép

MIT
```