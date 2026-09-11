import { config } from './config.js';

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

/**
 * Format pesan jadwal untuk WhatsApp Group (WAG) Mahasiswa
 */
export function formatGroupScheduleMessage(scheduleData, formattedDate) {
  const { kampus, fakultas, program_studi, semester, angkatan, hari, schedules } = scheduleData;
  const prefix = config.prefix || '!';

  let msg = `📢 *JADWAL KULIAH HARI INI* 📢\n`;
  msg += `🏛️ *${program_studi}*\n`;
  msg += `🏫 ${fakultas} - ${kampus}\n`;
  msg += `🎓 ${semester} (Angkatan ${angkatan})\n`;
  msg += `🗓️ *Hari/Tgl:* ${formattedDate}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (!schedules || schedules.length === 0) {
    msg += `🎉 *Tidak ada agenda perkuliahan hari ${hari} ini.* 🎉\n`;
    msg += `Gunakan waktu untuk belajar mandiri / pengerjaan tugas. ✨\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💡 Ketik *${prefix}jadwal besok* untuk mengecek jadwal esok hari.`;
    return msg;
  }

  schedules.forEach((item, index) => {
    const num = NUMBER_EMOJIS[index] || `[${index + 1}]`;
    const isOnline = item.tipe.toLowerCase() === 'online';

    msg += `${num} *${item.mata_kuliah}*\n`;
    msg += `⏰ *Waktu:* ${item.jam_mulai} - ${item.jam_selesai} WITA/WIB\n`;
    
    // Tim Pengajar
    if (item.tim_pengajar && item.tim_pengajar.length > 0) {
      msg += `👥 *Tim Pengajar:*\n`;
      item.tim_pengajar.forEach((d, i) => {
        msg += `   ${i + 1}. ${d.nama}\n`;
      });
    }

    if (isOnline) {
      msg += `📍 *Metode:* 🌐 *ONLINE (Daring)*\n`;
      if (item.zoom?.link) msg += `🔗 *Link Zoom Meeting:*\n${item.zoom.link}\n`;
      if (item.zoom?.meeting_id) msg += `🔑 *Meeting ID:* ${item.zoom.meeting_id}\n`;
      if (item.zoom?.passcode) msg += `🔐 *Passcode:* ${item.zoom.passcode}\n`;
    } else {
      msg += `📍 *Metode:* 🟢 *OFFLINE (Tatap Muka)*\n`;
      msg += `🏢 *Lokasi Ruangan:* Ruang *${item.ruangan || 'G1.103'}*\n`;
    }

    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💡 _Ketik \`${prefix}help\` untuk melihat opsi perintah bot._\n`;
  msg += `_Semoga perkuliahan hari ini berjalan lancar & sukses!_ ✨`;

  return msg;
}

/**
 * Format pesan jadwal untuk hari umum (misal user ketik `!jadwal jumat` atau `!jadwal sabtu`)
 */
