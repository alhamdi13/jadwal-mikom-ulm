import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config, rootDir } from './config.js';

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

/**
 * Format string tanggal YYYY-MM-DD
 */
export function getDateString(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Mendapatkan objek Date berdasarkan offset hari dari hari ini atau string YYYY-MM-DD
 */
export function getTargetDate(input = 0) {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }
  if (typeof input === 'string' && input.includes('-')) {
    const parts = input.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    }
    return new Date(input);
  }
  const d = new Date();
  if (typeof input === 'number' && input !== 0) {
    d.setDate(d.getDate() + input);
  }
  return d;
}

/**
 * Mendapatkan nama hari dalam Bahasa Indonesia
 */
export function getIndonesianDayName(offsetDays = 0) {
  const date = getTargetDate(offsetDays);
  return DAYS_ID[date.getDay()];
}

/**
 * Format tanggal Indonesia lengkap (contoh: Jum'at, 11 September 2026)
 */
export function getFormattedDate(offsetDays = 0) {
  const date = getTargetDate(offsetDays);
  const dayName = DAYS_ID[date.getDay()];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${dayName}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Membaca data jadwal dari file JSON
 */
export async function loadScheduleData() {
  const { dataSource } = config;
  let jsonPath = path.resolve(rootDir, dataSource?.jsonFilePath || './data/jadwal_kuliah.json');
  if (!fs.existsSync(jsonPath)) {
    const fallbackPath = path.resolve(rootDir, './jadwal_kuliah.json');
    if (fs.existsSync(fallbackPath)) {
      jsonPath = fallbackPath;
    } else {
      throw new Error(`File jadwal tidak ditemukan di: ${jsonPath}`);
    }
  }

  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(fileContent);
}

/**
 * Mengambil jadwal untuk tanggal tertentu (memperhitungkan minggu Online / Offline)
 * @param {Date|number|string} dateInput - Objek Date, offset hari (0 = hari ini, 1 = besok), atau string YYYY-MM-DD
 */
export async function getScheduleForDate(dateInput = 0) {
  let dateObj;
  if (typeof dateInput === 'number') {
    dateObj = getTargetDate(dateInput);
  } else if (typeof dateInput === 'string' && dateInput.includes('-')) {
    dateObj = new Date(dateInput);
  } else {
    dateObj = dateInput || new Date();
  }

  const dateStr = getDateString(dateObj);
  const dayName = DAYS_ID[dateObj.getDay()];
  const rawData = await loadScheduleData();
  const schedules = [];

  for (const item of rawData.jadwal_matkul || []) {
    const isOffline = (item.tanggal_offline || []).includes(dateStr);
    const isOnline = (item.tanggal_online || []).includes(dateStr);

    // Jika tanggal ini terjadwal (Offline atau Online)
    if (isOffline || isOnline) {
      const mode = isOnline ? 'Online' : 'Offline';
      const meeting = (item.pertemuan || []).find(p => p.tanggal === dateStr);
      const activeLecturer = meeting?.dosen_pengajar || item.dosen_pengajar_aktif || (item.tim_pengajar && item.tim_pengajar.length > 0 ? item.tim_pengajar[0].nama : null);

      schedules.push({
        id: item.id,
        mata_kuliah: item.mata_kuliah,
        hari: item.hari,
        jam_mulai: item.jam_mulai,
        jam_selesai: item.jam_selesai,
        tim_pengajar: item.tim_pengajar || [],
        tipe: mode,
        ruangan: mode === 'Offline' ? rawData.default_ruangan : null,
        zoom: mode === 'Online' ? rawData.default_zoom : null,
        pertemuan_ke: meeting ? meeting.sesi : null,
        topik: meeting ? meeting.topik : null,
        dosen_pengajar: activeLecturer,
        tugas: meeting ? meeting.tugas : null,
        catatan: mode === 'Online' ? 'Perkuliahan Daring (Zoom Meeting)' : `Tatap Muka di Ruang ${rawData.default_ruangan}`
      });
    }
  }

  // Urutkan berdasarkan jam mulai
  schedules.sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));

  return {
    kampus: rawData.kampus,
    fakultas: rawData.fakultas,
    program_studi: rawData.program_studi,
    semester: rawData.semester,
    angkatan: rawData.angkatan,
    tanggal_str: dateStr,
    hari: dayName,
    schedules
  };
}

