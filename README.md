```markdown
# RetroArch to Batocera Exporter

Chương trình giúp xuất các mục yêu thích (favorites) từ RetroArch (file `content_favorites.lpl`) cùng với ảnh thumbnails đã tải thành cấu trúc thư mục ROM chuẩn của Batocera, và tự động sinh file `gamelist.xml` để Batocera nhận diện ảnh.

## Tính năng

- Đọc file playlist `content_favorites.lpl` và thư mục `thumbnails` của RetroArch.
- Xác định hệ máy dựa trên trường `db_name` (ưu tiên) hoặc `core_name` (dự phòng) trong playlist.
- Copy ROM vào đúng thư mục hệ máy của Batocera (theo bảng map có sẵn).
- Copy ảnh (ưu tiên Boxart, dự phòng Titles) vào thư mục `images` bên cạnh ROM.
- Đổi tên ảnh theo tên file ROM để Batocera tự động ghép ảnh.
- **Tạo file `gamelist.xml` cho từng hệ máy** (tự động liên kết ROM với ảnh).
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

### 1. Export dữ liệu từ RetroArch

```bash
npm start -- "duong_dan_thu_muc_retroarch"
```

Trong đó `duong_dan_thu_muc_retroarch` là thư mục gốc chứa `content_favorites.lpl` và `thumbnails`.

**Ví dụ:**

Windows:
```bash
npm start -- "D:\RetroArch"
```

Linux / macOS:
```bash
npm start -- "/home/user/RetroArch"
```

**Kết quả:**  
Thư mục `batocera_roms` được tạo tại nơi chạy lệnh, với cấu trúc:

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
    └── unknown/              # Các hệ máy chưa được map
```

### 2. Tạo file `gamelist.xml` (sau khi đã có `batocera_roms`)

Sau khi export hoặc nếu bạn đã có sẵn thư mục `batocera_roms`, hãy chạy lệnh sau để sinh `gamelist.xml` cho từng hệ máy:

```bash
npm run gamelist
```

Hoặc:

```bash
npm start -- --gamelist
```

Lệnh này sẽ:
- Quét tất cả các thư mục con bên trong `batocera_roms/roms/`
- Với mỗi hệ máy, tạo file `gamelist.xml` liệt kê các game và đường dẫn ảnh (nếu có)
- Ghi log số lượng game và ảnh được liên kết.

## Mapping hệ máy (dựa trên `db_name`)

Chương trình ưu tiên sử dụng trường `db_name` trong mỗi mục của playlist. Ví dụ: `"db_name": "Nintendo - Super Nintendo Entertainment System.lpl"`. Nếu không có `db_name`, chương trình sẽ dùng `core_name` làm dự phòng.

### Bảng map mặc định

| `db_name` (có hoặc không .lpl) | Thư mục Batocera |
|--------------------------------|------------------|
| Nintendo - Nintendo Entertainment System | nes |
| Nintendo - Super Nintendo Entertainment System | snes |
| Nintendo - Nintendo 64 | n64 |
| Nintendo - Game Boy | gb |
| Nintendo - Game Boy Color | gbc |
| Nintendo - Game Boy Advance | gba |
| Nintendo - Nintendo DS | nds |
| Nintendo - Nintendo 3DS | 3ds |
| Sega - Master System | mastersystem |
| Sega - Mega Drive - Genesis | megadrive |
| Sega - Game Gear | gamegear |
| Sega - Saturn | saturn |
| Sega - Dreamcast | dreamcast |
| Sony - PlayStation | psx |
| Sony - PlayStation 2 | ps2 |
| Sony - PlayStation Portable | psp |
| Atari - 2600 | atari2600 |
| Atari - 5200 | atari5200 |
| Atari - 7800 | atari7800 |
| Atari - Lynx | lynx |
| MAME | mame |
| Arcade | arcade |
| Neo Geo | neogeo |
| PC Engine - TurboGrafx 16 | pcengine |
| Commodore - Amiga | amiga |
| ZX Spectrum | zxspectrum |