export function formatGeneralDaySchedule(generalData, dayName) {
  const { program_studi, fakultas, default_ruangan, default_zoom, schedules } = generalData;
  const prefix = config.prefix || '!';

  let msg = `📅 *INFORMASI MATAKULIAH HARI ${dayName.toUpperCase()}* 📅\n`;
  msg += `🏛️ *${program_studi}* (${fakultas})\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (!schedules || schedules.length === 0) {
    return `❌ Tidak ditemukan mata kuliah untuk hari *${dayName}*. Perkuliahan aktif pada hari **Jum'at** dan **Sabtu**.`;
  }

  schedules.forEach((item, index) => {
    const num = NUMBER_EMOJIS[index] || `[${index + 1}]`;
    msg += `${num} *${item.mata_kuliah}*\n`;
    msg += `⏰ *Waktu:* ${item.jam_mulai} - ${item.jam_selesai} WITA\n`;
    
    if (item.tim_pengajar && item.tim_pengajar.length > 0) {
      msg += `👥 *Tim Pengajar:*\n`;
      item.tim_pengajar.forEach((d, i) => {
        msg += `   ${i + 1}. ${d.nama}\n`;
      });
    }

    msg += `📍 *Ruang Offline:* ${default_ruangan}\n`;
    msg += `🌐 *Link Online:* ${default_zoom?.link || 'Tersedia di Zoom'}\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💡 *Catatan:* Sistem perkuliahan berselang-seling antara minggu Offline (Tatap Muka di ${default_ruangan}) dan Online (Zoom).\n`;
  msg += `Gunakan \`${prefix}jadwal\` atau \`${prefix}jadwal besok\` untuk melihat status spesifik hari ini/besok.`;

  return msg;
}

/**
 * Format pesan pengingat personal ke WhatsApp Dosen (Japri)
 */
export function formatLecturerDirectMessage(lecturerGroup, formattedDate) {
  const { dosen, schedules, kampus, fakultas, program_studi } = lecturerGroup;

  let msg = `Assalamu'alaikum Warahmatullahi Wabarakatuh,\n`;
  msg += `Selamat Pagi Bapak/Ibu *${dosen.nama}* 🙏\n\n`;
  msg += `Mengingatkan kembali jadwal mengajar Anda hari ini di *${program_studi}* (${fakultas} - ${kampus}):\n`;
  msg += `🗓️ *Hari/Tgl:* ${formattedDate}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  schedules.forEach((item, index) => {
    const isOnline = item.tipe.toLowerCase() === 'online';
    const num = schedules.length > 1 ? `${NUMBER_EMOJIS[index] || (index + 1) + '.'} ` : '';

    msg += `${num}📚 *${item.mata_kuliah}*\n`;
    msg += `⏰ *Waktu:* ${item.jam_mulai} - ${item.jam_selesai} WITA/WIB\n`;
    
    // Rekan Tim Pengajar
    if (item.tim_pengajar && item.tim_pengajar.length > 1) {
      const rekan = item.tim_pengajar.filter(d => !d.nama.includes(dosen.nama));
      if (rekan.length > 0) {
        msg += `👥 *Rekan Tim Pengajar:* ${rekan.map(r => r.nama).join(', ')}\n`;
      }
    }

    if (isOnline) {
      msg += `📍 *Metode Perkuliahan:* 🌐 *ONLINE (Daring)*\n`;
      if (item.zoom?.link) msg += `🔗 *Link Zoom Meeting:*\n${item.zoom.link}\n`;
      if (item.zoom?.meeting_id) msg += `🔑 *Meeting ID:* ${item.zoom.meeting_id}\n`;
      if (item.zoom?.passcode) msg += `🔐 *Passcode:* ${item.zoom.passcode}\n`;
    } else {
      msg += `📍 *Metode Perkuliahan:* 🟢 *OFFLINE (Tatap Muka)*\n`;
      msg += `🏢 *Ruangan Kelas:* Ruang *${item.ruangan || 'G1.103'}*\n`;
    }

    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Terima kasih banyak atas dedikasi Bapak/Ibu dalam perkuliahan hari ini. Semoga senantiasa diberikan kelancaran & kesehatan. 🤲\n\n`;
  msg += `_Pesan otomatis dari Sistem Informasi Akademik MIKOM FISIP ULM_`;

  return msg;
}

/**
 * Format pesan bantuan / menu bot
 */
export function formatHelpMessage(prefix = '!') {
  return `🤖 *MENU BOT JADWAL KULIAH MIKOM ULM* 🤖
━━━━━━━━━━━━━━━━━━━━
Perintah yang tersedia:

📌 *Cek Jadwal Kuliah:*
• \`${prefix}jadwal\` 👉 Jadwal kuliah hari ini (otomatis Offline/Online).
• \`${prefix}jadwal besok\` 👉 Jadwal kuliah esok hari.
• \`${prefix}jadwal jumat\` / \`${prefix}jadwal sabtu\` 👉 Daftar matkul hari Jum'at / Sabtu.

🔍 *Pencarian:*
• \`${prefix}zoom\` 👉 Menampilkan link Zoom Meeting perkuliahan online.
• \`${prefix}cari [matkul/dosen]\` 👉 Cari jadwal berdasarkan mata kuliah atau nama dosen.

⚙️ *Lainnya:*
• \`${prefix}ping\` 👉 Cek status aktif bot.
• \`${prefix}info\` 👉 Informasi prodi dan kalender kuliah.
━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Format pencarian / zoom
 */
export function formatZoomSearchResult(results, defaultZoom, defaultRuangan) {
  let msg = `🔗 *INFORMASI LINK ZOOM & RUANGAN KULIAH* 🔗\n`;
  msg += `🏛️ *Magister Ilmu Komunikasi FISIP ULM*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `🌐 *Link Zoom Meeting (Kuliah Daring):*\n`;
  msg += `🔗 ${defaultZoom?.link || 'https://zoom.us'}\n`;
  msg += `🔑 Meeting ID: ${defaultZoom?.meeting_id || '-'}\n`;
  msg += `🔐 Passcode: ${defaultZoom?.passcode || '-'}\n\n`;

  msg += `🏢 *Ruangan Kelas (Kuliah Tatap Muka):*\n`;
  msg += `🚪 Ruang: *${defaultRuangan || 'G1.103'}*\n\n`;

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💡 _Ketik \`${config.prefix || '!'}jadwal\` untuk cek apakah hari ini jadwal Online atau Offline._`;

  return msg;
}