/**
 * Mengambil jadwal umum berdasarkan nama hari (misal: "Jum'at" atau "Sabtu")
 */
export async function getScheduleByDayName(dayNameQuery) {
  const rawData = await loadScheduleData();
  const cleanQuery = dayNameQuery.toLowerCase().replace(/['`]/g, '');
  
  const matched = (rawData.jadwal_matkul || []).filter(item => {
    const itemDay = item.hari.toLowerCase().replace(/['`]/g, '');
    return itemDay === cleanQuery;
  });

  return {
    kampus: rawData.kampus,
    fakultas: rawData.fakultas,
    program_studi: rawData.program_studi,
    semester: rawData.semester,
    angkatan: rawData.angkatan,
    default_ruangan: rawData.default_ruangan,
    default_zoom: rawData.default_zoom,
    hari: dayNameQuery,
    schedules: matched
  };
}

/**
 * Mengambil jadwal hari ini yang dikelompokkan per Dosen untuk japri (Hanya Dosen yang Bertugas Aktif)
 * @param {Date|number} dateInput
 */
export async function getLecturersSchedulesForDate(dateInput = 0) {
  const daySchedule = await getScheduleForDate(dateInput);
  const rawData = await loadScheduleData();
  const lecturerMap = new Map();

  for (const classItem of daySchedule.schedules) {
    // 1. Filter tim_pengajar HANYA ke dosen yang bertugas (dosen_pengajar aktif)
    let assignedLecturers = [];
    if (classItem.dosen_pengajar) {
      assignedLecturers = (classItem.tim_pengajar || []).filter(d => 
        classItem.dosen_pengajar.includes(d.nama) || d.nama.includes(classItem.dosen_pengajar)
      );

      // Jika nama tidak langsung cocok di tim_pengajar lokal, cari di master daftar_dosen
      if (assignedLecturers.length === 0 && rawData.daftar_dosen) {
        const found = rawData.daftar_dosen.find(d => 
          classItem.dosen_pengajar.includes(d.nama) || d.nama.includes(classItem.dosen_pengajar)
        );
        if (found) assignedLecturers = [found];
      }
    }

    // 2. Jika tidak ada filter khusus, gunakan tim_pengajar default
    if (assignedLecturers.length === 0) {
      assignedLecturers = classItem.tim_pengajar || [];
    }

    for (const lecturer of assignedLecturers) {
      let phone = (lecturer.no_hp || '').replace(/[^0-9]/g, '');
      if (!phone) continue;

      if (phone.startsWith('08')) {
        phone = '62' + phone.substring(1);
      }

      if (!lecturerMap.has(phone)) {
        lecturerMap.set(phone, {
          dosen: {
            nama: lecturer.nama,
            no_hp: phone
          },
          kampus: daySchedule.kampus,
          fakultas: daySchedule.fakultas,
          program_studi: daySchedule.program_studi,
          schedules: []
        });
      }

      lecturerMap.get(phone).schedules.push({
        mata_kuliah: classItem.mata_kuliah,
        jam_mulai: classItem.jam_mulai,
        jam_selesai: classItem.jam_selesai,
        tipe: classItem.tipe,
        ruangan: classItem.ruangan,
        zoom: classItem.zoom,
        pertemuan_ke: classItem.pertemuan_ke,
        topik: classItem.topik,
        dosen_pengajar: classItem.dosen_pengajar || lecturer.nama,
        is_assigned: true,
        tim_pengajar: classItem.tim_pengajar
      });
    }
  }

  return Array.from(lecturerMap.values());
}

/**
 * Cari jadwal berdasarkan kata kunci mata kuliah atau nama dosen
 */
export async function searchSchedules(query) {
  const rawData = await loadScheduleData();
  const q = query.toLowerCase().trim();

  const results = (rawData.jadwal_matkul || []).filter(item => {
    const matchMatkul = item.mata_kuliah.toLowerCase().includes(q);
    const matchDosen = (item.tim_pengajar || []).some(d => d.nama.toLowerCase().includes(q));
    return matchMatkul || matchDosen;
  });

  return {
    kampus: rawData.kampus,
    program_studi: rawData.program_studi,
    default_ruangan: rawData.default_ruangan,
    default_zoom: rawData.default_zoom,
    results
  };
}
