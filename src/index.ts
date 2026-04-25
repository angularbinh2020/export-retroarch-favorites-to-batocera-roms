import fs from "fs-extra";
import path from "path";

// ------------------------------
// 1. Mapping db_name -> Batocera system folder
// ------------------------------
const DBNAME_TO_SYSTEM: Record<string, string> = {
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

  "Sony - PlayStation.lpl": "psx",
  "Sony - PlayStation": "psx",
  "Sony - PlayStation 2.lpl": "ps2",
  "Sony - PlayStation 2": "ps2",
  "Sony - PlayStation Portable.lpl": "psp",
  "Sony - PlayStation Portable": "psp",

  "Atari - 2600.lpl": "atari2600",
  "Atari - 2600": "atari2600",
  "Atari - 5200.lpl": "atari5200",
  "Atari - 5200": "atari5200",
  "Atari - 7800.lpl": "atari7800",
  "Atari - 7800": "atari7800",
  "Atari - Lynx.lpl": "lynx",
  "Atari - Lynx": "lynx",

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
// 2. Logging
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
// 3. Tìm ảnh trong một thư mục con cụ thể của thumbnails
// ------------------------------
function findImageInFolder(
  thumbBaseDir: string, // thư mục gốc thumbnails của hệ (vd: .../thumbnails/Nintendo - Super Nintendo Entertainment System)
  subFolder: string, // "Named_Boxarts", "Named_Snaps", "Named_Titles"
  label: string,
): string | null {
  const searchDir = path.join(thumbBaseDir, subFolder);
  if (!fs.existsSync(searchDir)) return null;

  const extensions = [".png", ".jpg", ".jpeg"];
  for (const ext of extensions) {
    const candidate = path.join(searchDir, `${label}${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

// ------------------------------
// 4. Lấy system folder từ db_name hoặc core_name
// ------------------------------
function getSystemFolder(dbName?: string, coreName?: string): string {
  if (dbName) {
    if (DBNAME_TO_SYSTEM[dbName]) return DBNAME_TO_SYSTEM[dbName];
    const withoutExt = dbName.replace(/\.lpl$/i, "");
    if (DBNAME_TO_SYSTEM[withoutExt]) return DBNAME_TO_SYSTEM[withoutExt];
  }
  if (coreName && CORE_TO_SYSTEM[coreName]) return CORE_TO_SYSTEM[coreName];
  return "unknown";
}

// ------------------------------
// 5. Export favorites từ RetroArch
// ------------------------------
async function exportFavorites(retroarchPath: string) {
  const playlistPath = path.join(retroarchPath, "content_favorites.lpl");
  const thumbnailsPath = path.join(retroarchPath, "thumbnails");
  const outputRoot = path.join(process.cwd(), "batocera_roms");

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

  // Định nghĩa 3 loại ảnh cần lấy
  const imageTypes = [
    { suffix: "image", folder: "Named_Boxarts" },
    { suffix: "thumbnail", folder: "Named_Snaps" },
    { suffix: "marquee", folder: "Named_Titles" },
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const romPathRaw = item.path;
    const dbName = item.db_name;
    const coreName = item.core_name;
    const label =
      item.label || path.basename(romPathRaw, path.extname(romPathRaw));

    if (!romPathRaw) {
      log(`Item ${i + 1}: missing ROM path, skipped`, "WARN");
      skippedNoRom++;
      continue;
    }

    const romPath = path.isAbsolute(romPathRaw)
      ? romPathRaw
      : path.join(retroarchPath, romPathRaw);

    if (!fs.existsSync(romPath)) {
      log(`Item ${i + 1}: ROM not found: ${romPath}`, "WARN");
      skippedNoRom++;
      continue;
    }

    const systemFolder = getSystemFolder(dbName, coreName);
    if (systemFolder === "unknown") {
      unknownSystemCount++;
      log(
        `Item ${i + 1}: Unknown system from db_name="${dbName}" core_name="${coreName}" → mapping to "unknown"`,
        "WARN",
      );
    }

    const romDestDir = path.join(outputRoot, "roms", systemFolder);
    const imageDestDir = path.join(romDestDir, "images");
    await fs.ensureDir(romDestDir);
    await fs.ensureDir(imageDestDir);

    const romFileName = path.basename(romPath);
    const romBaseName = path.basename(romPath, path.extname(romPath));
    const destRomPath = path.join(romDestDir, romFileName);

    // Copy ROM nếu chưa có
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

    // Xác định thư mục thumbnails của hệ này
    const thumbSysDir = path.join(thumbnailsPath, dbName.replace(".lpl", ""));
    let anyImageCopied = false;

    // Duyệt qua từng loại ảnh
    for (const { suffix, folder } of imageTypes) {
      const sourcePath = findImageInFolder(thumbSysDir, folder, label);
      if (sourcePath) {
        const imageExt = path.extname(sourcePath);
        const destImageName = `${romBaseName} - ${suffix}${imageExt}`;
        const destImagePath = path.join(imageDestDir, destImageName);
        try {
          await fs.copy(sourcePath, destImagePath, { overwrite: true });
          log(`Copied ${folder} → images/${destImageName}`);
          copiedImageCount++;
          anyImageCopied = true;
        } catch (err) {
          log(`Failed to copy ${folder} for "${label}": ${err}`, "ERROR");
        }
      }
    }

    if (!anyImageCopied) {
      log(`No image found for label "${label}" (ROM: ${romFileName})`, "WARN");
      skippedNoImage++;
    }
  }

  log("\n========== EXPORT SUMMARY ==========");
  log(`Total items in playlist: ${items.length}`);
  log(`ROMs copied: ${copiedRomCount}`);
  log(`Images copied (total): ${copiedImageCount}`);
  log(`Skipped (ROM missing): ${skippedNoRom}`);
  log(`Skipped (no image at all): ${skippedNoImage}`);
  log(`Unknown systems mapped: ${unknownSystemCount}`);
  log(`Output folder: ${outputRoot}`);
  log("=====================================\n");
}

// ------------------------------
// 6. Tạo gamelist.xml cho thư mục batocera_roms
// ------------------------------
async function generateGamelist(batoceraRomsPath: string) {
  const romsRoot = path.join(batoceraRomsPath, "roms");
  if (!fs.existsSync(romsRoot)) {
    log(`Không tìm thấy thư mục roms tại: ${romsRoot}`, "ERROR");
    return;
  }

  const systemDirs = await fs.readdir(romsRoot);
  let totalGames = 0;
  let totalImages = 0;

  // Các hậu tố ảnh và thẻ XML tương ứng
  const imageTags = [
    { suffix: "image", xmlTag: "image" },
    { suffix: "thumbnail", xmlTag: "thumbnail" },
    { suffix: "marquee", xmlTag: "marquee" },
  ];

  for (const system of systemDirs) {
    const systemPath = path.join(romsRoot, system);
    const stat = await fs.stat(systemPath);
    if (!stat.isDirectory()) continue;

    const imagesPath = path.join(systemPath, "images");
    const hasImages = fs.existsSync(imagesPath);

    const files = await fs.readdir(systemPath);
    const romFiles = files.filter((file) => {
      const filePath = path.join(systemPath, file);
      if (fs.statSync(filePath).isDirectory()) return false;
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
        ".cso",
        ".elf",
        ".prx",
      ];
      return romExtensions.includes(ext);
    });

    if (romFiles.length === 0) continue;

    let xmlContent = '<?xml version="1.0"?>\n<gameList>\n';
    let gameCount = 0;
    let imageCount = 0;

    for (const romFile of romFiles) {
      const romBaseName = path.basename(romFile, path.extname(romFile));
      xmlContent += `  <game>\n`;
      xmlContent += `    <path>./${romFile}</path>\n`;

      if (hasImages) {
        for (const { suffix, xmlTag } of imageTags) {
          // Tìm file ảnh với các đuôi mở rộng
          const extensions = [".png", ".jpg", ".jpeg"];
          let found = false;
          for (const ext of extensions) {
            const candidate = path.join(
              imagesPath,
              `${romBaseName} - ${suffix}${ext}`,
            );
            if (fs.existsSync(candidate)) {
              xmlContent += `    <${xmlTag}>./images/${romBaseName} - ${suffix}${ext}</${xmlTag}>\n`;
              found = true;
              imageCount++;
              break; // chỉ lấy một ảnh cho mỗi loại
            }
          }
        }
      }

      xmlContent += `  </game>\n`;
      gameCount++;
    }

    xmlContent += "</gameList>";
    const gamelistPath = path.join(systemPath, "gamelist.xml");
    await fs.writeFile(gamelistPath, xmlContent, "utf8");
    log(
      `[${system}] Đã tạo gamelist.xml với ${gameCount} games, ${imageCount} ảnh được liên kết.`,
    );
    totalGames += gameCount;
    totalImages += imageCount;
  }

  log(
    `\nTổng cộng: ${totalGames} games, ${totalImages} ảnh được liên kết trong gamelist.xml`,
  );
}

// ------------------------------
// 7. Entry point
// ------------------------------
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--gamelist") || args.includes("-g")) {
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

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
