process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { config, rootDir } from './src/config.js';
import {
  executeMorningBroadcast,
  executeHMinus1Broadcast,
  executeCourseReminderBroadcast
} from './src/scheduler.js';

const sessionDir = path.resolve(rootDir, process.env.BOT_SESSION_DIR || './session_auth');

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// 1. Restore session dari GitHub Secrets (Environment Variable)
if (process.env.SESSION_DATA_BASE64) {
  const credsPath = path.join(sessionDir, 'creds.json');
  try {
    const rawSecret = process.env.SESSION_DATA_BASE64.trim();
    const decodedCreds = Buffer.from(rawSecret, 'base64').toString('utf-8');
    fs.writeFileSync(credsPath, decodedCreds, 'utf-8');
    console.log('🔑 [Auth] Berhasil memuat sesi WhatsApp dari SESSION_DATA_BASE64.');
  } catch (err) {
    console.error('❌ [Auth] Gagal mendekode SESSION_DATA_BASE64:', err.message);
  }
}

// Ambil mode siaran dari argumen CLI (morning | h_minus_1 | course_reminder)
const broadcastMode = (process.argv[2] || 'morning').toLowerCase();
const courseIndexArg = process.argv[3] !== undefined && process.argv[3] !== '' ? parseInt(process.argv[3], 10) : null;

// Cek batas toleransi waktu eksekusi (Anti-Stale Guard untuk GitHub Actions)
function checkExecutionTimeWindow() {
  const isManualRun = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' || !process.env.GITHUB_ACTIONS;
  if (isManualRun) return true; // Manual trigger selalu diizinkan

  const now = new Date();
  const currentHourWITA = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Makassar', hour12: false, hour: '2-digit' }), 10);

  if (broadcastMode === 'h_minus_1') {
    // Siaran H-1 sore idealnya berjalan antara jam 16:00 - 19:30 WITA
    if (currentHourWITA >= 20 || currentHourWITA < 14) {
      console.warn(`⚠️ [Anti-Stale Guard] Siaran H-1 Sore dibatalkan otomatis karena waktu saat ini (${currentHourWITA}:00 WITA) melewati batas waktu wajar sore hari (maksimal 19:30 WITA). Mencegah pengiriman pesan terlambat akibat antrean runner GitHub.`);
      return false;
    }
  } else if (broadcastMode === 'morning') {
    // Siaran pagi idealnya berjalan antara jam 04:30 - 09:30 WITA
    if (currentHourWITA >= 10 || currentHourWITA < 3) {
      console.warn(`⚠️ [Anti-Stale Guard] Siaran Pagi dibatalkan otomatis karena waktu saat ini (${currentHourWITA}:00 WITA) melewati batas wajar pagi.`);
      return false;
    }
  }

  return true;
}

async function runScheduledBroadcast() {
  console.log('====================================================');
  console.log(`⏰ MENJALANKAN SIARAN JADWAL KULIAH [MODE: ${broadcastMode.toUpperCase()}]`);
  console.log(`📍 Target Grup : ${config.targetGroups?.[0]?.name || 'Belum diatur'} (${config.targetGroups?.[0]?.id || '-'})`);
  console.log('====================================================');

  if (!checkExecutionTimeWindow()) {
    console.log('🛑 Proses siaran dihentikan secara aman oleh Anti-Stale Guard.');
    return;
  }

  const credsPath = path.join(sessionDir, 'creds.json');
  if (!fs.existsSync(credsPath)) {
    throw new Error('File creds.json tidak ditemukan. Pastikan GitHub Secret "SESSION_DATA_BASE64" sudah diisi dengan benar.');
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  let version = [2, 3000, 1015901307];
  try {
    const vInfo = await fetchLatestBaileysVersion();
    if (vInfo && vInfo.version) version = vInfo.version;
  } catch (e) {}

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.macOS('Desktop'),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  return new Promise((resolve, reject) => {
    let isCompleted = false;

    // Timeout pengaman 2 menit
    const timeout = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        try { sock.end(undefined); } catch (e) {}
        reject(new Error('Koneksi timeout (2 menit) saat mencoba menghubungi server WhatsApp.'));
      }
    }, 120000);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        clearTimeout(timeout);
        console.log('✅ WhatsApp terhubung sukses! Memulai proses pengiriman pesan...');

        try {
          // Beri jeda 3 detik agar socket stabil
          await new Promise(r => setTimeout(r, 3000));

          if (broadcastMode === 'h_minus_1') {
            await executeHMinus1Broadcast(sock);
          } else if (broadcastMode === 'course_reminder') {
            await executeCourseReminderBroadcast(sock, courseIndexArg);
          } else {
            // Default: 'morning'
            await executeMorningBroadcast(sock);
          }

          console.log(`\n🎉 Seluruh tugas siaran [${broadcastMode.toUpperCase()}] berhasil diselesaikan!`);

          // Beri jeda 4 detik sebelum socket ditutup secara aman
          await new Promise(r => setTimeout(r, 4000));
          
          isCompleted = true;
          try { sock.end(undefined); } catch (e) {}
          resolve();
        } catch (err) {
          isCompleted = true;
          try { sock.end(undefined); } catch (e) {}
          reject(err);
        }
      } else if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`[WhatsApp] Status koneksi: Ditutup (${statusCode || 'Unknown'})`);

        if (statusCode === DisconnectReason.loggedOut) {
          isCompleted = true;
          clearTimeout(timeout);
          reject(new Error('Sesi WhatsApp telah logout. Silakan buat kode SESSION_DATA_BASE64 baru.'));
        }
      }
    });
  });
}

runScheduledBroadcast()
  .then(() => {
    console.log('🏁 Broadcast Runner selesai dengan sukses.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Gagal menjalankan broadcast:', err.message);
    process.exit(1);
  });
