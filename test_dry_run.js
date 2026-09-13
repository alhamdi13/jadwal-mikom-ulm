/**
 * Skrip Uji Coba Mandiri (Dry-Run Test) Lengkap untuk MIKOM FISIP ULM Angkatan 2026
 * Menguji seluruh tier pengingat:
 * 1. H-1 Sore (17:00 WITA) - WAG + Japri Dosen
 * 2. Pagi Hari H (05:00 WITA) - WAG + Japri Dosen
 * 3. H-30 Menit - Pengingat Spesifik Per-Mata Kuliah ke WAG
 */

import {
  getFormattedDate,
  getScheduleForDate,
  getScheduleByDayName,
  getLecturersSchedulesForDate,
  searchSchedules
} from './src/dataService.js';
import {
  formatGroupScheduleMessage,
  formatGeneralDaySchedule,
  formatLecturerDirectMessage,
  formatHMinus1GroupMessage,
  formatHMinus1LecturerMessage,
  formatCourseReminderMessage,
  formatZoomSearchResult
} from './src/messageFormatter.js';
import {
  executeMorningBroadcast,
  executeHMinus1Broadcast,
  executeCourseReminderBroadcast
} from './src/scheduler.js';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 UJI COBA SISTEM MULTI-TIER PENGINGAT JADWAL MIKOM FISIP ULM');
  console.log('================================================================\n');

  // Test 1: Jadwal Jum'at 11 Sept 2026 (ONLINE / Zoom) - Pagi Hari H
  console.log('🔹 [Test 1] Format Pesan Pagi Hari H (Jum\'at 11 Sept 2026 - ONLINE):');
  const jumatOnlineData = await getScheduleForDate('2026-09-11');
  const msgJumatOnline = formatGroupScheduleMessage(jumatOnlineData, 'Jum\'at, 11 September 2026');
  console.log(msgJumatOnline);
  console.log('----------------------------------------------------------------\n');
  if (!msgJumatOnline.includes('ONLINE') || !msgJumatOnline.includes('Zoom Meeting')) {
    throw new Error('❌ Test 1 Gagal: 11 Sept harus berstatus ONLINE (Zoom Meeting)!');
  }

  // Test 2: Pengingat H-1 Sore Hari ke WAG & Japri Dosen (Kamis Sore 10 Sept 2026)
  console.log('🔹 [Test 2] Format Pengingat H-1 Sore (Kamis Sore untuk Kuliah Jum\'at 11 Sept):');
  const msgH1WAG = formatHMinus1GroupMessage(jumatOnlineData, 'Jum\'at, 11 September 2026');
  console.log(msgH1WAG);
  console.log('----------------------------------------------------------------\n');
  if (!msgH1WAG.includes('PENGINGAT KULIAH BESOK (H-1)')) {
    throw new Error('❌ Test 2 Gagal: Pesan H-1 WAG tidak sesuai format!');
  }

  console.log('🔹 [Test 2b] Japri Konfirmasi H-1 Sore ke Dosen Pengampu:');
  const lecturersTomorrow = await getLecturersSchedulesForDate('2026-09-11');
  for (const item of lecturersTomorrow) {
    const dosenH1Msg = formatHMinus1LecturerMessage(item, 'Jum\'at, 11 September 2026');
    console.log(`📱 [Konfirmasi H-1 ke: ${item.dosen.nama} | +${item.dosen.no_hp}]`);
    console.log(dosenH1Msg);
    console.log('----------------------------------------------------------------');
  }

  // Test 3: Pengingat H-30 Menit Per-Mata Kuliah (Single Course Card)
  console.log('\n🔹 [Test 3] Pengingat H-30 Menit Setiap Sesi Kuliah Jum\'at:');
  for (let i = 0; i < jumatOnlineData.schedules.length; i++) {
    const course = jumatOnlineData.schedules[i];
    const courseMsg = formatCourseReminderMessage(course, jumatOnlineData, 'Jum\'at, 11 September 2026');
    console.log(`🔔 [Sesi ${i + 1} - 30 Menit Sebelum ${course.jam_mulai} WITA]`);
    console.log(courseMsg);
    console.log('----------------------------------------------------------------');
  }

  // Test 4: Hari Libur / Tidak Ada Jadwal (Minggu, 13 Sept 2026)
  console.log('\n🔹 [Test 4] Verifikasi Hari Tanpa Kuliah (Minggu, 13 Sept 2026):');
  const holidayData = await getScheduleForDate('2026-09-13');
  const msgHoliday = formatGroupScheduleMessage(holidayData, 'Minggu, 13 September 2026');
  console.log(msgHoliday);
  console.log('----------------------------------------------------------------\n');

  // Test 5: Simulasi Mock Execution untuk Semua Mode Broadcast
  console.log('🔹 [Test 5] Simulasi Mock Execution Seluruh Mode Broadcast:');
  const sentMsgs = [];
  const mockSock = {
    sendMessage: async (jid, content) => {
      sentMsgs.push({ jid, content });
      return { key: { id: 'MOCK_ID_' + Date.now() } };
    }
  };

  // Test 5a: Morning Broadcast
  await executeMorningBroadcast(mockSock, '120363427843779304@g.us');
  // Test 5b: H-1 Broadcast
  await executeHMinus1Broadcast(mockSock, '120363427843779304@g.us');
  // Test 5c: Course Reminder Broadcast (Spesifik Sesi 0)
  await executeCourseReminderBroadcast(mockSock, 0, '120363427843779304@g.us');

  console.log(`   Total pesan yang disimulasikan: ${sentMsgs.length} pesan.`);
  console.log('   ✅ Seluruh simulasi mode siaran berhasil dijalankan!\n');

  console.log('================================================================');
  console.log('🎉 SEMUA PENGUJIAN SISTEM PENGINGAT BERHASIL DENGAN SEMPURNA! 🚀');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('\n❌ Terjadi kesalahan saat pengujian:', err);
  process.exit(1);
});
