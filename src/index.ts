import fs from "fs-extra";
import path from "path";

// ------------------------------
// 1. Mapping db_name (từ playlist) hoặc core_name -> Batocera system folder
// ------------------------------
// Lưu ý: db_name thường có dạng "Nintendo - Nintendo Entertainment System.lpl"
// Chúng ta map cả chuỗi có hoặc không có .lpl
const DBNAME_TO_SYSTEM: Record<string, string> = {
  // Nintendo
  "Nintendo - Nintendo Entertainment System.lpl": "nes",
  "Nintendo - Nintendo Entertainment System": "nes",
  "Nintendo - Super Nintendo Entertainment System.lpl": "snes",
  "Nintendo - Super Nintendo Entertainment System": "snes",
  "Nintendo - Nintendo 64.lpl": "n64",
  "Nintendo - Nintendo 64": "n64",
  "Nintendo - Game Boy.lpl": "gb",
  "Nintendo - Game Boy": "gb",
  "Nintendo - Game Boy Color.lpl": "gbc",
  "Nintendo - Game Boy Color": "gbc",
  "Nintendo - Game Boy Advance.lpl": "gba",
  "Nintendo - Game Boy Advance": "gba",
  "Nintendo - Nintendo DS.lpl": "nds",
  "Nintendo - Nintendo DS": "nds",
  "Nintendo - Nintendo 3DS.lpl": "3ds",
  "Nintendo - Nintendo 3DS": "3ds",

  // Sega
  "Sega - Master System.lpl": "mastersystem",
  "Sega - Master System": "mastersystem",
  "Sega - Mega Drive - Genesis.lpl": "megadrive",
  "Sega - Mega Drive - Genesis": "megadrive",
  "Sega - Game Gear.lpl": "gamegear",
  "Sega - Game Gear": "gamegear",
  "Sega - Saturn.lpl": "saturn",
  "Sega - Saturn": "saturn",
  "Sega - Dreamcast.lpl": "dreamcast",
  "Sega - Dreamcast": "dreamcast",

  // Sony
  "Sony - PlayStation.lpl": "psx",
  "Sony - PlayStation": "psx",
  "Sony - PlayStation 2.lpl": "ps2",
  "Sony - PlayStation 2": "ps2",
  "Sony - PlayStation Portable.lpl": "psp",
  "Sony - PlayStation Portable": "psp",

  // Atari
  "Atari - 2600.lpl": "atari2600",
  "Atari - 2600": "atari2600",
  "Atari - 5200.lpl": "atari5200",
  "Atari - 5200": "atari5200",
  "Atari - 7800.lpl": "atari7800",
  "Atari - 7800": "atari7800",
  "Atari - Lynx.lpl": "lynx",
  "Atari - Lynx": "lynx",

  // Other
  "MAME.lpl": "mame",
  MAME: "mame",
  "Arcade.lpl": "arcade",
  Arcade: "arcade",
  "Neo Geo.lpl": "neogeo",
  "Neo Geo": "neogeo",
  "PC Engine - TurboGrafx 16.lpl": "pcengine",
  "PC Engine - TurboGrafx 16": "pcengine",
  "Commodore - Amiga.lpl": "amiga",
  "Commodore - Amiga": "amiga",
  "ZX Spectrum.lpl": "zxspectrum",
  "ZX Spectrum": "zxspectrum",
};

// Dự phòng: map theo core_name cho các trường hợp không có db_name
const CORE_TO_SYSTEM: Record<string, string> = {
  "Nintendo - NES": "nes",
  "Nintendo - SNES": "snes",
  "Nintendo - N64": "n64",
  "Nintendo - Game Boy": "gb",
  "Nintendo - Game Boy Color": "gbc",
  "Nintendo - Game Boy Advance": "gba",
  "Nintendo - DS": "nds",
  "Sega - Mega Drive/Genesis": "megadrive",
  "Sega - Master System": "mastersystem",
  "Sega - Game Gear": "gamegear",
  "Sony - PlayStation": "psx",
  "Sony - PlayStation 2": "ps2",
  "Sony - PlayStation Portable": "psp",
  MAME: "mame",
};

