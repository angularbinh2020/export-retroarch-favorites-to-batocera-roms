import fs from 'fs-extra';
import path from 'path';

// ------------------------------
// 1. Mapping core name -> Batocera system folder
// ------------------------------
const CORE_TO_SYSTEM: Record<string, string> = {
  // Nintendo
  'Nintendo - Nintendo Entertainment System': 'nes',
  'Nintendo - Super Nintendo Entertainment System': 'snes',
  'Nintendo - Nintendo 64': 'n64',
  'Nintendo - Game Boy': 'gb',
  'Nintendo - Game Boy Color': 'gbc',
  'Nintendo - Game Boy Advance': 'gba',
  'Nintendo - Nintendo DS': 'nds',
  'Nintendo - Nintendo 3DS': '3ds',

  // Sega
  'Sega - Master System': 'mastersystem',
  'Sega - Mega Drive - Genesis': 'megadrive',
  'Sega - Game Gear': 'gamegear',
  'Sega - Saturn': 'saturn',
  'Sega - Dreamcast': 'dreamcast',

  // Sony
  'Sony - PlayStation': 'psx',
  'Sony - PlayStation 2': 'ps2',
  'Sony - PlayStation Portable': 'psp',

  // Atari
  'Atari - 2600': 'atari2600',
  'Atari - 5200': 'atari5200',
  'Atari - 7800': 'atari7800',
  'Atari - Lynx': 'lynx',

  // Other
  'MAME': 'mame',
  'Arcade': 'arcade',
  'Neo Geo': 'neogeo',
  'PC Engine - TurboGrafx 16': 'pcengine',
  'Commodore - Amiga': 'amiga',
  'ZX Spectrum': 'zxspectrum',
};

// ------------------------------
// 2. Helper: log both console and file
// ------------------------------
let logStream: fs.WriteStream;

function initLogFile(outputDir: string) {
  const logPath = path.join(outputDir, 'export.log');
  fs.ensureDirSync(outputDir);
  logStream = fs.createWriteStream(logPath, { flags: 'a' });
  log(`Log file created at ${logPath}`);
}

function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [${level}] ${message}`;
  console.log(formatted);
  if (logStream) logStream.write(formatted + '\n');
}

// ------------------------------
// 3. Find image file (boxart or title) from thumbnails folder
// ------------------------------
function findImageFile(thumbnailsDir: string, label: string): string | null {
  const possibleDirs = ['Named_Boxarts', 'Named_Titles'];
  const extensions = ['.png', '.jpg', '.jpeg'];

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
// 4. Main export function
// ------------------------------
async function exportFavorites(retroarchPath: string) {
  const playlistPath = path.join(retroarchPath, 'content_favorites.lpl');
  const thumbnailsPath = path.join(retroarchPath, 'thumbnails');
  const outputRoot = path.join(process.cwd(), 'batocera_roms');

  // Validate input
  if (!fs.existsSync(playlistPath)) {
    log(`Playlist file not found: ${playlistPath}`, 'ERROR');
    process.exit(1);
  }
  if (!fs.existsSync(thumbnailsPath)) {
    log(`Thumbnails folder not found: ${thumbnailsPath}`, 'ERROR');
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
    log(`Failed to parse playlist JSON: ${err}`, 'ERROR');
    process.exit(1);
  }

  if (!playlist.items || !Array.isArray(playlist.items)) {
    log('Invalid playlist structure: missing "items" array', 'ERROR');
    process.exit(1);
  }

  const items = playlist.items;
  log(`Found ${items.length} items in favorites playlist.`);

  let copiedRomCount = 0;
  let copiedImageCount = 0;
  let skippedNoRom = 0;
  let skippedNoImage = 0;
  let unknownSystemCount = 0;

  // Keep track of already copied ROMs to avoid duplicate work (by absolute path)
  const processedRoms = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const romPathRaw = item.path;
    const coreName = item.core_name || item.core_path || '';
    const label = item.label || path.basename(romPathRaw, path.extname(romPathRaw));

    if (!romPathRaw) {
      log(`Item ${i + 1}: missing ROM path, skipped`, 'WARN');
      skippedNoRom++;
      continue;
    }

    // Resolve absolute path (in case it's relative)
    const romPath = path.isAbsolute(romPathRaw) ? romPathRaw : path.join(retroarchPath, romPathRaw);

    if (!fs.existsSync(romPath)) {
      log(`Item ${i + 1}: ROM not found: ${romPath}`, 'WARN');
      skippedNoRom++;
      continue;
    }

    // Get system folder from core name
    let systemFolder = CORE_TO_SYSTEM[coreName];
    if (!systemFolder) {
      systemFolder = 'unknown';
      unknownSystemCount++;
      log(`Item ${i + 1}: Unknown core "${coreName}" → mapping to "unknown"`, 'WARN');
    }

    // Destination directories
    const romDestDir = path.join(outputRoot, 'roms', systemFolder);
    const imageDestDir = path.join(romDestDir, 'images');
    await fs.ensureDir(romDestDir);
    await fs.ensureDir(imageDestDir);

    const romFileName = path.basename(romPath);
    const romBaseName = path.basename(romPath, path.extname(romPath));
    const destRomPath = path.join(romDestDir, romFileName);

    // Copy ROM (if not already copied)
    if (!processedRoms.has(romPath)) {
      try {
        await fs.copy(romPath, destRomPath, { overwrite: true });
        log(`Copied ROM: ${romFileName} → ${systemFolder}/`);
        copiedRomCount++;
        processedRoms.add(romPath);
      } catch (err) {
        log(`Failed to copy ROM ${romFileName}: ${err}`, 'ERROR');
      }
    } else {
      log(`ROM already copied (duplicate): ${romFileName}`, 'INFO');
    }

    // Handle image
    const imageSourcePath = findImageFile(thumbnailsPath, label);
    if (imageSourcePath) {
      const imageExt = path.extname(imageSourcePath); // .png, .jpg, ...
      const destImageName = `${romBaseName}${imageExt}`;
      const destImagePath = path.join(imageDestDir, destImageName);
      try {
        await fs.copy(imageSourcePath, destImagePath, { overwrite: true });
        log(`Copied image: ${label} → images/${destImageName}`);
        copiedImageCount++;
      } catch (err) {
        log(`Failed to copy image for "${label}": ${err}`, 'ERROR');
      }
    } else {
      log(`No image found for label "${label}" (ROM: ${romFileName})`, 'WARN');
      skippedNoImage++;
    }
  }

  // Final summary
  log('\n========== EXPORT SUMMARY ==========');
  log(`Total items in playlist: ${items.length}`);
  log(`ROMs copied: ${copiedRomCount}`);
  log(`Images copied: ${copiedImageCount}`);
  log(`Skipped (ROM missing): ${skippedNoRom}`);
  log(`Skipped (no image found): ${skippedNoImage}`);
  log(`Unknown systems mapped: ${unknownSystemCount}`);
  log(`Output folder: ${outputRoot}`);
  log('=====================================\n');
}

// ------------------------------
// 5. Entry point
// ------------------------------
async function main() {
  const retroarchPath = process.argv[2];
  if (!retroarchPath) {
    console.error('Usage: npm start -- /path/to/retroarch/folder');
    console.error('Example: npm start -- "C:\\RetroArch"');
    process.exit(1);
  }

  const absolutePath = path.resolve(retroarchPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`RetroArch folder not found: ${absolutePath}`);
    process.exit(1);
  }

  await exportFavorites(absolutePath);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});