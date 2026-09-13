import cron from 'node-cron';
import { config } from './config.js';
import {
  getFormattedDate,
  getScheduleForDate,
  getLecturersSchedulesForDate
} from './dataService.js';
import {
  formatGroupScheduleMessage,
  formatLecturerDirectMessage,
  formatHMinus1GroupMessage,
  formatHMinus1LecturerMessage,
  formatCourseReminderMessage
} from './messageFormatter.js';

let cronTask = null;

/**
 * Inisialisasi cron scheduler untuk broadcast pagi hari (Daemon mode)
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 */
export function initScheduler(sock) {
  const { scheduler } = config;

  if (!scheduler.enableMorningBroadcast) {
    console.log('[Scheduler] Broadcast pagi hari dinonaktifkan di konfigurasi.');
    return;
  }

  const cronPattern = scheduler.morningBroadcastCron || '0 5 * * *';
  console.log(`[Scheduler] Mengaktifkan cron broadcast pagi MIKOM ULM: "${cronPattern}" (Zona Waktu: ${config.timezone || 'Asia/Makassar'})`);

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
      timezone: config.timezone || 'Asia/Makassar'
    }
  );
}

/**
 * 1. Eksekusi Broadcast Ringkasan Pagi Hari (Hari H jam 05:00 WITA)
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string|null} [targetGroupOverride]
 * @param {Date|number|string} [dateOffsetOrDate=0]
 */
export async function executeMorningBroadcast(sock, targetGroupOverride = null, dateOffsetOrDate = 0) {
  const formattedDate = getFormattedDate(dateOffsetOrDate);
  console.log(`[Broadcast Pagi] Memulai broadcast untuk tanggal: ${formattedDate}`);

  // 1. Ambil data jadwal hari ini
  const scheduleData = await getScheduleForDate(dateOffsetOrDate);

  if (!scheduleData.schedules || scheduleData.schedules.length === 0) {
    console.log(`[Broadcast Pagi] Hari ini (${formattedDate}) tidak ada jadwal perkuliahan. Broadcast otomatis dilewati.`);
    return;
  }

  // 2. Kirim Broadcast ke WhatsApp Group (WAG) Mahasiswa
  if (config.scheduler.enableGroupBroadcast) {
    const groupMessage = formatGroupScheduleMessage(scheduleData, formattedDate);
    await sendToTargetGroups(sock, groupMessage, targetGroupOverride, 'Broadcast Pagi WAG');
  }

  // 3. Kirim Pesan Japri ke Dosen Pengampu Hari Ini
  if (config.scheduler.enableLecturerDirectMessage) {
    const lecturersToday = await getLecturersSchedulesForDate(dateOffsetOrDate);
    console.log(`[Broadcast Dosen Pagi] Ditemukan ${lecturersToday.length} dosen yang mengajar hari ini.`);

    for (const item of lecturersToday) {
      const { dosen } = item;
      if (!dosen.no_hp) continue;

      const lecturerJid = `${dosen.no_hp}@s.whatsapp.net`;
      const lecturerMsg = formatLecturerDirectMessage(item, formattedDate);

      try {
        await sock.sendMessage(lecturerJid, { text: lecturerMsg });
        console.log(`[Broadcast Dosen Pagi] Berhasil kirim ke Dosen: ${dosen.nama} (${dosen.no_hp})`);
      } catch (err) {
        console.error(`[Broadcast Dosen Pagi] Gagal mengirim ke Dosen ${dosen.nama} (${dosen.no_hp}):`, err.message);
      }
    }
  }

  console.log(`[Broadcast Pagi] Selesai memproses broadcast pagi hari.`);
}

/**
 * 2. Eksekusi Broadcast Pengingat H-1 Sore Hari (Kamis/Jumat Sore jam 17:00 WITA)
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string|null} [targetGroupOverride]
 * @param {Date|number|string} [dateOffsetOrDate=1]
 */
export async function executeHMinus1Broadcast(sock, targetGroupOverride = null, dateOffsetOrDate = 1) {
  const formattedTomorrowDate = getFormattedDate(dateOffsetOrDate);
  console.log(`[Broadcast H-1 Sore] Memulai broadcast pengingat H-1 untuk jadwal: ${formattedTomorrowDate}`);

  // 1. Ambil data jadwal esok hari
  const tomorrowScheduleData = await getScheduleForDate(dateOffsetOrDate);

  if (!tomorrowScheduleData.schedules || tomorrowScheduleData.schedules.length === 0) {
    console.log(`[Broadcast H-1 Sore] Besok (${formattedTomorrowDate}) tidak ada jadwal perkuliahan. Broadcast H-1 dilewati.`);
    return;
  }

  // 2. Kirim Pengingat H-1 ke WhatsApp Group (WAG)
  if (config.scheduler.enableGroupBroadcast) {
    const groupMessage = formatHMinus1GroupMessage(tomorrowScheduleData, formattedTomorrowDate);
    await sendToTargetGroups(sock, groupMessage, targetGroupOverride, 'Broadcast H-1 WAG');
  }

  // 3. Kirim Konfirmasi H-1 ke Dosen Pengampu Esok Hari
  if (config.scheduler.enableLecturerDirectMessage) {
    const lecturersTomorrow = await getLecturersSchedulesForDate(dateOffsetOrDate);
    console.log(`[Broadcast Dosen H-1] Ditemukan ${lecturersTomorrow.length} dosen yang mengajar esok hari.`);

    for (const item of lecturersTomorrow) {
      const { dosen } = item;
      if (!dosen.no_hp) continue;

      const lecturerJid = `${dosen.no_hp}@s.whatsapp.net`;
      const lecturerMsg = formatHMinus1LecturerMessage(item, formattedTomorrowDate);

      try {
        await sock.sendMessage(lecturerJid, { text: lecturerMsg });
        console.log(`[Broadcast Dosen H-1] Berhasil kirim konfirmasi ke Dosen: ${dosen.nama} (${dosen.no_hp})`);
      } catch (err) {
        console.error(`[Broadcast Dosen H-1] Gagal mengirim ke Dosen ${dosen.nama} (${dosen.no_hp}):`, err.message);
      }
    }
  }

  console.log(`[Broadcast H-1 Sore] Selesai memproses pengingat H-1.`);
}

