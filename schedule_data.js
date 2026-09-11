// Data Resmi Jadwal Kuliah Magister Ilmu Komunikasi FISIP ULM Angkatan 2026
const DEFAULT_ZOOM_CONFIG = {
  topik: "Zoom Meeting Ilmu Komunikasi FISIP ULM's",
  link: "https://lambungmangkurat.zoom.us/j/92196687315?pwd=afqgrBa43AILWMsBbalN3KwiXQCVij.1",
  meeting_id: "921 9668 7315",
  passcode: "743342",
  instruksi_link: "https://lambungmangkurat.zoom.us/meetings/92196687315/invitations?signature=3ElCfHYRu8r2Vrva50qf7m8cgkpxRAeUsn67teVuNMw"
};

// Cek apakah ada konfigurasi Zoom kustom yang disimpan di browser (localStorage)
function getActiveZoomConfig() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('sijadwal_custom_zoom');
    if (saved) {
      try {
        return { ...DEFAULT_ZOOM_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Gagal memuat zoom kustom dari localStorage:', e);
      }
    }
  }
  return { ...DEFAULT_ZOOM_CONFIG };
}

// Cek apakah ada ruangan kustom yang disimpan di browser (localStorage)
function getActiveRuangConfig() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('sijadwal_custom_ruangan');
    if (saved) return saved;
  }
  return "G1.103";
}