Nếu `db_name` (hoặc `core_name`) của bạn không có trong bảng, chương trình sẽ ghi log cảnh báo và xếp vào thư mục `unknown`. Bạn có thể dễ dàng bổ sung mapping bằng cách sửa file `src/index.ts` (object `DBNAME_TO_SYSTEM`).

## Quy tắc xử lý ảnh

- Tìm ảnh trong `thumbnails/Named_Boxarts` trước, nếu không có thì tìm trong `thumbnails/Named_Titles`.
- Hỗ trợ định dạng `.png`, `.jpg`, `.jpeg`.
- Ảnh được copy vào `roms/<hệ_máy>/images/` và đổi tên theo tên file ROM (không phần mở rộng), giữ nguyên đuôi ảnh.
- Không sử dụng ảnh từ `Named_Snaps`.

## Cấu trúc file `gamelist.xml` được tạo

Mỗi thư mục hệ máy (VD: `batocera_roms/roms/nes/`) sẽ có file `gamelist.xml` với nội dung:

```xml
<?xml version="1.0"?>
<gameList>
  <game>
    <path>./Super Mario Bros.nes</path>
    <image>./images/Super Mario Bros.png</image>
  </game>
  ...
</gameList>
```

- Nếu game không có ảnh, thẻ `</image>` sẽ bị bỏ qua.
- Đường dẫn ảnh là tương đối (bắt đầu bằng `./images/`), đúng chuẩn Batocera.

## Ghi chú

- ROM và ảnh đã tồn tại trong thư mục đích sẽ bị **ghi đè** (cùng tên).
- Chỉ copy, không di chuyển dữ liệu gốc.
- Các ROM trùng đường dẫn tuyệt đối chỉ được copy một lần.
- Sau khi tạo `gamelist.xml`, bạn có thể copy toàn bộ thư mục `batocera_roms` vào ổ `SHARE` của Batocera (thường là `/userdata/roms/`).

## Log

Log được ghi đồng thời ra console và file `batocera_roms/export.log`. Mỗi dòng đều có timestamp và mức độ (INFO, WARN, ERROR). Cuối quá trình có bảng tổng kết:

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

Khi chạy `npm run gamelist`:

```
[nes] Đã tạo gamelist.xml với 12 games, 10 có ảnh.
[snes] Đã tạo gamelist.xml với 20 games, 18 có ảnh.
Tổng cộng: 32 games, 28 ảnh được liên kết trong gamelist.xml
```

## Xử lý lỗi thường gặp

| Lỗi                                     | Nguyên nhân & cách khắc phục |
|-----------------------------------------|------------------------------|
| `Playlist file not found`               | Đường dẫn RetroArch không chứa `content_favorites.lpl`. Kiểm tra lại. |
| `Thumbnails folder not found`           | Thiếu thư mục `thumbnails` trong thư mục RetroArch. |
| `Failed to parse playlist JSON`         | File `content_favorites.lpl` bị hỏng hoặc không đúng định dạng. |
| `ROM not found`                         | Đường dẫn ROM trong playlist không chính xác hoặc file đã bị xóa. |
| `No image found for label ...`          | Không tìm thấy ảnh boxart/title tương ứng trong thumbnails. |
| `Unknown system from db_name=...`       | Hệ máy chưa được map, kiểm tra và thêm vào bảng map. |
| `Không tìm thấy thư mục batocera_roms`  | Chạy lệnh `--gamelist` nhưng chưa có thư mục `batocera_roms`. Hãy export trước. |

## Tùy chỉnh nâng cao

### Thay đổi thư mục output

Hiện tại output luôn là `batocera_roms` ở thư mục hiện hành. Nếu muốn thay đổi, hãy sửa biến `outputRoot` trong hàm `exportFavorites` (file `src/index.ts`).

### Bổ sung mapping cho hệ máy mới

Mở `src/index.ts`, tìm object `DBNAME_TO_SYSTEM`. Thêm dòng:

```typescript
'Nintendo - Virtual Boy.lpl': 'virtualboy',
'Nintendo - Virtual Boy': 'virtualboy',
```

Nếu muốn dùng `core_name` làm fallback, sửa object `CORE_TO_SYSTEM` tương tự.

Sau khi sửa, build lại:

```bash
npm run build
```

## Giấy phép

MIT
```