// ------------------------------
// 2. Helper: log both console and file
// ------------------------------
let logStream: fs.WriteStream;

function initLogFile(outputDir: string) {
  const logPath = path.join(outputDir, "export.log");
  fs.ensureDirSync(outputDir);
  logStream = fs.createWriteStream(logPath, { flags: "a" });
  log(`Log file created at ${logPath}`);
}

function log(message: string, level: "INFO" | "WARN" | "ERROR" = "INFO") {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [${level}] ${message}`;
  console.log(formatted);
  if (logStream) logStream.write(formatted + "\n");
}

// ------------------------------
// 3. Find image file (boxart or title) from thumbnails folder
// ------------------------------
function findImageFile(thumbnailsDir: string, label: string): string | null {
  const possibleDirs = ["Named_Boxarts", "Named_Titles"];
  const extensions = [".png", ".jpg", ".jpeg"];

  for (const dir of possibleDirs) {
    const baseDir = path.join(thumbnailsDir, dir);
    if (!fs.existsSync(baseDir)) continue;

    for (const ext of extensions) {
      const imagePath = path.join(baseDir, `${label}${ext}`);
      if (fs.existsSync(imagePath)) {
        return imagePath;
      }
    }
  }
  return null;
}

// ------------------------------
// 4. Get system folder from db_name or core_name
// ------------------------------
function getSystemFolder(dbName?: string, coreName?: string): string {
  if (dbName) {
    // Try direct match first
    if (DBNAME_TO_SYSTEM[dbName]) return DBNAME_TO_SYSTEM[dbName];
    // Try without .lpl if present
    const withoutExt = dbName.replace(/\.lpl$/i, "");
    if (DBNAME_TO_SYSTEM[withoutExt]) return DBNAME_TO_SYSTEM[withoutExt];
  }
  if (coreName && CORE_TO_SYSTEM[coreName]) return CORE_TO_SYSTEM[coreName];
  return "unknown";
}

// ------------------------------
// 5. Main export function
// ------------------------------
async function exportFavorites(retroarchPath: string) {
  const playlistPath = path.join(retroarchPath, "content_favorites.lpl");
  const thumbnailsPath = path.join(retroarchPath, "thumbnails");
  const outputRoot = path.join(process.cwd(), "batocera_roms");

  // Validate input
  if (!fs.existsSync(playlistPath)) {
    log(`Playlist file not found: ${playlistPath}`, "ERROR");
    process.exit(1);
  }
  if (!fs.existsSync(thumbnailsPath)) {
    log(`Thumbnails folder not found: ${thumbnailsPath}`, "ERROR");
    process.exit(1);
  }

  initLogFile(outputRoot);
  log(`Reading playlist: ${playlistPath}`);
  log(`Thumbnails source: ${thumbnailsPath}`);
  log(`Output directory: ${outputRoot}`);

  // Parse playlist (JSON)
  let playlist: any;
  try {
    playlist = await fs.readJson(playlistPath);
  } catch (err) {
    log(`Failed to parse playlist JSON: ${err}`, "ERROR");
    process.exit(1);
  }

  if (!playlist.items || !Array.isArray(playlist.items)) {
    log('Invalid playlist structure: missing "items" array', "ERROR");
    process.exit(1);
  }

  const items = playlist.items;
  log(`Found ${items.length} items in favorites playlist.`);

  let copiedRomCount = 0;
  let copiedImageCount = 0;
  let skippedNoRom = 0;
  let skippedNoImage = 0;
  let unknownSystemCount = 0;

  const processedRoms = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const romPathRaw = item.path;
    const dbName = item.db_name; // e.g., "Nintendo - Super Nintendo Entertainment System.lpl"
    const coreName = item.core_name; // fallback
    const label =
      item.label || path.basename(romPathRaw, path.extname(romPathRaw));

    if (!romPathRaw) {
      log(`Item ${i + 1}: missing ROM path, skipped`, "WARN");
      skippedNoRom++;
      continue;
    }

    // Resolve absolute ROM path
    const romPath = path.isAbsolute(romPathRaw)
      ? romPathRaw
      : path.join(retroarchPath, romPathRaw);

    if (!fs.existsSync(romPath)) {
      log(`Item ${i + 1}: ROM not found: ${romPath}`, "WARN");
      skippedNoRom++;
      continue;
    }

    // Get system folder using db_name (priority) then core_name
    const systemFolder = getSystemFolder(dbName, coreName);
    if (systemFolder === "unknown") {
      unknownSystemCount++;
      log(
        `Item ${i + 1}: Unknown system from db_name="${dbName}" core_name="${coreName}" → mapping to "unknown"`,
        "WARN",
      );
    }

    // Destination directories
    const romDestDir = path.join(outputRoot, "roms", systemFolder);
    const imageDestDir = path.join(romDestDir, "images");
    await fs.ensureDir(romDestDir);
    await fs.ensureDir(imageDestDir);

    const romFileName = path.basename(romPath);
    const romBaseName = path.basename(romPath, path.extname(romPath));
    const destRomPath = path.join(romDestDir, romFileName);

    // Copy ROM if not already copied
    if (!processedRoms.has(romPath)) {
      try {
        await fs.copy(romPath, destRomPath, { overwrite: true });
        log(`Copied ROM: ${romFileName} → ${systemFolder}/`);
        copiedRomCount++;
        processedRoms.add(romPath);
      } catch (err) {
        log(`Failed to copy ROM ${romFileName}: ${err}`, "ERROR");
      }
    } else {
      log(`ROM already copied (duplicate): ${romFileName}`, "INFO");
    }

    // Handle image
    const imageSourcePath = findImageFile(
      path.join(thumbnailsPath, dbName.replace(".lpl", "")),
      label,
    );
    if (imageSourcePath) {
      const imageExt = path.extname(imageSourcePath);
      const destImageName = `${romBaseName}${imageExt}`;
      const destImagePath = path.join(imageDestDir, destImageName);
      try {
        await fs.copy(imageSourcePath, destImagePath, { overwrite: true });
        log(`Copied image: ${label} → images/${destImageName}`);
        copiedImageCount++;
      } catch (err) {
        log(`Failed to copy image for "${label}": ${err}`, "ERROR");
      }
    } else {
      log(`No image found for label "${label}" (ROM: ${romFileName})`, "WARN");
      skippedNoImage++;
    }
  }

  // Final summary
  log("\n========== EXPORT SUMMARY ==========");
  log(`Total items in playlist: ${items.length}`);
  log(`ROMs copied: ${copiedRomCount}`);
  log(`Images copied: ${copiedImageCount}`);
  log(`Skipped (ROM missing): ${skippedNoRom}`);
  log(`Skipped (no image found): ${skippedNoImage}`);
  log(`Unknown systems mapped: ${unknownSystemCount}`);
  log(`Output folder: ${outputRoot}`);
  log("=====================================\n");
}

// ------------------------------
// 6. Entry point
// ------------------------------
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--gamelist") || args.includes("-g")) {
    // Chế độ chỉ tạo gamelist từ thư mục batocera_roms mặc định
    const batoceraRomsPath = path.join(process.cwd(), "batocera_roms");
    if (!fs.existsSync(batoceraRomsPath)) {
      console.error(
        `Không tìm thấy thư mục batocera_roms tại: ${batoceraRomsPath}`,
      );
      process.exit(1);
    }
    await generateGamelist(batoceraRomsPath);
    return;
  }

  // Chế độ export từ RetroArch
  if (args.length === 0) {
    console.error("Usage:");
    console.error("  Export favorites: npm start -- /path/to/retroarch");
    console.error("  Generate gamelist: npm start -- --gamelist");
    process.exit(1);
  }

  const retroarchPath = args[0];
  const absolutePath = path.resolve(retroarchPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`RetroArch folder not found: ${absolutePath}`);
    process.exit(1);
  }

  await exportFavorites(absolutePath);
}
// ... (phần import và các hàm log, findImageFile, getSystemFolder giữ nguyên)

// ------------------------------
// Hàm tạo gamelist.xml cho thư mục batocera_roms
// ------------------------------
async function generateGamelist(batoceraRomsPath: string) {
  const romsRoot = path.join(batoceraRomsPath, "roms");
  if (!fs.existsSync(romsRoot)) {
    log(`Không tìm thấy thư mục roms tại: ${romsRoot}`, "ERROR");
    return;
  }

  // Duyệt các thư mục con trong roms (mỗi thư mục là một hệ máy)
  const systemDirs = await fs.readdir(romsRoot);
  let totalGames = 0;
  let totalImages = 0;

  for (const system of systemDirs) {
    const systemPath = path.join(romsRoot, system);
    const stat = await fs.stat(systemPath);
    if (!stat.isDirectory()) continue;

    const imagesPath = path.join(systemPath, "images");
    const hasImages = fs.existsSync(imagesPath);

    // Lấy danh sách file ROM (bỏ qua thư mục images và các file không phải ROM)
    const files = await fs.readdir(systemPath);
    const romFiles = files.filter((file) => {
      const filePath = path.join(systemPath, file);
      // Bỏ qua thư mục images và các file ẩn
      if (fs.statSync(filePath).isDirectory()) return false;
      // Có thể mở rộng danh sách extension
      const ext = path.extname(file).toLowerCase();
      const romExtensions = [
        ".nes",
        ".sfc",
        ".smd",
        ".gen",
        ".zip",
        ".iso",
        ".bin",
        ".gba",
        ".gb",
        ".gbc",
        ".nds",
        ".n64",
        ".z64",
        ".v64",
        ".7z",
        ".cue",
        ".mdf",
        ".pbp",
        ".chd",
        ".wbfs",
        ".iso",
        ".cso",
        ".elf",
        ".prx",
      ];
      return romExtensions.includes(ext);
    });

    if (romFiles.length === 0) continue;

    // Tạo nội dung gamelist.xml
    let xmlContent = '<?xml version="1.0"?>\n<gameList>\n';
    let gameCount = 0;
    let imageCount = 0;

    for (const romFile of romFiles) {
      const romBaseName = path.basename(romFile, path.extname(romFile));
      let imageFound = false;
      let imagePathRelative = "";

      if (hasImages) {
        // Tìm file ảnh với các extension khả dụng
        const imageExtensions = [".png", ".jpg", ".jpeg"];
        for (const ext of imageExtensions) {
          const candidate = path.join(imagesPath, `${romBaseName}${ext}`);
          if (fs.existsSync(candidate)) {
            imageFound = true;
            imagePathRelative = `./images/${romBaseName}${ext}`;
            break;
          }
        }
      }

      xmlContent += `  <game>\n`;
      xmlContent += `    <path>./${romFile}</path>\n`;
      if (imageFound) {
        xmlContent += `    <td>${imagePathRelative}</image>\n`;
        imageCount++;
      }
      xmlContent += `  </game>\n`;
      gameCount++;
    }

    xmlContent += "</gameList>";
    const gamelistPath = path.join(systemPath, "gamelist.xml");
    await fs.writeFile(gamelistPath, xmlContent, "utf8");
    log(
      `[${system}] Đã tạo gamelist.xml với ${gameCount} games, ${imageCount} có ảnh.`,
    );
    totalGames += gameCount;
    totalImages += imageCount;
  }

  log(
    `\nTổng cộng: ${totalGames} games, ${totalImages} ảnh được liên kết trong gamelist.xml`,
  );
}
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