const ACADEMIC_DATA = {
  kampus: "Universitas Lambung Mangkurat (ULM)",
  fakultas: "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)",
  program_studi: "Magister Ilmu Komunikasi (MIKOM)",
  jenjang: "Strata 2 (S2)",
  semester: "Semester Ganjil (Semester I) T.A 2026/2027",
  angkatan: "2026",
  lokasi_kampus: "Banjarmasin, Kalimantan Selatan",
  default_ruangan: getActiveRuangConfig(),
  base_default_ruangan: "G1.103",
  default_zoom: getActiveZoomConfig(),
  base_default_zoom: DEFAULT_ZOOM_CONFIG,
  jadwal: [
    {
      id: "MK-01",
      hari: "Jum'at",
      day_index: 5,
      jam_mulai: "14.00",
      jam_selesai: "16.30",
      mata_kuliah: "Filsafat Ilmu Komunikasi",
      sks: 3,
      tim_pengajar: [
        {
          nama: "Prof. Dr. H. Bachruddin Ali Ahmad, M.Si",
          no_hp: "628125103033",
          peran: "Koordinator Tim"
        },
        {
          nama: "Prof. Dr. H. Budi Suryadi, M.Si",
          no_hp: "6281349555937",
          peran: "Anggota Tim"
        },
        {
          nama: "Dr. Fahrianoor, S.IP., M.Si",
          no_hp: "6281223198491",
          peran: "Anggota Tim"
        }
      ],
      tanggal_offline: [
        "2026-09-04", "2026-09-18",
        "2026-10-02", "2026-10-16", "2026-10-30",
        "2026-11-13", "2026-11-27",
        "2026-12-11"
      ],
      tanggal_online: [
        "2026-09-11", "2026-09-25",
        "2026-10-09", "2026-10-23",
        "2026-11-06", "2026-11-20",
        "2026-12-04", "2026-12-18"
      ],
      deskripsi: "Mengkaji landasan ontologi, epistemologi, dan aksiologi dalam tradisi keilmuan komunikasi kontemporer."
    },
    {
      id: "MK-02",
      hari: "Jum'at",
      day_index: 5,
      jam_mulai: "16.30",
      jam_selesai: "18.00",
      mata_kuliah: "Perspektif Komunikasi Organisasi",
      sks: 3,
      tim_pengajar: [
        {
          nama: "Prof. Dr. H. Bachruddin Ali Ahmad, M.Si",
          no_hp: "628125103033",
          peran: "Koordinator Tim"
        },
        {
          nama: "Dr. Siswanto, S.Sos., M.Si",
          no_hp: "6281218591982",
          peran: "Anggota Tim"
        }
      ],
      tanggal_offline: [
        "2026-09-04", "2026-09-18",
        "2026-10-02", "2026-10-16", "2026-10-30",
        "2026-11-13", "2026-11-27",
        "2026-12-11"
      ],
      tanggal_online: [
        "2026-09-11", "2026-09-25",
        "2026-10-09", "2026-10-23",
        "2026-11-06", "2026-11-20",
        "2026-12-04", "2026-12-18"
      ],
      deskripsi: "Dinamika komunikasi korporat, kepemimpinan organisasi, manajemen krisis, dan budaya kerja modern."
    },
    {
      id: "MK-03",
      hari: "Jum'at",
      day_index: 5,
      jam_mulai: "18.45",
      jam_selesai: "21.15",
      mata_kuliah: "CSR dan Komunikasi Pemberdayaan",
      sks: 3,
      tim_pengajar: [
        {
          nama: "Dr. Irwansyah, S.Sos,. M.Si",
          no_hp: "6281348013888",
          peran: "Koordinator Tim"
        },
        {
          nama: "Dr. Muhammad Alif, M.Si",
          no_hp: "6281294901982",
          peran: "Anggota Tim"
        }
      ],
      tanggal_offline: [
        "2026-09-04", "2026-09-18",
        "2026-10-02", "2026-10-16", "2026-10-30",
        "2026-11-13", "2026-11-27",
        "2026-12-11"
      ],
      tanggal_online: [
        "2026-09-11", "2026-09-25",
        "2026-10-09", "2026-10-23",
        "2026-11-06", "2026-11-20",
        "2026-12-04", "2026-12-18"
      ],
      deskripsi: "Konsep tanggung jawab sosial perusahaan, strategi komunikasi advokasi, dan pemberdayaan komunitas lokal."
    },
    {
      id: "MK-04",
      hari: "Sabtu",
      day_index: 6,
      jam_mulai: "08.00",
      jam_selesai: "10.30",
      mata_kuliah: "Perspektif dan Teori Komunikasi",
      sks: 3,
      tim_pengajar: [
        {
          nama: "Prof. Dr. H. Bachruddin Ali Ahmad, M.Si",
          no_hp: "628125103033",
          peran: "Koordinator Tim"
        },
        {
          nama: "Dr. Fahrianoor, S.IP., M.Si",
          no_hp: "6281223198491",
          peran: "Anggota Tim"
        },
        {
          nama: "Dr. Siswanto, S.Sos., M.Si",
          no_hp: "6281218591982",
          peran: "Anggota Tim"
        }
      ],
      tanggal_offline: [
        "2026-09-05", "2026-09-19",
        "2026-10-03", "2026-10-17", "2026-10-31",
        "2026-11-14", "2026-11-28",
        "2026-12-12"
      ],
      tanggal_online: [
        "2026-09-12", "2026-09-26",
        "2026-10-10", "2026-10-24",
        "2026-11-07", "2026-11-21",
        "2026-12-05", "2026-12-19"
      ],
      deskripsi: "Evolusi teori komunikasi klasik hingga era jaringan digital (cybernetic, socio-cultural, critical)."
    },
    {
      id: "MK-05",
      hari: "Sabtu",
      day_index: 6,
      jam_mulai: "10.30",
      jam_selesai: "13.00",
      mata_kuliah: "Perspektif Psikologi Komunikasi",
      sks: 3,
      tim_pengajar: [
        {
          nama: "Dr. Yuanita Setyastuti, S.IP., M.Si",
          no_hp: "6282153883264",
          peran: "Koordinator Tim"
        },
        {
          nama: "Dr. Novaria Maulina, S.I.Kom., M.I.Kom",
          no_hp: "6281351997788",
          peran: "Anggota Tim"
        }
      ],
      tanggal_offline: [
        "2026-09-05", "2026-09-19",
        "2026-10-03", "2026-10-17", "2026-10-31",
        "2026-11-14", "2026-11-28",
        "2026-12-12"
      ],
      tanggal_online: [
        "2026-09-12", "2026-09-26",
        "2026-10-10", "2026-10-24",
        "2026-11-07", "2026-11-21",
        "2026-12-05", "2026-12-19"
      ],
      deskripsi: "Kognisi sosial, persepsi interpersonal, persuasi, dan perilaku khalayak dalam media baru."
    },
    {
      id: "MK-06",
      hari: "Sabtu",
      day_index: 6,
      jam_mulai: "13.00",
      jam_selesai: "15.30",
      mata_kuliah: "Media dan Teknologi Komunikasi",
      sks: 3,
      tim_pengajar: [
        {
          nama: "Dr. Yuanita Setyastuti, S.IP., M.Si",
          no_hp: "6282153883264",
          peran: "Koordinator Tim"
        },
        {
          nama: "Dr. Muhammad Alif, M.Si",
          no_hp: "6281294901982",
          peran: "Anggota Tim"
        },
        {
          nama: "Dr. Atika, S.I.Kom., M.Si",
          no_hp: "6281341510487",
          peran: "Anggota Tim"
        }
      ],
      tanggal_offline: [
        "2026-09-05", "2026-09-19",
        "2026-10-03", "2026-10-17", "2026-10-31",
        "2026-11-14", "2026-11-28",
        "2026-12-12"
      ],
      tanggal_online: [
        "2026-09-12", "2026-09-26",
        "2026-10-10", "2026-10-24",
        "2026-11-07", "2026-11-21",
        "2026-12-05", "2026-12-19"
      ],
      deskripsi: "Analisis dampak kecerdasan buatan, konvergensi media, data mining, dan platform digital dalam masyarakat."
    }
  ],
  daftar_dosen: [
    {
      nama: "Dr. Irwansyah, S.Sos,. M.Si",
      no_hp: "6281348013888",
      matkul: ["CSR dan Komunikasi Pemberdayaan"]
    },
    {
      nama: "Dr. Muhammad Alif, M.Si",
      no_hp: "6281294901982",
      matkul: ["CSR dan Komunikasi Pemberdayaan", "Media dan Teknologi Komunikasi"]
    },
    {
      nama: "Prof. Dr. H. Bachruddin Ali Ahmad, M.Si",
      no_hp: "628125103033",
      matkul: ["Filsafat Ilmu Komunikasi", "Perspektif Komunikasi Organisasi", "Perspektif dan Teori Komunikasi"]
    },
    {
      nama: "Dr. Siswanto, S.Sos., M.Si",
      no_hp: "6281218591982",
      matkul: ["Perspektif Komunikasi Organisasi", "Perspektif dan Teori Komunikasi"]
    },
    {
      nama: "Prof. Dr. H. Budi Suryadi, M.Si",
      no_hp: "6281349555937",
      matkul: ["Filsafat Ilmu Komunikasi"]
    },
    {
      nama: "Dr. Fahrianoor, S.IP., M.Si",
      no_hp: "6281223198491",
      matkul: ["Filsafat Ilmu Komunikasi", "Perspektif dan Teori Komunikasi"]
    },
    {
      nama: "Dr. Yuanita Setyastuti, S.IP., M.Si",
      no_hp: "6282153883264",
      matkul: ["Perspektif Psikologi Komunikasi", "Media dan Teknologi Komunikasi"]
    },
    {
      nama: "Dr. Novaria Maulina, S.I.Kom., M.I.Kom",
      no_hp: "6281351997788",
      matkul: ["Perspektif Psikologi Komunikasi"]
    },
    {
      nama: "Dr. Atika, S.I.Kom., M.Si",
      no_hp: "6281341510487",
      matkul: ["Media dan Teknologi Komunikasi"]
    },
    {
      nama: "Ibu Rina",
      no_hp: "6282155540055",
      matkul: ["Sekretariat / Pengelola Akademik FISIP ULM"]
    },
    {
      nama: "Samsul Azis",
      no_hp: "6282157226624",
      matkul: ["Ketua Kelas MIKOM Angkatan 2026"]
    }
  ],
  daftar_tugas: [
    {
      id: 'task-1',
      matkul: 'Filsafat Ilmu Komunikasi',
      title: 'Mempelajari Silabus & Rangkuman Epistemologi Ilmu Komunikasi',
      deadline: "Jum'at, 18 September 2026 (14.00 WITA)",
      notes: 'Pelajari konsep ontologi, epistemologi, dan aksiologi dalam tradisi keilmuan komunikasi.',
      completed: false
    },
    {
      id: 'task-2',
      matkul: 'Perspektif Komunikasi Organisasi',
      title: 'Analisis Studi Kasus Komunikasi Korporasi Modern',
      deadline: 'Sabtu, 19 September 2026 (16.00 WITA)',
      notes: 'Kelompok 3-4 orang, analisis dinamika komunikasi internal sektor publik atau swasta.',
      completed: false
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ACADEMIC_DATA;
}

