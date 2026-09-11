import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const configPath = path.join(rootDir, 'config.json');

let config = {
  botName: "SiJadwal - Bot Kuliah & Dosen",
  prefix: "!",
  timezone: "Asia/Jakarta",
  scheduler: {
    enableMorningBroadcast: true,
    morningBroadcastCron: "30 6 * * *",
    enableLecturerDirectMessage: true,
    enableGroupBroadcast: true,
    reminderMinutesBeforeClass: 30,
    enableClassReminder: false
  },
  targetGroups: [],
  dataSource: {
    type: "json",
    jsonFilePath: "./data/jadwal_kuliah.json",
    googleSheetCsvUrl: ""
  },
  adminPhoneNumbers: []
};

if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = { ...config, ...JSON.parse(raw) };
  } catch (err) {
    console.error("[Config] Gagal memuat config.json, menggunakan konfigurasi default:", err);
  }
}

export { config, rootDir };
export default config;
