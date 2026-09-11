// Bypass SSL verification untuk mengatasi network certificate interception di Windows/Antivirus/Proxy
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import readline from 'readline';
import { config, rootDir } from './config.js';
import { handleIncomingMessage } from './commandHandler.js';
import { initScheduler } from './scheduler.js';

const sessionDir = path.resolve(rootDir, process.env.BOT_SESSION_DIR || './session_auth');
const qrHtmlPath = path.join(rootDir, 'qr.html');

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Restore session dari environment variable jika ada (GitHub Actions / Cloud)
if (process.env.SESSION_DATA_BASE64) {
  const credsPath = path.join(sessionDir, 'creds.json');
  if (!fs.existsSync(credsPath)) {
    try {
      const decodedCreds = Buffer.from(process.env.SESSION_DATA_BASE64, 'base64').toString('utf-8');
      fs.writeFileSync(credsPath, decodedCreds, 'utf-8');
      console.log('[Auth] Berhasil memuat sesi WhatsApp dari SESSION_DATA_BASE64.');
    } catch (err) {
      console.error('[Auth] Gagal mendekode SESSION_DATA_BASE64:', err.message);
    }
  }
}

function promptQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

// Helper untuk membuat halaman QR HTML beresolusi tinggi
async function generateQrHtmlPage(qrString) {
  try {
    const qrDataUrl = await QRCode.toDataURL(qrString, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scan QR Code WhatsApp - SiJadwal MIKOM ULM</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #0b0f19;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 36px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .title {
      font-size: 1.35rem;
      font-weight: 800;
      margin-bottom: 8px;
      color: #34d399;
    }
    .subtitle {
      font-size: 0.88rem;
      color: #94a3b8;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .qr-frame {
      background: #ffffff;
      padding: 20px;
      border-radius: 20px;
      display: inline-block;
      margin-bottom: 24px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    }
    .qr-frame img {
      display: block;
      width: 100%;
      max-width: 360px;
      height: auto;
    }
    .steps {
      background: #0f172a;
      padding: 18px 20px;
      border-radius: 14px;
      text-align: left;
      font-size: 0.84rem;
      color: #cbd5e1;
      line-height: 1.6;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .steps ol {
      margin-left: 20px;
    }
    .steps li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">📱 Pindai QR Code WhatsApp</div>
    <div class="subtitle">Arahkan kamera WhatsApp HP Anda ke gambar QR Code di bawah ini untuk menghubungkan bot.</div>

    <div class="qr-frame">
      <img src="${qrDataUrl}" alt="QR Code WhatsApp">
    </div>

    <div class="steps">
      <strong style="color: #38bdf8; display: block; margin-bottom: 6px;">📌 Langkah di WhatsApp HP:</strong>
      <ol>
        <li>Buka WhatsApp di HP Anda.</li>
        <li>Buka <b>Menu Titik Tiga (Android)</b> atau <b>Pengaturan (iPhone)</b>.</li>
        <li>Pilih <b>Perangkat Tertaut</b> > klik <b>Tautkan Perangkat</b>.</li>
        <li>Arahkan kamera HP ke gambar QR Code di atas.</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(qrHtmlPath, htmlContent, 'utf-8');
    return qrHtmlPath;
  } catch (err) {
    console.error('[QR] Gagal membuat file qr.html:', err.message);
    return null;
  }
}

let isPairingRequested = false;
let hasOpenedBrowser = false;

async function startBot() {
  console.log('====================================================');
  console.log(`🤖 Memulai ${config.botName || 'Bot Jadwal Kuliah MIKOM ULM'}...`);
  console.log('====================================================');

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const isRegistered = !!state.creds?.registered;

  const usePairingCode = process.argv.includes('--pairing') || process.argv.includes('-p');
  let targetPhoneNumber = '';

  if (usePairingCode && !isRegistered) {
    console.log('\n📲 MODE PAIRING CODE (Tautkan dengan Nomor Telepon)');
    targetPhoneNumber = await promptQuestion('👉 Masukkan Nomor WhatsApp Anda (contoh: 6285349972513): ');
    targetPhoneNumber = targetPhoneNumber.replace(/[^0-9]/g, '');

    if (!targetPhoneNumber) {
      console.log('❌ Nomor telepon tidak boleh kosong!');
      process.exit(1);
    }
    console.log(`⏳ Menghubungkan ke server WhatsApp untuk nomor +${targetPhoneNumber}...\n`);
  }

  // Versi Baileys
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
    keepAliveIntervalMs: 30000,
    retryRequestDelayMs: 3000,
    syncFullHistory: false
  });

  // Simpan kredensial setiap kali diperbarui
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // 1. Tangani Pairing Code jika diminta
    if (usePairingCode && !isRegistered && qr && !isPairingRequested && targetPhoneNumber) {
      isPairingRequested = true;
      try {
        const pairingCode = await sock.requestPairingCode(targetPhoneNumber);
        const formattedCode = pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode;
        
        console.log('\n====================================================');
        console.log(`🔑 KODE PAIRING WHATSAPP ANDA:  ${formattedCode}`);
        console.log('====================================================');
        console.log('📌 Langkah di WhatsApp HP Anda:');
        console.log('1. Buka WhatsApp > Menu Titik Tiga / Pengaturan.');
        console.log('2. Pilih "Perangkat Tertaut" > "Tautkan Perangkat".');
        console.log('3. Klik tulisan "Tautkan dengan nomor telepon saja" di bawah layar.');
        console.log(`4. Masukkan kode di atas: ${formattedCode}\n`);
      } catch (err) {
        console.error('❌ Gagal meminta pairing code:', err.message);
        isPairingRequested = false;
      }
    }

    // 2. Tampilkan QR Code di Browser dan Terminal
    if (qr && !usePairingCode && !isRegistered) {
      console.log('\n📱 Menyiapkan QR Code kualitas tinggi...');
      
      const htmlPath = await generateQrHtmlPage(qr);

      if (!hasOpenedBrowser && htmlPath) {
        hasOpenedBrowser = true;
        console.log('🌐 Membuka gambar QR Code di browser Anda...');
        exec(`start "" "${htmlPath}"`, (err) => {
          if (err) {
            console.log(`👉 Silakan buka file qr.html di browser: ${htmlPath}`);
          }
        });
      }

      console.log('\n📱 QR Code di terminal:');
      qrcodeTerminal.generate(qr, { small: true });
      console.log('\n💡 Tips: Anda dapat memindai QR Code melalui browser (qr.html) atau terminal.\n');
    }

    // 3. Status Sinkronisasi & Login
    if (update.isNewLogin || update.receivedPendingNotifications) {
      console.log('⏳ HP terdeteksi! Sedang menyelesaikan otentikasi...');
    }

    // 4. Status Terhubung Sukses
    if (connection === 'open') {
      console.log('====================================================');
      console.log('✅ BOT WHATSAPP BERHASIL TERHUBUNG & SIAP DIGUNAKAN!');
      console.log(`📱 Nomor Bot Terhubung: ${sock.user?.id?.split(':')[0] || 'Unknown'}`);
      console.log('====================================================');
      
      if (fs.existsSync(qrHtmlPath)) {
        try { fs.unlinkSync(qrHtmlPath); } catch (e) {}
      }

      initScheduler(sock);
    }

    // 5. Status Terputus
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      
      if (!isLoggedOut) {
        console.log('[WhatsApp] Menghubungkan kembali ke server...');
        setTimeout(() => startBot(), 2500);
      } else {
        console.log('❌ Sesi WhatsApp telah logout dari HP.');
        console.log('👉 Jalankan `npm run reset:session` lalu mulai kembali.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;
    for (const msg of messages) {
      await handleIncomingMessage(sock, msg);
    }
  });

  process.on('SIGINT', () => {
    console.log('\n[Bot] Menutup koneksi secara aman...');
    try { sock.end(undefined); } catch (e) {}
    process.exit(0);
  });
}

startBot().catch((err) => {
  console.error('[Fatal Error] Gagal memulai bot:', err);
});
