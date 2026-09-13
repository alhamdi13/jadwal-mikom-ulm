import cron from 'node-cron';
import { config } from './config.js';
import {
  getFormattedDate,
  getScheduleForDate,
  getLecturersSchedulesForDate
} from './dataService.js';
import {
  formatGroupScheduleMessage,
  formatLecturerDirectMessage
} from './messageFormatter.js';

let cronTask = null;

/**
 * Inisialisasi cron scheduler untuk broadcast pagi hari
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 */
export function initScheduler(sock) {
  const { scheduler } = config;

  if (!scheduler.enableMorningBroadcast) {
    console.log('[Scheduler] Broadcast pagi hari dinonaktifkan di konfigurasi.');
    return;
  }

  const cronPattern = scheduler.morningBroadcastCron || '30 6 * * *';
  console.log(`[Scheduler] Mengaktifkan cron broadcast pagi MIKOM ULM: "${cronPattern}" (Zona Waktu: ${config.timezone || 'Asia/Jakarta'})`);

  if (cronTask) {
    cronTask.stop();
  }

  cronTask = cron.schedule(
    cronPattern,
    async () => {
      console.log(`[Scheduler] Menjalankan broadcast otomatis pagi hari: ${new Date().toLocaleString()}`);
      try {
        await executeMorningBroadcast(sock);
      } catch (err) {
        console.error('[Scheduler] Error saat broadcast pagi:', err);
      }
    },
    {
      scheduled: true,
      timezone: config.timezone || 'Asia/Jakarta'
    }
  );
}

/**
 * Eksekusi pengiriman pesan broadcast ke Grup dan Dosen
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string|null} [targetGroupOverride]
 */
export async function executeMorningBroadcast(sock, targetGroupOverride = null) {
  const formattedDate = getFormattedDate(0);
  console.log(`[Broadcast MIKOM ULM] Memulai broadcast untuk tanggal: ${formattedDate}`);

  // 1. Ambil data jadwal hari ini (mengecek apakah hari ini ada kuliah, dan apakah Online/Offline)
  const scheduleData = await getScheduleForDate(0);

  if (!scheduleData.schedules || scheduleData.schedules.length === 0) {
    console.log(`[Broadcast MIKOM ULM] Hari ini (${formattedDate}) tidak ada jadwal perkuliahan. Broadcast otomatis dilewati.`);
    return;
  }

  // 2. Kirim Broadcast ke WhatsApp Group (WAG) Mahasiswa
  if (config.scheduler.enableGroupBroadcast) {
    const groupMessage = formatGroupScheduleMessage(scheduleData, formattedDate);
    
    let targetGroups = config.targetGroups || [];
    if (targetGroupOverride) {
      targetGroups = [{ id: targetGroupOverride, name: 'Target Manual' }];
    }

    for (const group of targetGroups) {
      if (!group.id || group.id.includes('000000000000')) {
        console.warn(`[Broadcast WAG] Melewati grup "${group.name}" karena ID belum diset (${group.id})`);
        continue;
      }

      try {
        await sock.sendMessage(group.id, { text: groupMessage });
        console.log(`[Broadcast WAG] Berhasil kirim ke grup: ${group.name} (${group.id})`);
      } catch (err) {
        console.error(`[Broadcast WAG] Gagal mengirim ke grup ${group.name}:`, err.message);
      }
    }
  }

  // 3. Kirim Pesan Japri ke Dosen Pengampu Hari Ini
  if (config.scheduler.enableLecturerDirectMessage) {
    const lecturersToday = await getLecturersSchedulesForDate(0);
    console.log(`[Broadcast Dosen] Ditemukan ${lecturersToday.length} dosen yang mengajar hari ini.`);

    for (const item of lecturersToday) {
      const { dosen } = item;
      if (!dosen.no_hp) continue;

      const lecturerJid = `${dosen.no_hp}@s.whatsapp.net`;
      const lecturerMsg = formatLecturerDirectMessage(item, formattedDate);

      try {
        await sock.sendMessage(lecturerJid, { text: lecturerMsg });
        console.log(`[Broadcast Dosen] Berhasil kirim ke Dosen: ${dosen.nama} (${dosen.no_hp})`);
      } catch (err) {
        console.error(`[Broadcast Dosen] Gagal mengirim ke Dosen ${dosen.nama} (${dosen.no_hp}):`, err.message);
      }
    }
  }

  console.log(`[Broadcast MIKOM ULM] Selesai memproses broadcast pagi hari.`);
}