/**
 * 3. Eksekusi Pengingat Spesifik Per-Mata Kuliah H-30 Menit Sebelum Kelas Dimulai
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {number|null} [targetCourseIndex]
 * @param {string|null} [targetGroupOverride]
 * @param {Date|number|string} [dateOffsetOrDate=0]
 */
export async function executeCourseReminderBroadcast(sock, targetCourseIndex = null, targetGroupOverride = null, dateOffsetOrDate = 0) {
  const formattedDate = getFormattedDate(dateOffsetOrDate);
  console.log(`[Reminder H-30 Min] Memeriksa jadwal kuliah hari ini: ${formattedDate}`);

  // 1. Ambil jadwal hari ini
  const scheduleData = await getScheduleForDate(dateOffsetOrDate);

  if (!scheduleData.schedules || scheduleData.schedules.length === 0) {
    console.log(`[Reminder H-30 Min] Hari ini (${formattedDate}) tidak ada jadwal perkuliahan. Reminder per-matkul dilewati.`);
    return;
  }

  // 2. Tentukan mata kuliah mana yang diingatkan
  let selectedCourse = null;

  if (targetCourseIndex !== null && !isNaN(targetCourseIndex) && scheduleData.schedules[targetCourseIndex]) {
    selectedCourse = scheduleData.schedules[targetCourseIndex];
    console.log(`[Reminder H-30 Min] Memilih matkul index [${targetCourseIndex}]: ${selectedCourse.mata_kuliah}`);
  } else {
    // Otomatis memilih berdasarkan jam saat ini (WITA / Asia/Makassar)
    const now = new Date();
    const witaTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: config.timezone || 'Asia/Makassar',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    const [nowH, nowM] = witaTimeStr.split(':').map(Number);
    const nowTotalMinutes = nowH * 60 + nowM;

    console.log(`[Reminder H-30 Min] Waktu lokal saat ini: ${witaTimeStr} WITA (${nowTotalMinutes} menit)`);

    // Cari kelas yang jam mulainya paling dekat dengan sekarang (dalam rentang 0-60 menit lagi, atau kelas pertama yang belum lewat)
    let bestMatch = null;
    let minDiff = Infinity;

    for (const course of scheduleData.schedules) {
      const [cH, cM] = course.jam_mulai.replace(':', '.').split('.').map(Number);
      const courseStartMinutes = cH * 60 + cM;
      const diff = courseStartMinutes - nowTotalMinutes;

      // Jika kelas mulai antara -15 menit s/d +60 menit
      if (diff >= -15 && diff <= 60) {
        if (Math.abs(diff - 30) < minDiff) {
          minDiff = Math.abs(diff - 30);
          bestMatch = course;
        }
      }
    }

    selectedCourse = bestMatch || scheduleData.schedules[0];
    console.log(`[Reminder H-30 Min] Matkul terpilih otomatis: ${selectedCourse.mata_kuliah} (Jam: ${selectedCourse.jam_mulai})`);
  }

  if (!selectedCourse) {
    console.log(`[Reminder H-30 Min] Tidak ditemukan mata kuliah yang cocok untuk diingatkan.`);
    return;
  }

  // 3. Format dan kirim pesan ke WAG
  const reminderMsg = formatCourseReminderMessage(selectedCourse, scheduleData, formattedDate);
  await sendToTargetGroups(sock, reminderMsg, targetGroupOverride, `Reminder H-30: ${selectedCourse.mata_kuliah}`);

  console.log(`[Reminder H-30 Min] Selesai mengirim pengingat matkul "${selectedCourse.mata_kuliah}".`);
}

/**
 * Helper pengiriman pesan ke grup target
 */
async function sendToTargetGroups(sock, message, targetGroupOverride, logLabel) {
  let targetGroups = config.targetGroups || [];
  if (targetGroupOverride) {
    targetGroups = [{ id: targetGroupOverride, name: 'Target Manual' }];
  }

  for (const group of targetGroups) {
    if (!group.id || group.id.includes('000000000000')) {
      console.warn(`[${logLabel}] Melewati grup "${group.name}" karena ID belum diset (${group.id})`);
      continue;
    }

    try {
      await sock.sendMessage(group.id, { text: message });
      console.log(`[${logLabel}] Berhasil kirim ke grup: ${group.name} (${group.id})`);
    } catch (err) {
      console.error(`[${logLabel}] Gagal mengirim ke grup ${group.name}:`, err.message);
    }
  }
}
