/**
 * SiJadwal - Web Dashboard Application Logic
 * Magister Ilmu Komunikasi FISIP Universitas Lambung Mangkurat Angkatan 2026
 */

document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  initClock();
  initTheme();
  initTodaySpotlight();
  initBotControl();
  renderScheduleCards('today');
  renderCalendar();
  renderLecturerDirectory();
  renderBroadcastTab();
  renderTasks();
  initEventListeners();
});

// Utility: Format Date YYYY-MM-DD
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 1. Clock in WITA (UTC+8)
function initClock() {
  const clockEl = document.getElementById('witaClock');
  if (!clockEl) return;

  function update() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    clockEl.textContent = `${timeStr} WITA`;
  }
  update();
  setInterval(update, 1000);
}

// 2. Theme Toggle
function initTheme() {
  const toggleBtn = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('sijadwal_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  if (toggleBtn) {
    toggleBtn.innerHTML = savedTheme === 'dark' ? '🌙' : '☀️';
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sijadwal_theme', next);
      toggleBtn.innerHTML = next === 'dark' ? '🌙' : '☀️';
    });
  }
}

// 3. Settings & Custom Room/Zoom Persistence
function initSettings() {
  const savedRoom = localStorage.getItem('sijadwal_custom_ruangan');
  if (savedRoom) {
    ACADEMIC_DATA.default_ruangan = savedRoom;
  }

  const savedZoom = localStorage.getItem('sijadwal_custom_zoom');
  if (savedZoom) {
    try {
      ACADEMIC_DATA.default_zoom = { ...ACADEMIC_DATA.base_default_zoom, ...JSON.parse(savedZoom) };
    } catch (e) {
      console.error('Gagal parsing savedZoom:', e);
    }
  }

  updateGlobalRoomLabels();
}

function updateGlobalRoomLabels() {
  const heroLoc = document.getElementById('heroLocationTag');
  if (heroLoc) {
    heroLoc.textContent = `📍 Ruang ${ACADEMIC_DATA.default_ruangan} & Zoom Meeting`;
  }

  const calLegend = document.getElementById('calendarLegendOffline');
  if (calLegend) {
    calLegend.textContent = `🟢 Tatap Muka (Ruang ${ACADEMIC_DATA.default_ruangan})`;
  }

  const infoRoom = document.getElementById('infoCurrentRoom');
  if (infoRoom) {
    infoRoom.textContent = `Ruang ${ACADEMIC_DATA.default_ruangan} (Lantai 1)`;
  }
}

window.openSettingsModal = function() {
  const overlay = document.getElementById('settingsModalOverlay');
  if (!overlay) return;

  const currentZoom = ACADEMIC_DATA.default_zoom || {};
  document.getElementById('inputCustomRuangan').value = ACADEMIC_DATA.default_ruangan || 'G1.103';
  document.getElementById('inputZoomTopik').value = currentZoom.topik || '';
  document.getElementById('inputZoomLink').value = currentZoom.link || '';
  document.getElementById('inputZoomId').value = currentZoom.meeting_id || '';
  document.getElementById('inputZoomPass').value = currentZoom.passcode || '';
  document.getElementById('inputZoomInstruksi').value = currentZoom.instruksi_link || '';

  overlay.classList.add('active');
};

window.closeSettingsModal = function(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
  const overlay = document.getElementById('settingsModalOverlay');
  if (overlay) overlay.classList.remove('active');
};

window.saveCustomSettings = function() {
  const customRoom = document.getElementById('inputCustomRuangan').value.trim() || 'G1.103';
  const topik = document.getElementById('inputZoomTopik').value.trim();
  const link = document.getElementById('inputZoomLink').value.trim();
  const meeting_id = document.getElementById('inputZoomId').value.trim();
  const passcode = document.getElementById('inputZoomPass').value.trim();
  const instruksi_link = document.getElementById('inputZoomInstruksi').value.trim();

  if (!link) {
    alert('Tautan / URL Zoom tidak boleh kosong!');
    return;
  }

  // Simpan ruangan
  ACADEMIC_DATA.default_ruangan = customRoom;
  localStorage.setItem('sijadwal_custom_ruangan', customRoom);

  // Simpan zoom
  const updatedZoom = {
    topik: topik || "Zoom Meeting Ilmu Komunikasi FISIP ULM's",
    link,
    meeting_id: meeting_id || "-",
    passcode: passcode || "-",
    instruksi_link
  };

  ACADEMIC_DATA.default_zoom = updatedZoom;
  localStorage.setItem('sijadwal_custom_zoom', JSON.stringify(updatedZoom));

  updateGlobalRoomLabels();
  initTodaySpotlight();
  renderScheduleCards('today');
  renderCalendar();
  renderBroadcastTab();
  
  const overlay = document.getElementById('settingsModalOverlay');
  if (overlay) overlay.classList.remove('active');

  showToast('✅ Pengaturan Ruang & Link Zoom berhasil disimpan!');
};

window.resetSettingsToDefault = function() {
  if (confirm('Kembalikan pengaturan Ruang & Zoom ke default resmi Kampus FISIP ULM?')) {
    localStorage.removeItem('sijadwal_custom_ruangan');
    localStorage.removeItem('sijadwal_custom_zoom');

    ACADEMIC_DATA.default_ruangan = ACADEMIC_DATA.base_default_ruangan || 'G1.103';
    ACADEMIC_DATA.default_zoom = { ...ACADEMIC_DATA.base_default_zoom };

    updateGlobalRoomLabels();
    initTodaySpotlight();
    renderScheduleCards('today');
    renderCalendar();
    renderBroadcastTab();

    const overlay = document.getElementById('settingsModalOverlay');
    if (overlay) overlay.classList.remove('active');

    showToast('🔄 Pengaturan telah direset ke default resmi ULM.');
  }
};

// 4. Status Perkuliahan Hari Ini (Today Spotlight)
function initTodaySpotlight() {
  const spotlightEl = document.getElementById('todaySpotlight');
  if (!spotlightEl) return;

  const today = new Date();
  const todayISO = formatDateISO(today);

  // Cek apakah hari ini ada jadwal perkuliahan
  const todayClasses = ACADEMIC_DATA.jadwal.filter(item => {
    return (item.tanggal_offline || []).includes(todayISO) || (item.tanggal_online || []).includes(todayISO);
  });

  if (todayClasses.length > 0) {
    const isOnline = (todayClasses[0].tanggal_online || []).includes(todayISO);
    
    spotlightEl.className = `status-spotlight ${isOnline ? 'online' : 'offline'}`;
    spotlightEl.innerHTML = `
      <div class="status-label">Status Perkuliahan Hari Ini</div>
      <div class="status-title">
        ${isOnline ? '🌐 KULIAH DARING (ONLINE)' : '🟢 TATAP MUKA (OFFLINE)'}
      </div>
      <div class="status-detail">
        ${isOnline 
          ? `Tersedia via Zoom Meeting (${todayClasses.length} Mata Kuliah Hari Ini)` 
          : `Gedung FISIP ULM — Ruang ${ACADEMIC_DATA.default_ruangan} (${todayClasses.length} Mata Kuliah Hari Ini)`}
      </div>
      <div>
        ${isOnline 
          ? `<a href="${ACADEMIC_DATA.default_zoom.link}" target="_blank" class="quick-action-btn btn-blue" onclick="copyZoomInfo()">🚀 Buka Zoom Meeting</a>`
          : `<button class="quick-action-btn btn-green" onclick="showToast('📍 Lokasi: Ruang ${ACADEMIC_DATA.default_ruangan} Lantai 1 Gedung Pascasarjana FISIP ULM')">📍 Lokasi Ruang ${ACADEMIC_DATA.default_ruangan}</button>`}
      </div>
    `;
  } else {
    spotlightEl.className = 'status-spotlight';
    spotlightEl.innerHTML = `
      <div class="status-label">Status Hari Ini</div>
      <div class="status-title">🎉 Tidak Ada Jadwal Kuliah Hari Ini</div>
      <div class="status-detail">Perkuliahan MIKOM Angkatan 2026 aktif setiap hari Jum'at & Sabtu.</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="quick-action-btn" onclick="switchTab('jumat')">📅 Jadwal Jum'at</button>
        <button class="quick-action-btn" onclick="switchTab('sabtu')">📅 Jadwal Sabtu</button>
      </div>
    `;
  }
}

// 5. Render Schedule Cards Grid
function renderScheduleCards(tab = 'today', searchQuery = '') {
  const container = document.getElementById('scheduleGrid');
  if (!container) return;

  const today = new Date();
  const todayISO = formatDateISO(today);
  let list = [];

  if (tab === 'today') {
    list = ACADEMIC_DATA.jadwal.filter(item => 
      (item.tanggal_offline || []).includes(todayISO) || (item.tanggal_online || []).includes(todayISO)
    );
    // Jika hari ini tidak ada jadwal kuliah, tampilkan semua mata kuliah sebagai referensi
    if (list.length === 0) {
      list = ACADEMIC_DATA.jadwal;
    }
  } else if (tab === 'jumat') {
    list = ACADEMIC_DATA.jadwal.filter(item => item.hari.includes('Jum'));
  } else if (tab === 'sabtu') {
    list = ACADEMIC_DATA.jadwal.filter(item => item.hari.includes('Sab'));
  } else {
    list = ACADEMIC_DATA.jadwal;
  }

  // Filter Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(item => 
      item.mata_kuliah.toLowerCase().includes(q) ||
      (item.tim_pengajar || []).some(d => d.nama.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        🔍 Tidak ditemukan mata kuliah yang sesuai dengan kata kunci "${searchQuery}".
      </div>
    `;
    return;
  }

  container.innerHTML = list.map((item) => {
    const isOnlineToday = (item.tanggal_online || []).includes(todayISO);
    const isOfflineToday = (item.tanggal_offline || []).includes(todayISO);
    
    let modeBadge = `<span class="badge-mode offline">🟢 Berselang Online/Offline</span>`;
    if (isOnlineToday) {
      modeBadge = `<span class="badge-mode online">🌐 Hari Ini: ONLINE (Zoom)</span>`;
    } else if (isOfflineToday) {
      modeBadge = `<span class="badge-mode offline">🟢 Hari Ini: OFFLINE (${ACADEMIC_DATA.default_ruangan})</span>`;
    }

    // Deteksi Pertemuan Aktif Hari Ini atau Pertemuan Terdekat
    const activeMeeting = (item.pertemuan || []).find(p => p.tanggal === todayISO);
    const nextMeeting = !activeMeeting ? (item.pertemuan || []).find(p => p.tanggal >= todayISO) : null;
    const currentMeeting = activeMeeting || nextMeeting;

    let meetingBadgeHtml = '';
    let topicPreviewHtml = '';

    if (activeMeeting) {
      meetingBadgeHtml = `
        <div class="card-meeting-badge active">
          <span>🎯</span>
          <div>
            <strong>Hari Ini: Pertemuan ke-${activeMeeting.sesi}</strong> (${activeMeeting.metode})<br>
            <span style="font-size: 0.74rem;">👨‍🏫 Dosen Pengampu: <strong>${activeMeeting.dosen_pengajar}</strong></span>
          </div>
        </div>
      `;
      topicPreviewHtml = `
        <div class="card-topic-preview">
          📖 <strong>Topik Hari Ini:</strong> <em>${activeMeeting.topik}</em>
        </div>
      `;
    } else if (nextMeeting) {
      meetingBadgeHtml = `
        <div class="card-meeting-badge upcoming">
          <span>📌</span>
          <div>
            <strong>Pertemuan Terdekat: Sesi ${nextMeeting.sesi} (${nextMeeting.tanggal})</strong><br>
            <span style="font-size: 0.74rem;">👨‍🏫 Dosen Bertugas: <strong>${nextMeeting.dosen_pengajar}</strong></span>
          </div>
        </div>
      `;
      topicPreviewHtml = `
        <div class="card-topic-preview">
          📖 <strong>Topik Sesi ${nextMeeting.sesi}:</strong> <em>${nextMeeting.topik}</em>
        </div>
      `;
    }

    return `
      <div class="schedule-card">
        <div>
          <div class="card-header">
            <span class="card-time-badge">⏰ ${item.hari}, ${item.jam_mulai} - ${item.jam_selesai} WITA</span>
            ${modeBadge}
          </div>

          <h3 class="card-title">${item.mata_kuliah}</h3>
          <p class="card-desc">${item.deskripsi || 'Mata kuliah inti Program Studi Magister Ilmu Komunikasi FISIP ULM.'}</p>

          ${meetingBadgeHtml}
          ${topicPreviewHtml}

          <div class="card-lecturers">
            <div class="lecturer-label">Tim Dosen Pengajar:</div>
            ${(item.tim_pengajar || []).map(d => {
              const isAssignedCurrent = currentMeeting && currentMeeting.dosen_pengajar && (d.nama.includes(currentMeeting.dosen_pengajar) || currentMeeting.dosen_pengajar.includes(d.nama));
              return `
                <div class="lecturer-item ${isAssignedCurrent ? 'assigned-current' : ''}">
                  <span class="lecturer-name">
                    ${d.nama} ${isAssignedCurrent ? ' <span style="color: #10b981; font-weight: 700;">(Bertugas Sesi Ini)</span>' : ''}
                  </span>
                  ${d.no_hp ? `
                    <a href="https://wa.me/${d.no_hp}?text=${encodeURIComponent(`Assalamu'alaikum Wr. Wb. Selamat Pagi Bapak/Ibu ${d.nama}.\n\nSaya mahasiswa Magister Ilmu Komunikasi FISIP ULM Angkatan 2026 ingin mengonfirmasi perkuliahan mata kuliah *${item.mata_kuliah}*. Terima kasih.`)}" target="_blank" class="wa-lecturer-link">
                      💬 Hubungi
                    </a>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card-footer">
          <div class="location-info">
            🏢 Ruang ${ACADEMIC_DATA.default_ruangan} / 🌐 Zoom
          </div>
          <div class="action-buttons">
            <button class="btn-icon btn-syllabus" onclick="openSyllabusModal('${item.id}')" title="Lihat 16 Rincian Pertemuan & Dosen Bertugas">
              📖 16 Pertemuan (RPS)
            </button>
            <a href="${ACADEMIC_DATA.default_zoom.link}" target="_blank" class="btn-icon" onclick="copyZoomInfo()">
              🚀 Zoom
            </a>
            <button class="btn-icon" onclick="copyCourseBroadcast('${item.id}')" title="Salin format WA mata kuliah">
              📋 Salin WA
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 6. Render Kalender Semester Ganjil 2026
function renderCalendar() {
  const container = document.getElementById('calendarMonthsGrid');
  if (!container) return;

  const months = [
    { name: 'September 2026', key: '2026-09' },
    { name: 'Oktober 2026', key: '2026-10' },
    { name: 'November 2026', key: '2026-11' },
    { name: 'Desember 2026', key: '2026-12' }
  ];

  const allDatesMap = new Map();
  ACADEMIC_DATA.jadwal.forEach(matkul => {
    (matkul.tanggal_offline || []).forEach(date => {
      allDatesMap.set(date, { type: 'offline', day: matkul.hari });
    });
    (matkul.tanggal_online || []).forEach(date => {
      allDatesMap.set(date, { type: 'online', day: matkul.hari });
    });
  });

  const sortedDates = Array.from(allDatesMap.keys()).sort();

  container.innerHTML = months.map(m => {
    const monthDates = sortedDates.filter(d => d.startsWith(m.key));

    return `
      <div class="month-card">
        <h4 class="month-title">📅 ${m.name}</h4>
        <div class="dates-list">
          ${monthDates.map(d => {
            const info = allDatesMap.get(d);
            const dateNum = parseInt(d.split('-')[2], 10);
            const isOnline = info.type === 'online';

            return `
              <div class="date-row ${isOnline ? 'is-online' : 'is-offline'}" onclick="showDateModal('${d}')">
                <span><strong>${info.day}, ${dateNum} ${m.name.split(' ')[0]}</strong></span>
                <span class="badge-mode ${isOnline ? 'online' : 'offline'}">
                  ${isOnline ? '🌐 ONLINE (Zoom)' : `🟢 OFFLINE (${ACADEMIC_DATA.default_ruangan})`}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// 7. Render Directory Dosen
function renderLecturerDirectory() {
  const container = document.getElementById('lecturerGrid');
  if (!container) return;

  container.innerHTML = (ACADEMIC_DATA.daftar_dosen || []).map(d => {
    const initials = d.nama.split(' ').filter(w => !w.includes('.') && w.length > 1).map(w => w[0]).slice(0, 2).join('') || 'DS';
    
    return `
      <div class="lecturer-card">
        <div>
          <div class="lecturer-avatar">${initials}</div>
          <h4 class="lecturer-card-title">${d.nama}</h4>
          <div class="lecturer-matkul-tag">
            📚 ${d.matkul ? d.matkul.join(', ') : 'Dosen Pengampu'}
          </div>
        </div>

        <div>
          ${d.no_hp ? `
            <a href="https://wa.me/${d.no_hp}?text=${encodeURIComponent(`Assalamu'alaikum Warahmatullahi Wabarakatuh,\nSelamat Pagi Bapak/Ibu ${d.nama}.\n\nSaya mahasiswa Magister Ilmu Komunikasi FISIP ULM Angkatan 2026 ingin mengonfirmasi jadwal perkuliahan. Terima kasih.`)}" target="_blank" class="lecturer-contact-btn">
              💬 Chat WhatsApp (+${d.no_hp})
            </a>
          ` : `
            <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 10px;">
              ⏳ Nomor kontak dalam konfirmasi
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// 8. Section 4: Aksi Pengumuman WAG & Reminder Dosen
function getTodayOrUpcomingClasses() {
  const today = new Date();
  const todayISO = formatDateISO(today);

  let activeClasses = ACADEMIC_DATA.jadwal.filter(m => 
    (m.tanggal_offline || []).includes(todayISO) || (m.tanggal_online || []).includes(todayISO)
  );

  let isTodayActive = true;
  let targetDate = today;
  let targetISO = todayISO;

  if (activeClasses.length === 0) {
    isTodayActive = false;
    // Ambil jadwal Jum'at terdekat sebagai default preview
    activeClasses = ACADEMIC_DATA.jadwal.filter(m => m.hari.includes('Jum'));
  }

  const isOnline = activeClasses.some(m => (m.tanggal_online || []).includes(targetISO));

  return {
    classes: activeClasses,
    isToday: isTodayActive,
    isOnline: isOnline,
    targetDate: targetDate
  };
}

// Helper: Storage key for PJ Customizer
function getPjCustomizerKey() {
  const todayISO = formatDateISO(new Date());
  return `sijadwal_pj_customizer_${todayISO}`;
}

function getPjCustomizerData() {
  const saved = localStorage.getItem(getPjCustomizerKey());
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Gagal parsing customizer data:', e);
    }
  }
  return {
    selectedLecturers: {},
    customNote: ''
  };
}

function savePjCustomizerData(data) {
  localStorage.setItem(getPjCustomizerKey(), JSON.stringify(data));
}

window.togglePjCustomizer = function() {
  const container = document.getElementById('pjCustomizerContainer');
  const toggleBtn = document.getElementById('pjCustomizerToggleIcon');
  if (!container) return;

  const isOpen = container.classList.toggle('open');
  if (toggleBtn) {
    toggleBtn.textContent = isOpen ? '▲ Sembunyikan' : '⚙️ Sesuaikan';
  }
};

window.toggleCourseLecturer = function(matkulName, lecturerName) {
  const data = getPjCustomizerData();
  const currentClass = ACADEMIC_DATA.jadwal.find(m => m.mata_kuliah === matkulName);
  const allLecturers = currentClass ? (currentClass.tim_pengajar || []).map(d => d.nama) : [];

  if (!data.selectedLecturers[matkulName]) {
    data.selectedLecturers[matkulName] = allLecturers.filter(n => n !== lecturerName);
  } else {
    const list = data.selectedLecturers[matkulName];
    if (list.includes(lecturerName)) {
      data.selectedLecturers[matkulName] = list.filter(n => n !== lecturerName);
    } else {
      data.selectedLecturers[matkulName] = [...list, lecturerName];
    }
  }

  savePjCustomizerData(data);
  renderPjCustomizer();
  updateBroadcastPreviewOnly();
};

window.onPjCustomNoteChange = function() {
  const noteInput = document.getElementById('pjCustomNoteInput');
  if (!noteInput) return;

  const data = getPjCustomizerData();
  data.customNote = noteInput.value;
  savePjCustomizerData(data);
  updateBroadcastPreviewOnly();
};

window.resetPjCustomizer = function() {
  localStorage.removeItem(getPjCustomizerKey());
  const noteInput = document.getElementById('pjCustomNoteInput');
  if (noteInput) noteInput.value = '';
  renderPjCustomizer();
  updateBroadcastPreviewOnly();
  showToast('🔄 Pilihan dosen & catatan telah direset ke default silabus.');
};

function renderPjCustomizer() {
  const container = document.getElementById('pjLecturerSelectors');
  const noteInput = document.getElementById('pjCustomNoteInput');
  if (!container) return;

  const scheduleInfo = getTodayOrUpcomingClasses();
  const customizerData = getPjCustomizerData();

  if (noteInput && document.activeElement !== noteInput) {
    noteInput.value = customizerData.customNote || '';
  }

  if (scheduleInfo.classes.length === 0) {
    container.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-muted);">Tidak ada mata kuliah aktif untuk disesuaikan.</div>`;
    return;
  }

  container.innerHTML = scheduleInfo.classes.map((m, idx) => {
    const allLecturers = (m.tim_pengajar || []).map(d => d.nama);
    const selectedList = customizerData.selectedLecturers[m.mata_kuliah] || allLecturers;

    return `
      <div class="pj-course-selector-group">
        <div class="pj-course-title">
          <span>${idx + 1}️⃣</span>
          <span>${m.mata_kuliah}</span>
          <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">(${m.jam_mulai} WITA)</span>
        </div>
        <div class="pj-lecturer-chips">
          ${allLecturers.map(name => {
            const isSelected = selectedList.includes(name);
            return `
              <div class="pj-lecturer-chip ${isSelected ? 'active' : ''}" onclick="toggleCourseLecturer('${m.mata_kuliah}', '${name}')" title="Klik untuk memilih dosen yang mengajar hari ini">
                <span>${isSelected ? '✓' : '＋'}</span>
                <span>${name}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function updateBroadcastPreviewOnly() {
  const previewBox = document.getElementById('broadcastPreviewBox');
  if (previewBox) {
    previewBox.textContent = generateBroadcastMessageText();
  }
}

function generateBroadcastMessageText() {
  const data = getTodayOrUpcomingClasses();
  const dateFormatted = data.targetDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const zoom = ACADEMIC_DATA.default_zoom;
  const ruangan = ACADEMIC_DATA.default_ruangan;
  const customizerData = getPjCustomizerData();

  let headerNote = data.isToday 
    ? `📢 *PENGUMUMAN PERKULIAHAN HARI INI*` 
    : `📢 *JADWAL PERKULIAHAN (PRATINJAU JUM'AT)*`;

  let modeText = data.isOnline 
    ? `🌐 *Metode: KULIAH DARING (ONLINE ZOOM)*\n🔗 Link Zoom: ${zoom.link}\n🔑 Meeting ID: ${zoom.meeting_id}\n🔐 Passcode: ${zoom.passcode}`
    : `🟢 *Metode: TATAP MUKA (OFFLINE KAMPUS)*\n🏢 Ruangan: Ruang ${ruangan} (Lantai 1)\n🏛️ Lokasi: Gedung Pascasarjana FISIP ULM`;

  let matkulListText = data.classes.map((m, idx) => {
    const allLecturers = (m.tim_pengajar || []).map(d => d.nama);
    const selectedList = customizerData.selectedLecturers[m.mata_kuliah] || allLecturers;
    const activeLecturers = selectedList.length > 0 ? selectedList : allLecturers;
    const lecturerNames = activeLecturers.join(', ');

    const dateISO = formatDateISO(data.targetDate);
    const meeting = (m.pertemuan || []).find(p => p.tanggal === dateISO);

    let info = `${idx + 1}️⃣ *${m.mata_kuliah}* (${m.sks} SKS)\n`;
    if (meeting) {
      info += `   📌 Sesi: Pertemuan ke-${meeting.sesi}\n`;
      info += `   🎯 Topik: ${meeting.topik}\n`;
    }
    info += `   ⏰ Waktu: ${m.jam_mulai} - ${m.jam_selesai} WITA\n`;
    info += `   👥 Dosen Pengampu: ${lecturerNames}`;
    return info;
  }).join('\n\n');

  let customNoteText = '';
  if (customizerData.customNote && customizerData.customNote.trim()) {
    customNoteText = `\n\n📌 *Catatan Khusus dari Dosen / PJ Kelas:*\n_${customizerData.customNote.trim()}_`;
  }

  return `${headerNote}
🎓 *Magister Ilmu Komunikasi FISIP ULM*
👥 Angkatan 2026
🗓️ ${dateFormatted}
━━━━━━━━━━━━━━━━━━━━

${matkulListText}
${customNoteText}
━━━━━━━━━━━━━━━━━━━━
${modeText}

Selamat mengikuti perkuliahan rekan-rekan mahasiswa! Semoga sukses dan lancar selalu. ✨🎓`;
}

// Helper: Storage key for lecturer confirmation status
function getLecturerStatusKey() {
  const todayISO = formatDateISO(new Date());
  return `sijadwal_lecturer_status_${todayISO}`;
}

function getLecturerStatusMap() {
  const saved = localStorage.getItem(getLecturerStatusKey());
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Gagal parsing status dosen:', e);
    }
  }
  return {};
}

window.setLecturerStatus = function(lecturerName, status) {
  const map = getLecturerStatusMap();
  map[lecturerName] = status;
  localStorage.setItem(getLecturerStatusKey(), JSON.stringify(map));
  renderBroadcastTab();

  if (status === 'changed') {
    showToast(`🟡 Status ${lecturerName}: Ada Perubahan. Klik "⚡ Buat Revisi WAG" untuk membuat pengumuman.`);
  } else if (status === 'postponed') {
    showToast(`🔴 Status ${lecturerName}: Perkuliahan Ditunda.`);
  } else {
    showToast(`🟢 Status ${lecturerName}: Terkonfirmasi Bisa Hadir.`);
  }
};

function renderBroadcastTab() {
  const previewBox = document.getElementById('broadcastPreviewBox');
  const badgeEl = document.getElementById('broadcastStatusBadge');
  const lecturersList = document.getElementById('todayLecturersList');

  const data = getTodayOrUpcomingClasses();
  const text = generateBroadcastMessageText();

  renderPjCustomizer();

  if (previewBox) {
    previewBox.textContent = text;
  }

  if (badgeEl) {
    if (data.isToday) {
      badgeEl.className = data.isOnline ? 'badge-mode online' : 'badge-mode offline';
      badgeEl.textContent = data.isOnline ? '🌐 Hari Ini: ONLINE (Zoom)' : `🟢 Hari Ini: OFFLINE (${ACADEMIC_DATA.default_ruangan})`;
    } else {
      badgeEl.className = 'badge-mode offline';
      badgeEl.textContent = 'ℹ️ Pratinjau Jadwal Kuliah';
    }
  }

  if (lecturersList) {
    const lecturersMap = new Map();
    data.classes.forEach(m => {
      (m.tim_pengajar || []).forEach(d => {
        if (!lecturersMap.has(d.nama)) {
          lecturersMap.set(d.nama, { ...d, matkul: m.mata_kuliah, jam: m.jam_mulai, hari: m.hari });
        }
      });
    });

    const lecturers = Array.from(lecturersMap.values());
    const statusMap = getLecturerStatusMap();

    if (lecturers.length === 0) {
      lecturersList.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
          Tidak ada daftar dosen untuk sesi ini.
        </div>
      `;
      return;
    }

    lecturersList.innerHTML = lecturers.map(d => {
      const modeDesc = data.isOnline ? 'Online via Zoom Meeting' : `Tatap Muka di Ruang ${ACADEMIC_DATA.default_ruangan}`;
      const reminderText = `Assalamu'alaikum Warahmatullahi Wabarakatuh,\nSelamat Pagi Bapak/Ibu ${d.nama}.\n\nMohon izin mengonfirmasi dan mengingatkan perkuliahan Magister Ilmu Komunikasi FISIP ULM untuk mata kuliah *${d.matkul}* pada hari ini (${d.hari}, ${d.jam} WITA) yang dijadwalkan secara ${modeDesc}.\n\nApakah perkuliahan dapat dimulai sesuai jadwal? Terima kasih banyak Bapak/Ibu. 🙏`;
      
      const currentStatus = statusMap[d.nama] || 'ok';

      return `
        <div class="lecturer-reminder-item">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px; flex-wrap: wrap;">
            <div class="lecturer-reminder-info">
              <div class="lecturer-reminder-name">${d.nama}</div>
              <div class="lecturer-reminder-sub">📚 ${d.matkul} (${d.jam} WITA)</div>
            </div>
            ${d.no_hp ? `
              <a href="https://wa.me/${d.no_hp}?text=${encodeURIComponent(reminderText)}" target="_blank" class="lecturer-reminder-btn">
                <span>💬</span> Ingatkan Dosen
              </a>
            ` : `
              <span style="font-size: 0.75rem; color: var(--text-muted);">Kontak belum ada</span>
            `}
          </div>

          <div class="lecturer-reminder-bottom">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 600;">Konfirmasi:</span>
              <div class="status-pill-group">
                <button class="status-pill-btn ${currentStatus === 'ok' ? 'active status-ok' : ''}" onclick="setLecturerStatus('${d.nama}', 'ok')" title="Dosen bisa hadir">
                  🟢 Hadir
                </button>
                <button class="status-pill-btn ${currentStatus === 'changed' ? 'active status-changed' : ''}" onclick="setLecturerStatus('${d.nama}', 'changed')" title="Ada perubahan dosen / jam">
                  🟡 Berubah
                </button>
                <button class="status-pill-btn ${currentStatus === 'postponed' ? 'active status-postponed' : ''}" onclick="setLecturerStatus('${d.nama}', 'postponed')" title="Kuliah ditunda">
                  🔴 Ditunda
                </button>
              </div>
            </div>

            ${currentStatus !== 'ok' ? `
              <button class="btn-quick-rev" onclick="openRevisionModal({ matkul: '${d.matkul}', type: '${currentStatus === 'postponed' ? 'reschedule' : 'dosen'}', detail: '${currentStatus === 'postponed' ? 'Jadwal perkuliahan ditunda sementara' : `Digantikan oleh Dosen Pengganti (Semula: ${d.nama})`}' })">
                ⚡ Buat Revisi WAG
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

window.copyFullBroadcastWAG = function() {
  const text = generateBroadcastMessageText();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ Format Pesan Broadcast WAG berhasil disalin ke Clipboard!');
    }).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
};

window.shareBroadcastToWA = function() {
  const text = generateBroadcastMessageText();
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

// Revision Generator Functions
window.openRevisionModal = function(prefill = null) {
  const overlay = document.getElementById('revisionModalOverlay');
  if (!overlay) return;

  const matkulSelect = document.getElementById('inputRevMatkul');
  const typeSelect = document.getElementById('inputRevType');
  const detailInput = document.getElementById('inputRevDetail');
  const notesInput = document.getElementById('inputRevNotes');

  const allCourses = ACADEMIC_DATA.jadwal || [];
  matkulSelect.innerHTML = allCourses.map(m => `
    <option value="${m.mata_kuliah}">${m.mata_kuliah} (${m.hari})</option>
  `).join('');

  if (prefill) {
    if (prefill.matkul) {
      const matchOpt = Array.from(matkulSelect.options).find(opt => 
        opt.value.toLowerCase().includes(prefill.matkul.toLowerCase()) ||
        prefill.matkul.toLowerCase().includes(opt.value.toLowerCase())
      );
      if (matchOpt) matkulSelect.value = matchOpt.value;
    }
    if (prefill.type) typeSelect.value = prefill.type;
    if (prefill.detail) detailInput.value = prefill.detail;
    if (prefill.notes) notesInput.value = prefill.notes;
  } else {
    detailInput.value = '';
    notesInput.value = '';
  }

  updateRevisionPreview();
  overlay.classList.add('active');
};

window.closeRevisionModal = function(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
  const overlay = document.getElementById('revisionModalOverlay');
  if (overlay) overlay.classList.remove('active');
};

window.updateRevisionPreview = function() {
  const previewBox = document.getElementById('revisionPreviewBox');
  const typeSelect = document.getElementById('inputRevType');
  const matkulSelect = document.getElementById('inputRevMatkul');
  const detailInput = document.getElementById('inputRevDetail');
  const notesInput = document.getElementById('inputRevNotes');
  const labelDetail = document.getElementById('labelRevDetail');

  if (!previewBox || !typeSelect || !matkulSelect) return;

  const type = typeSelect.value;
  const matkulName = matkulSelect.value;
  const detail = detailInput.value.trim();
  const notes = notesInput.value.trim();

  // Update dynamic label and placeholder
  if (labelDetail) {
    if (type === 'dosen') {
      labelDetail.textContent = 'Dosen Pengganti Hari Ini';
      detailInput.placeholder = 'Contoh: Digantikan oleh Dr. Siswanto, S.Sos., M.Si';
    } else if (type === 'waktu') {
      labelDetail.textContent = 'Waktu / Jam Kuliah Baru (WITA)';
      detailInput.placeholder = 'Contoh: Digeser menjadi pukul 14.00 - 16.30 WITA';
    } else if (type === 'mode') {
      labelDetail.textContent = 'Ruang Baru / Tautan Zoom Baru';
      detailInput.placeholder = 'Contoh: Dialihkan ke Tatap Muka Ruang G1.103';
    } else if (type === 'reschedule') {
      labelDetail.textContent = 'Status / Jadwal Pengganti';
      detailInput.placeholder = 'Contoh: Ditiadakan hari ini, dijadwalkan ulang Sabtu depan';
    }
  }

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const courseObj = (ACADEMIC_DATA.jadwal || []).find(m => m.mata_kuliah === matkulName) || {};
  const timeInfo = courseObj.jam_mulai ? `${courseObj.jam_mulai} - ${courseObj.jam_selesai} WITA` : 'Sesuai Jadwal';
  const origLecturers = courseObj.tim_pengajar ? courseObj.tim_pengajar.map(d => d.nama).join(', ') : '-';
  const zoom = ACADEMIC_DATA.default_zoom || {};

  let changeTitle = '';
  let changeDetail = '';

  if (type === 'dosen') {
    changeTitle = '👨‍🏫 *PERGANTIAN DOSEN PENGAMPU HARI INI*';
    changeDetail = `Dosen Pengampu dialihkan kepada:\n👉 *${detail || 'Dosen Pengganti (Konfirmasi Dosen)'}*`;
  } else if (type === 'waktu') {
    changeTitle = '⏰ *PENYESUAIAN / PERGESERAN JAM KULIAH*';
    changeDetail = `Waktu Perkuliahan Berubah Menjadi:\n👉 *${detail || 'Jam Perkuliahan Baru (WITA)'}*`;
  } else if (type === 'mode') {
    changeTitle = '🌐 *PERUBAHAN RUANG / LINK ZOOM KULIAH*';
    changeDetail = `Metode / Ruangan dialihkan ke:\n👉 *${detail || `Zoom Meeting / Ruang ${ACADEMIC_DATA.default_ruangan}`}*`;
  } else if (type === 'reschedule') {
    changeTitle = '🗓️ *PEMBERITAHUAN PENUNDAAN PERKULIAHAN*';
    changeDetail = `Status Perkuliahan:\n👉 *${detail || 'DITUNDA / DIJADWALKAN ULANG (RESCHEDULE)'}*`;
  }

  let text = `⚠️ ${changeTitle} ⚠️
🎓 *Magister Ilmu Komunikasi FISIP ULM*
👥 Angkatan 2026
🗓️ Hari/Tgl: ${dateFormatted}
━━━━━━━━━━━━━━━━━━━━

📚 *Mata Kuliah:* ${matkulName}
⏰ *Jadwal Asli:* ${timeInfo}
👥 *Tim Dosen:* ${origLecturers}

📢 *Keterangan Perubahan:*
${changeDetail}
${notes ? `\n📝 *Pesan / Arahan Dosen:*\n"${notes}"\n` : ''}
━━━━━━━━━━━━━━━━━━━━
🔗 *Link Zoom Meeting:* ${zoom.link}
🔑 Meeting ID: ${zoom.meeting_id} | Pass: ${zoom.passcode}

Mohon perhatian seluruh rekan-rekan mahasiswa. Terima kasih. 🙏`;

  previewBox.textContent = text;
};

window.copyRevisionText = function() {
  const previewBox = document.getElementById('revisionPreviewBox');
  if (!previewBox) return;
  const text = previewBox.textContent;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ Format Pesan Revisi WAG berhasil disalin!');
    }).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
};

window.shareRevisionToWA = function() {
  const previewBox = document.getElementById('revisionPreviewBox');
  if (!previewBox) return;
  const text = previewBox.textContent;
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

// 9. Section 5: Assignment Tracker (Info & Tugas)
const DEFAULT_INITIAL_TASKS = [
  {
    id: 'task-1',
    matkul: 'Filsafat Ilmu Komunikasi',
    title: 'Mempelajari Silabus & Rangkuman Epistemologi Ilmu Komunikasi',
    deadline: 'Jum\'at, 18 September 2026 (14.00 WITA)',
    notes: 'Pelajari konsep ontologi, epistemologi, dan aksiologi dalam tradisi keilmuan komunikasi.',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-2',
    matkul: 'Perspektif Komunikasi Organisasi',
    title: 'Analisis Studi Kasus Komunikasi Korporasi Modern',
    deadline: 'Sabtu, 19 September 2026 (16.00 WITA)',
    notes: 'Kelompok 3-4 orang, analisis dinamika komunikasi internal sektor publik atau swasta.',
    completed: false,
    createdAt: new Date().toISOString()
  }
];

function getTasks() {
  const masterTasks = (ACADEMIC_DATA && ACADEMIC_DATA.daftar_tugas) ? ACADEMIC_DATA.daftar_tugas : DEFAULT_INITIAL_TASKS;
  const saved = localStorage.getItem('sijadwal_tasks');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Gagal parsing sijadwal_tasks:', e);
    }
  }
  return masterTasks;
}

function saveTasks(tasks) {
  localStorage.setItem('sijadwal_tasks', JSON.stringify(tasks));
}

window.shareTasksToWAG = function() {
  const tasks = getTasks();
  const activeTasks = tasks.filter(t => !t.completed);
  
  if (tasks.length === 0) {
    showToast('ℹ️ Belum ada catatan tugas untuk dibagikan.');
    return;
  }

  let text = `📝 *CATATAN TUGAS & DEADLINE PERKULIAHAN*\n🎓 *Magister Ilmu Komunikasi FISIP ULM (Angkatan 2026)*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (activeTasks.length > 0) {
    text += `⏳ *TUGAS AKTIF / DEADLINE:* \n\n`;
    activeTasks.forEach((t, i) => {
      text += `${i + 1}️⃣ *[${t.matkul}]*\n📌 *Judul:* ${t.title}\n⏰ *Deadline:* ${t.deadline || '-'}\n📝 *Catatan:* ${t.notes || '-'}\n\n`;
    });
  } else {
    text += `🎉 *Semua tugas perkuliahan saat ini telah selesai!* ✨\n\n`;
  }

  const completedTasks = tasks.filter(t => t.completed);
  if (completedTasks.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━\n✅ *Tugas Selesai:*\n`;
    completedTasks.forEach((t, i) => {
      text += `~${i + 1}. [${t.matkul}] ${t.title}~\n`;
    });
    text += `\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━\nSemangat dan sukses selalu rekan-rekan MIKOM 2026! ✨📚`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

function renderTasks() {
  const container = document.getElementById('tasksContainer');
  if (!container) return;

  const tasks = getTasks();

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-tasks-state">
        <span style="font-size: 2rem; display: block; margin-bottom: 8px;">🎉</span>
        <strong>Belum ada catatan tugas aktif</strong>
        <p style="font-size: 0.82rem; margin-top: 4px;">Klik tombol "➕ Tambah Tugas" di atas untuk mencatat tugas baru.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(t => {
    return `
      <div class="task-card ${t.completed ? 'completed' : ''}" id="${t.id}">
        <div class="task-card-header">
          <span class="task-matkul-tag">📚 ${t.matkul}</span>
          <span class="task-badge ${t.completed ? 'done' : 'pending'}">
            ${t.completed ? '✅ Selesai' : '⏳ Belum Selesai'}
          </span>
        </div>

        <h4 class="task-title">${t.title}</h4>
        ${t.deadline ? `<div class="task-deadline">⏰ Deadline: ${t.deadline}</div>` : ''}
        ${t.notes ? `<div class="task-notes">${t.notes}</div>` : ''}

        <div class="task-actions">
          <button class="task-btn toggle-btn" onclick="toggleTaskStatus('${t.id}')">
            ${t.completed ? '↩️ Tandai Belum Selesai' : '✔️ Tandai Selesai'}
          </button>
          <button class="task-btn delete-btn" onclick="deleteTask('${t.id}')">
            🗑️ Hapus
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.openTaskModal = function() {
  const overlay = document.getElementById('taskModalOverlay');
  if (!overlay) return;

  document.getElementById('inputTaskTitle').value = '';
  document.getElementById('inputTaskDeadline').value = '';
  document.getElementById('inputTaskNotes').value = '';

  overlay.classList.add('active');
};

window.closeTaskModal = function(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
  const overlay = document.getElementById('taskModalOverlay');
  if (overlay) overlay.classList.remove('active');
};

window.saveNewTask = function() {
  const matkul = document.getElementById('inputTaskMatkul').value;
  const title = document.getElementById('inputTaskTitle').value.trim();
  const deadline = document.getElementById('inputTaskDeadline').value.trim();
  const notes = document.getElementById('inputTaskNotes').value.trim();

  if (!title) {
    alert('Judul Tugas tidak boleh kosong!');
    return;
  }

  const tasks = getTasks();
  const newTask = {
    id: 'task-' + Date.now(),
    matkul,
    title,
    deadline,
    notes,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  saveTasks(tasks);
  renderTasks();

  const overlay = document.getElementById('taskModalOverlay');
  if (overlay) overlay.classList.remove('active');

  showToast('✅ Catatan tugas baru berhasil ditambahkan!');
};

window.toggleTaskStatus = function(taskId) {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    tasks[index].completed = !tasks[index].completed;
    saveTasks(tasks);
    renderTasks();
    showToast(tasks[index].completed ? '✅ Tugas ditandai selesai!' : '↩️ Status tugas diubah menjadi aktif.');
  }
};

window.deleteTask = function(taskId) {
  if (confirm('Apakah Anda yakin ingin menghapus catatan tugas ini?')) {
    let tasks = getTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks(tasks);
    renderTasks();
    showToast('🗑️ Catatan tugas berhasil dihapus.');
  }
};

// 10. Event Listeners & Tab Navigation
function initEventListeners() {
  const searchInput = document.getElementById('searchSchedule');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderScheduleCards('all', e.target.value);
    });
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget.getAttribute('data-tab');
      e.currentTarget.classList.add('active');

      const scheduleSec = document.getElementById('scheduleSection');
      const calendarSec = document.getElementById('calendarSection');
      const lecturerSec = document.getElementById('lecturerSection');
      const broadcastSec = document.getElementById('broadcastSection');
      const infoTugasSec = document.getElementById('infoTugasSection');

      if (scheduleSec) scheduleSec.style.display = (target === 'calendar' || target === 'lecturers' || target === 'broadcast' || target === 'info-tugas') ? 'none' : 'block';
      if (calendarSec) calendarSec.style.display = (target === 'calendar') ? 'block' : 'none';
      if (lecturerSec) lecturerSec.style.display = (target === 'lecturers') ? 'block' : 'none';
      if (broadcastSec) broadcastSec.style.display = (target === 'broadcast') ? 'block' : 'none';
      if (infoTugasSec) infoTugasSec.style.display = (target === 'info-tugas') ? 'block' : 'none';

      if (target === 'broadcast') {
        renderBroadcastTab();
      } else if (target === 'info-tugas') {
        renderTasks();
      } else if (target !== 'calendar' && target !== 'lecturers') {
        renderScheduleCards(target);
      }
    });
  });
}

// 11. Helper Actions & Silabus 16 Pertemuan (RPS)
let activeSyllabusCourseId = null;

window.openSyllabusModal = function(courseId) {
  activeSyllabusCourseId = courseId;
  const overlay = document.getElementById('syllabusModalOverlay');
  if (!overlay) return;

  const matkul = ACADEMIC_DATA.jadwal.find(m => m.id === courseId);
  if (!matkul) return;

  // Title & Subtitle
  const titleEl = document.getElementById('syllabusModalTitle');
  const subEl = document.getElementById('syllabusModalSubtitle');
  if (titleEl) titleEl.textContent = `📖 Silabus & Pertemuan: ${matkul.mata_kuliah}`;
  if (subEl) subEl.textContent = `${matkul.sks} SKS • ${matkul.hari}, ${matkul.jam_mulai} - ${matkul.jam_selesai} WITA • Ruang ${ACADEMIC_DATA.default_ruangan} & Zoom Meeting`;

  // Summary box
  const summaryEl = document.getElementById('syllabusCourseSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div>
        <div class="syllabus-course-title">${matkul.mata_kuliah} (${matkul.sks} SKS)</div>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 8px;">${matkul.deskripsi || 'Mata kuliah inti Program Studi Magister Ilmu Komunikasi FISIP ULM.'}</p>
        <div class="syllabus-meta-tags">
          <span class="syllabus-meta-tag">⏰ ${matkul.hari}, ${matkul.jam_mulai} - ${matkul.jam_selesai} WITA</span>
          <span class="syllabus-meta-tag">👥 ${matkul.tim_pengajar.length} Dosen Tim Pengajar</span>
          <span class="syllabus-meta-tag">🏛️ Ruang ${ACADEMIC_DATA.default_ruangan}</span>
          <span class="syllabus-meta-tag">🌐 Zoom Ready</span>
        </div>
      </div>
    `;
  }

  // Populate Filter Dosen dropdown
  const selectFilter = document.getElementById('selectSyllabusDosenFilter');
  if (selectFilter) {
    let options = `<option value="all">👥 Semua Dosen Tim Pengajar (${matkul.tim_pengajar.length} Dosen)</option>`;
    (matkul.tim_pengajar || []).forEach(d => {
      options += `<option value="${d.nama}">👨‍🏫 ${d.nama} (${d.peran || 'Dosen'})</option>`;
    });
    selectFilter.innerHTML = options;
    selectFilter.value = 'all';
  }

  renderSyllabusList(courseId, 'all');
  overlay.classList.add('active');
};

window.closeSyllabusModal = function(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
  const overlay = document.getElementById('syllabusModalOverlay');
  if (overlay) overlay.classList.remove('active');
};

window.filterSyllabusList = function() {
  const filterVal = document.getElementById('selectSyllabusDosenFilter').value;
  if (activeSyllabusCourseId) {
    renderSyllabusList(activeSyllabusCourseId, filterVal);
  }
};

window.renderSyllabusList = function(courseId, filterLecturer = 'all') {
  const container = document.getElementById('syllabusTimelineList');
  if (!container) return;

  const matkul = ACADEMIC_DATA.jadwal.find(m => m.id === courseId);
  if (!matkul || !matkul.pertemuan) return;

  const todayISO = formatDateISO(new Date());

  let list = matkul.pertemuan;
  if (filterLecturer && filterLecturer !== 'all') {
    list = list.filter(p => p.dosen_pengajar && (p.dosen_pengajar.includes(filterLecturer) || filterLecturer.includes(p.dosen_pengajar)));
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-secondary); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        🔍 Tidak ada jadwal pertemuan khusus untuk dosen ini.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const isToday = item.tanggal === todayISO;
    const isOnline = item.metode.toLowerCase() === 'online';
    const isUtsUas = item.topik.toLowerCase().includes('uts') || item.topik.toLowerCase().includes('uas') || item.topik.toLowerCase().includes('ujian');
    
    // Format date Indonesian
    const dateObj = new Date(item.tanggal);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const formattedDate = `${matkul.hari}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    // Find lecturer contact if available
    const lecturerObj = (matkul.tim_pengajar || []).find(d => item.dosen_pengajar && (d.nama.includes(item.dosen_pengajar) || item.dosen_pengajar.includes(d.nama)));
    const waPhone = lecturerObj ? lecturerObj.no_hp : null;

    return `
      <div class="syllabus-card ${isToday ? 'is-current' : ''} ${isUtsUas ? 'is-uts-uas' : ''}">
        <div class="syllabus-sesi-badge">
          <span>P-${item.sesi}</span>
          <small>${item.metode}</small>
        </div>

        <div class="syllabus-body">
          <div class="syllabus-card-header">
            <span class="syllabus-date-str">🗓️ ${formattedDate}</span>
            <div style="display: flex; gap: 6px; align-items: center;">
              ${isToday ? '<span class="current-indicator-tag">🔥 Hari Ini</span>' : ''}
              <span class="badge-mode ${isOnline ? 'online' : 'offline'}" style="font-size: 0.72rem;">
                ${isOnline ? '🌐 Daring (Zoom)' : `🟢 Tatap Muka (${ACADEMIC_DATA.default_ruangan})`}
              </span>
            </div>
          </div>

          <div class="syllabus-topic">
            ${item.topik}
          </div>

          <div class="syllabus-lecturer-row">
            <div class="syllabus-lecturer-name">
              <span>👨‍🏫</span>
              <span><strong>${item.dosen_pengajar || 'Tim Pengajar'}</strong></span>
            </div>
            ${waPhone ? `
              <a href="https://wa.me/${waPhone}?text=${encodeURIComponent(`Assalamu'alaikum Warahmatullahi Wabarakatuh Bapak/Ibu ${item.dosen_pengajar}.\n\nSaya mahasiswa MIKOM ULM Angkatan 2026 ingin mengonfirmasi perkuliahan *${matkul.mata_kuliah}* (Pertemuan ke-${item.sesi} pada ${formattedDate}). Terima kasih banyak.`)}" target="_blank" class="wa-lecturer-link" style="font-size: 0.74rem;">
                💬 Chat Dosen
              </a>
            ` : ''}
          </div>

          ${item.tugas && item.tugas !== '-' ? `
            <div class="syllabus-task-note">
              <span>📝 Tugas / Evaluasi:</span> <span>${item.tugas}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
};

window.copyCourseSyllabusSummary = function() {
  if (!activeSyllabusCourseId) return;
  const matkul = ACADEMIC_DATA.jadwal.find(m => m.id === activeSyllabusCourseId);
  if (!matkul || !matkul.pertemuan) return;

  let text = `📖 *RINCIAN 16 PERTEMUAN & DOSEN PENGAMPU*\n`;
  text += `📚 *${matkul.mata_kuliah}* (${matkul.sks} SKS)\n`;
  text += `🏛️ Magister Ilmu Komunikasi FISIP ULM (Angkatan 2026)\n`;
  text += `⏰ Waktu: ${matkul.hari}, ${matkul.jam_mulai} - ${matkul.jam_selesai} WITA\n`;
  text += `🏢 Ruangan: Ruang ${ACADEMIC_DATA.default_ruangan} / 🌐 Zoom Meeting\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  matkul.pertemuan.forEach(p => {
    const isOnline = p.metode.toLowerCase() === 'online';
    text += `*P-${p.sesi}* (${p.tanggal}) [${isOnline ? 'ONLINE' : 'OFFLINE'}]\n`;
    text += `🎯 *Topik:* ${p.topik}\n`;
    text += `👨‍🏫 *Dosen Pengampu:* ${p.dosen_pengajar}\n`;
    if (p.tugas && p.tugas !== '-') text += `📝 *Tugas:* ${p.tugas}\n`;
    text += `\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━\n_Sistem Informasi Akademik MIKOM FISIP ULM_`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`✅ Rangkuman 16 Pertemuan ${matkul.mata_kuliah} berhasil disalin!`);
    }).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
};

window.switchTab = function(tabName) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (btn) btn.click();
};

window.copyZoomInfo = function() {
  const text = `Zoom: ${ACADEMIC_DATA.default_zoom.link}\nID: ${ACADEMIC_DATA.default_zoom.meeting_id}\nPasscode: ${ACADEMIC_DATA.default_zoom.passcode}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ Tautan, ID, dan Passcode Zoom berhasil disalin!');
    }).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
};

window.copyCourseBroadcast = function(courseId) {
  const matkul = ACADEMIC_DATA.jadwal.find(m => m.id === courseId);
  if (!matkul) return;

  const todayISO = formatDateISO(new Date());
  const activeMeeting = (matkul.pertemuan || []).find(p => p.tanggal === todayISO);
  const nextMeeting = !activeMeeting ? (matkul.pertemuan || []).find(p => p.tanggal >= todayISO) : null;
  const currentP = activeMeeting || nextMeeting;

  let text = `📚 *${matkul.mata_kuliah}* (${matkul.sks} SKS)\n`;
  if (currentP) {
    text += `📌 *Sesi:* Pertemuan ke-${currentP.sesi} (${currentP.metode})\n`;
    text += `🎯 *Topik Bahasan:* ${currentP.topik}\n`;
    text += `👨‍🏫 *Dosen Pengampu Sesi Ini:* ${currentP.dosen_pengajar}\n`;
  }
  text += `⏰ ${matkul.hari}, ${matkul.jam_mulai} - ${matkul.jam_selesai} WITA\n`;
  text += `👥 Tim Pengajar: ${matkul.tim_pengajar.map(d => d.nama).join(', ')}\n`;
  text += `🔗 Link Zoom: ${ACADEMIC_DATA.default_zoom.link}\n`;
  text += `🏢 Lokasi Ruangan: Ruang ${ACADEMIC_DATA.default_ruangan}\n`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`✅ Jadwal & Sesi ${matkul.mata_kuliah} berhasil disalin!`);
    }).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
};

window.showDateModal = function(dateStr) {
  const matkulList = ACADEMIC_DATA.jadwal.filter(m => 
    (m.tanggal_offline || []).includes(dateStr) || (m.tanggal_online || []).includes(dateStr)
  );

  const isOnline = matkulList.some(m => (m.tanggal_online || []).includes(dateStr));
  const dateObj = new Date(dateStr);
  const formatted = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let msg = `📅 ${formatted}\nStatus: ${isOnline ? '🌐 ONLINE (Zoom)' : `🟢 OFFLINE (Ruang ${ACADEMIC_DATA.default_ruangan})`}\n\n`;
  
  if (matkulList.length === 0) {
    msg += `Tidak ada agenda perkuliahan pada tanggal ini.`;
  } else {
    msg += `Daftar Mata Kuliah:\n━━━━━━━━━━━━━━━━━━━━\n`;
    matkulList.forEach((m, i) => {
      const meeting = (m.pertemuan || []).find(p => p.tanggal === dateStr);
      const sesiText = meeting ? `[Pertemuan ke-${meeting.sesi}]` : '';
      const dosenText = meeting ? `\n   👨‍🏫 Dosen Bertugas: ${meeting.dosen_pengajar}` : '';
      const topikText = meeting ? `\n   🎯 Topik: ${meeting.topik}` : '';
      msg += `${i + 1}. ${m.mata_kuliah} ${sesiText} (${m.jam_mulai} - ${m.jam_selesai} WITA)${dosenText}${topikText}\n\n`;
    });
  }

  alert(msg);
};

function fallbackCopyText(text) {
  const tempInput = document.createElement('textarea');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  showToast(`✅ Berhasil disalin ke Clipboard!`);
}

window.showToast = function(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

/* ==========================================================================
   12. Bot WhatsApp Cloud Control & GitHub API Module
   ========================================================================== */

const BOT_WORKFLOWS_DEF = [
  {
    file: 'h_minus_1_broadcast.yml',
    title: '🔔 Bot Pengingat H-1 Sore',
    schedule: '⏰ Setiap Kamis & Jum\'at Sore (16:53 WITA)',
    desc: 'Mengirimkan konfirmasi kesiapan ke dosen pengampu (Japri) dan pengingat kuliah esok hari ke WAG mahasiswa.'
  },
  {
    file: 'morning_broadcast.yml',
    title: '🌅 Bot Jadwal Pagi Hari H',
    schedule: '⏰ Setiap Jum\'at & Sabtu Pagi (04:53 WITA)',
    desc: 'Mengirimkan rekapitulasi jadwal kuliah hari ini beserta ruangan tatap muka / link Zoom ke WAG mahasiswa.'
  },
  {
    file: 'course_reminder_broadcast.yml',
    title: '⏱️ Bot Pengingat Kilat H-30 Menit',
    schedule: '⏰ 30 Menit Sebelum Setiap Sesi Kuliah',
    desc: 'Mengirimkan notifikasi kilat fokus per-mata kuliah langsung dengan link Zoom & nomor ruang kelas.'
  }
];

let cachedWorkflowStates = {};
let currentCloudEditorDateISO = '';

function getGitHubConfig() {
  return {
    repo: localStorage.getItem('sijadwal_gh_repo') || 'alhamdi13/jadwal-mikom-ulm',
    token: localStorage.getItem('sijadwal_gh_token') || ''
  };
}

function saveGitHubConfig(repo, token) {
  localStorage.setItem('sijadwal_gh_repo', repo.trim());
  localStorage.setItem('sijadwal_gh_token', token.trim());
}

function initBotControl() {
  const cfg = getGitHubConfig();
  const repoInput = document.getElementById('inputGhRepo');
  const tokenInput = document.getElementById('inputGhToken');
  
  if (repoInput) repoInput.value = cfg.repo || 'alhamdi13/jadwal-mikom-ulm';
  if (tokenInput && cfg.token) tokenInput.value = cfg.token;

  updateTopBarBotBadge();
}

function updateTopBarBotBadge() {
  const cfg = getGitHubConfig();
  const btn = document.getElementById('btnTopBotControl');
  if (!btn) return;

  if (!cfg.token || !cfg.repo) {
    btn.innerHTML = `⚠️ Kontrol Bot (Atur Token)`;
    btn.style.color = '#f59e0b';
    btn.style.borderColor = 'rgba(245, 158, 11, 0.35)';
    btn.style.background = 'rgba(245, 158, 11, 0.12)';
  } else {
    btn.innerHTML = `<span class="pulse-dot-mini"></span> 🤖 Saklar & Kontrol Bot`;
    btn.style.color = '#10b981';
    btn.style.borderColor = 'rgba(16, 185, 129, 0.35)';
    btn.style.background = 'rgba(16, 185, 129, 0.15)';
  }
}

window.openBotControlModal = function(initialTab = 'switches') {
  const overlay = document.getElementById('botControlModalOverlay');
  if (!overlay) return;

  overlay.classList.add('active');
  switchBotModalTab(initialTab);
  
  const cfg = getGitHubConfig();
  if (cfg.token && cfg.repo) {
    refreshBotWorkflowsStatus();
  } else {
    renderBotWorkflowsList();
    const banner = document.getElementById('botConnectionText');
    const dot = document.getElementById('botConnectionDot');
    if (banner) banner.textContent = '⚠️ GitHub Token belum diatur. Masuk ke tab "Pengaturan Akses GitHub" untuk menghubungkan.';
    if (dot) dot.className = 'pulse-dot warning';
  }
};

window.closeBotControlModal = function(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
  const overlay = document.getElementById('botControlModalOverlay');
  if (overlay) overlay.classList.remove('active');
};

window.switchBotModalTab = function(tabName) {
  document.querySelectorAll('.bot-modal-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-bttab') === tabName);
  });

  const tabSwitches = document.getElementById('botTabSwitches');
  const tabEditor = document.getElementById('botTabEditor');
  const tabToken = document.getElementById('botTabToken');
  const footerActions = document.getElementById('botModalFooterActions');

  if (tabSwitches) tabSwitches.style.display = (tabName === 'switches') ? 'block' : 'none';
  if (tabEditor) tabEditor.style.display = (tabName === 'editor') ? 'block' : 'none';
  if (tabToken) tabToken.style.display = (tabName === 'token') ? 'block' : 'none';

  if (footerActions) {
    if (tabName === 'switches') {
      footerActions.innerHTML = `
        <button class="quick-action-btn btn-blue" onclick="refreshBotWorkflowsStatus()">
          🔄 Perbarui Status Saklar
        </button>
      `;
    } else if (tabName === 'editor') {
      footerActions.innerHTML = `
        <button class="quick-action-btn btn-green" onclick="saveAndSyncScheduleToCloud()">
          💾 Simpan & Sinkronkan ke Cloud Bot
        </button>
      `;
      if (!currentCloudEditorDateISO) {
        loadScheduleForCloudEditor(1); // Default to tomorrow
      }
    } else {
      footerActions.innerHTML = `
        <button class="quick-action-btn btn-blue" onclick="testAndSaveGitHubConfig()">
          🔌 Uji Koneksi & Simpan
        </button>
      `;
    }
  }
};

window.toggleTokenVisibility = function() {
  const tokenInput = document.getElementById('inputGhToken');
  if (tokenInput) {
    tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
  }
};

window.testAndSaveGitHubConfig = async function() {
  const repo = (document.getElementById('inputGhRepo').value || '').trim();
  const token = (document.getElementById('inputGhToken').value || '').trim();

  if (!repo || !token) {
    alert('Harap isi Nama Repository (contoh: user/repo) dan Personal Access Token!');
    return;
  }

  showToast('⏳ Menguji koneksi ke GitHub Actions API...');

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${res.status}: Gagal otentikasi GitHub.`);
    }

    const data = await res.json();
    saveGitHubConfig(repo, token);
    updateTopBarBotBadge();

    showToast(`✅ Berhasil terhubung ke ${repo}! Ditemukan ${data.total_count || data.workflows?.length || 0} workflows.`);
    
    // Switch to switches tab and refresh
    setTimeout(() => {
      switchBotModalTab('switches');
      refreshBotWorkflowsStatus();
    }, 600);
  } catch (err) {
    alert(`❌ Gagal terhubung ke GitHub: ${err.message}\n\nPastikan nama repo benar dan token memiliki scope 'workflow' & 'repo'.`);
  }
};

window.refreshBotWorkflowsStatus = async function() {
  const cfg = getGitHubConfig();
  const banner = document.getElementById('botConnectionText');
  const dot = document.getElementById('botConnectionDot');

  if (!cfg.token || !cfg.repo) {
    if (banner) banner.textContent = '⚠️ GitHub Token belum diatur. Masuk ke tab "Pengaturan Akses GitHub" untuk menghubungkan.';
    if (dot) dot.className = 'pulse-dot warning';
    renderBotWorkflowsList();
    return;
  }

  if (banner) banner.textContent = `Menghubungi GitHub Actions (${cfg.repo})...`;
  if (dot) dot.className = 'pulse-dot warning';

  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.repo}/actions/workflows`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cfg.token}`
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const workflows = data.workflows || [];

    // Map by file path (e.g. .github/workflows/h_minus_1_broadcast.yml)
    cachedWorkflowStates = {};
    workflows.forEach(wf => {
      const fileName = wf.path.split('/').pop();
      cachedWorkflowStates[fileName] = {
        id: wf.id,
        name: wf.name,
        state: wf.state, // 'active' or 'disabled_manually'
        path: wf.path
      };
    });

    if (banner) banner.textContent = `🟢 Terhubung Sukses ke GitHub Actions (${cfg.repo})`;
    if (dot) dot.className = 'pulse-dot';

    renderBotWorkflowsList();
    showToast('✅ Status saklar bot berhasil diperbarui dari cloud!');
  } catch (err) {
    if (banner) banner.textContent = `❌ Gagal mengambil status: ${err.message}`;
    if (dot) dot.className = 'pulse-dot danger';
    renderBotWorkflowsList();
  }
};

function renderBotWorkflowsList() {
  const container = document.getElementById('botWorkflowsList');
  if (!container) return;

  const cfg = getGitHubConfig();
  const isConfigured = !!(cfg.token && cfg.repo);

  container.innerHTML = BOT_WORKFLOWS_DEF.map(item => {
    const wfState = cachedWorkflowStates[item.file];
    const isActive = wfState ? wfState.state === 'active' : true;
    const wfId = wfState ? wfState.id : item.file;

    return `
      <div class="workflow-card ${isActive ? 'is-active' : 'is-disabled'}">
        <div class="workflow-info">
          <div class="workflow-title-row">
            <span class="workflow-title">${item.title}</span>
            <span class="workflow-status-tag ${isActive ? 'active' : 'disabled'}">
              ${isActive ? '🟢 AKTIF' : '🔴 NONAKTIF (DIMATIKAN)'}
            </span>
          </div>
          <div class="workflow-desc">${item.desc}</div>
          <div class="workflow-cron-pill">${item.schedule}</div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <label class="toggle-switch" title="${isActive ? 'Klik untuk mematikan bot ini' : 'Klik untuk menyalakan bot ini'}">
            <input type="checkbox" ${isActive ? 'checked' : ''} ${!isConfigured ? 'disabled' : ''} onchange="toggleWorkflowSwitch('${wfId}', '${item.file}', this.checked)">
            <span class="toggle-slider"></span>
          </label>

          ${isConfigured ? `
            <button class="btn-icon" style="font-size: 0.72rem; padding: 4px 8px;" onclick="triggerWorkflowManual('${wfId}', '${item.title}')" title="Kirim siaran manual sekarang melalui GitHub Actions">
              ⚡ Test Kirim
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.toggleWorkflowSwitch = async function(workflowIdOrFile, fileName, shouldEnable) {
  const cfg = getGitHubConfig();
  if (!cfg.token || !cfg.repo) {
    alert('Harap hubungkan Token GitHub terlebih dahulu di tab Pengaturan Token!');
    refreshBotWorkflowsStatus();
    return;
  }

  const endpoint = shouldEnable ? 'enable' : 'disable';
  showToast(`⏳ Mengirim instruksi ${shouldEnable ? 'MENYALAKAN' : 'MEMATIKAN'} bot ke GitHub...`);

  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.repo}/actions/workflows/${workflowIdOrFile}/${endpoint}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cfg.token}`
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${res.status}`);
    }

    if (cachedWorkflowStates[fileName]) {
      cachedWorkflowStates[fileName].state = shouldEnable ? 'active' : 'disabled_manually';
    }

    renderBotWorkflowsList();
    showToast(`✅ Berhasil! Bot ${fileName} sekarang ${shouldEnable ? 'AKTIF 🟢' : 'NONAKTIF 🔴'}.`);
  } catch (err) {
    alert(`❌ Gagal mengubah status bot di GitHub: ${err.message}`);
    refreshBotWorkflowsStatus();
  }
};

window.quickToggleAllBot = async function(enableAll) {
  const cfg = getGitHubConfig();
  if (!cfg.token || !cfg.repo) {
    alert('Harap hubungkan Token GitHub terlebih dahulu di tab Pengaturan Token!');
    return;
  }

  const actionName = enableAll ? 'MENYALAKAN SEMUA' : 'MEMATIKAN SEMUA';
  if (!confirm(`Apakah Anda yakin ingin ${actionName} siaran bot WhatsApp otomatis di GitHub?`)) {
    return;
  }

  showToast(`⏳ Sedang ${enableAll ? 'mengaktifkan' : 'menonaktifkan'} seluruh bot cloud...`);

  const endpoint = enableAll ? 'enable' : 'disable';

  for (const item of BOT_WORKFLOWS_DEF) {
    const wfState = cachedWorkflowStates[item.file];
    const targetId = wfState ? wfState.id : item.file;

    try {
      await fetch(`https://api.github.com/repos/${cfg.repo}/actions/workflows/${targetId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${cfg.token}`
        }
      });
      if (cachedWorkflowStates[item.file]) {
        cachedWorkflowStates[item.file].state = enableAll ? 'active' : 'disabled_manually';
      }
    } catch (e) {
      console.error('Error toggling workflow:', item.file, e);
    }
  }

  renderBotWorkflowsList();
  showToast(`🎉 Seluruh bot berhasil ${enableAll ? 'DINYALAKAN 🟢' : 'DIMATIKAN 🔴'}!`);
};

window.triggerWorkflowManual = async function(workflowIdOrFile, title) {
  const cfg = getGitHubConfig();
  if (!cfg.token || !cfg.repo) return;

  if (!confirm(`Jalankan pengujian siaran [${title}] sekarang melalui server GitHub Actions?`)) return;

  showToast(`⏳ Mengirim pemicu eksekusi siaran ke GitHub...`);

  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.repo}/actions/workflows/${workflowIdOrFile}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cfg.token}`
      },
      body: JSON.stringify({ ref: 'main' })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    showToast(`🚀 Siaran [${title}] berhasil dipicu di GitHub Actions!`);
  } catch (err) {
    alert(`❌ Gagal memicu siaran di GitHub: ${err.message}`);
  }
};

/* Cloud Schedule Editor Logic */
window.loadScheduleForCloudEditor = function(offsetOrDateStr) {
  let targetDate;
  if (typeof offsetOrDateStr === 'number') {
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + offsetOrDateStr);
  } else if (typeof offsetOrDateStr === 'string' && offsetOrDateStr.includes('-')) {
    targetDate = new Date(offsetOrDateStr);
  } else {
    targetDate = new Date();
  }

  currentCloudEditorDateISO = formatDateISO(targetDate);

  const customDateInput = document.getElementById('inputCustomEditorDate');
  if (customDateInput) customDateInput.value = currentCloudEditorDateISO;

  const btnTomorrow = document.getElementById('btnEditorTomorrow');
  const btnToday = document.getElementById('btnEditorToday');
  const todayISO = formatDateISO(new Date());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = formatDateISO(tomorrow);

  if (btnToday) btnToday.className = `quick-action-btn ${currentCloudEditorDateISO === todayISO ? 'btn-blue' : ''}`;
  if (btnTomorrow) btnTomorrow.className = `quick-action-btn ${currentCloudEditorDateISO === tomorrowISO ? 'btn-blue' : ''}`;

  renderCloudEditorCards(currentCloudEditorDateISO);
};

function renderCloudEditorCards(dateISO) {
  const container = document.getElementById('cloudScheduleEditorList');
  if (!container) return;

  const dateObj = new Date(dateISO);
  const dayIndex = dateObj.getDay(); // 5 = Fri, 6 = Sat
  const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'][dayIndex];
  const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Find classes scheduled on this day or matching day_index
  const classesForDay = ACADEMIC_DATA.jadwal.filter(m => m.day_index === dayIndex || m.hari.toLowerCase().includes(dayName.toLowerCase().slice(0, 3)));

  if (classesForDay.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-secondary); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        🎉 <strong>Hari ${dayName} (${formattedDate}) bukan jadwal perkuliahan reguler.</strong>
        <p style="font-size: 0.8rem; margin-top: 4px;">Perkuliahan MIKOM 2026 aktif pada hari Jum'at & Sabtu.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary); margin-bottom: 10px;">
      📚 Daftar Mata Kuliah untuk Tanggal: <u>${formattedDate}</u>
    </div>
  ` + classesForDay.map((matkul, idx) => {
    const isOffline = (matkul.tanggal_offline || []).includes(dateISO);
    const isOnline = (matkul.tanggal_online || []).includes(dateISO);
    const isScheduledToday = isOffline || isOnline;

    const currentMeeting = (matkul.pertemuan || []).find(p => p.tanggal === dateISO) || {
      sesi: idx + 1,
      dosen_pengajar: matkul.tim_pengajar?.[0]?.nama || '',
      topik: ''
    };

    return `
      <div class="cloud-editor-card" id="editorCard_${matkul.id}">
        <div class="cloud-editor-title">
          <span>${idx + 1}️⃣ ${matkul.mata_kuliah} (${matkul.sks} SKS)</span>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer;">
            <input type="checkbox" id="chkActive_${matkul.id}" ${isScheduledToday ? 'checked' : ''} onchange="toggleMatkulScheduledState('${matkul.id}')">
            <span>${isScheduledToday ? '🟢 Kelas Masuk' : '❌ Kelas Diliburkan'}</span>
          </label>
        </div>

        <div class="cloud-editor-grid">
          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label" style="font-size: 0.76rem;">👨‍🏫 Dosen Bertugas:</label>
            <select id="selDosen_${matkul.id}" class="form-input" style="padding: 6px 10px; font-size: 0.8rem;">
              ${(matkul.tim_pengajar || []).map(d => `
                <option value="${d.nama}" ${d.nama === currentMeeting.dosen_pengajar ? 'selected' : ''}>
                  ${d.nama}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label" style="font-size: 0.76rem;">🌐 Metode Kuliah:</label>
            <select id="selMetode_${matkul.id}" class="form-input" style="padding: 6px 10px; font-size: 0.8rem;">
              <option value="Offline" ${isOffline || (!isScheduledToday && !isOnline) ? 'selected' : ''}>🟢 Tatap Muka (Ruang ${ACADEMIC_DATA.default_ruangan})</option>
              <option value="Online" ${isOnline ? 'selected' : ''}>🌐 Daring (Zoom Meeting)</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 4px;">
          <label class="form-label" style="font-size: 0.76rem;">🎯 Topik Bahasan / RPS Pertemuan ke-${currentMeeting.sesi}:</label>
          <input type="text" id="inputTopik_${matkul.id}" class="form-input" style="padding: 6px 10px; font-size: 0.8rem;" value="${currentMeeting.topik || ''}" placeholder="Topik materi kuliah...">
        </div>
      </div>
    `;
  }).join('');
}

window.toggleMatkulScheduledState = function(matkulId) {
  const chk = document.getElementById(`chkActive_${matkulId}`);
  const card = document.getElementById(`editorCard_${matkulId}`);
  if (!chk || !card) return;

  const isChecked = chk.checked;
  chk.nextElementSibling.textContent = isChecked ? '🟢 Kelas Masuk' : '❌ Kelas Diliburkan';
  card.style.opacity = isChecked ? '1' : '0.6';
};

window.saveAndSyncScheduleToCloud = async function() {
  const cfg = getGitHubConfig();
  if (!cfg.token || !cfg.repo) {
    alert('Harap hubungkan Token GitHub terlebih dahulu di tab Pengaturan Token!');
    switchBotModalTab('token');
    return;
  }

  if (!currentCloudEditorDateISO) {
    alert('Pilih tanggal perkuliahan terlebih dahulu!');
    return;
  }

  const dateObj = new Date(currentCloudEditorDateISO);
  const dayIndex = dateObj.getDay();
  const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'][dayIndex];
  const classesForDay = ACADEMIC_DATA.jadwal.filter(m => m.day_index === dayIndex || m.hari.toLowerCase().includes(dayName.toLowerCase().slice(0, 3)));

  showToast('⏳ Mempersiapkan data & menyinkronkan ke GitHub Cloud...');

  // Update ACADEMIC_DATA and generate updated JSON structure
  classesForDay.forEach(matkul => {
    const chk = document.getElementById(`chkActive_${matkul.id}`);
    const selDosen = document.getElementById(`selDosen_${matkul.id}`);
    const selMetode = document.getElementById(`selMetode_${matkul.id}`);
    const inputTopik = document.getElementById(`inputTopik_${matkul.id}`);

    if (!chk) return;

    const isClassActive = chk.checked;
    const dosenName = selDosen ? selDosen.value : matkul.tim_pengajar?.[0]?.nama;
    const metode = selMetode ? selMetode.value : 'Offline';
    const topik = inputTopik ? inputTopik.value.trim() : '';

    // 1. Remove this date from offline & online lists
    matkul.tanggal_offline = (matkul.tanggal_offline || []).filter(d => d !== currentCloudEditorDateISO);
    matkul.tanggal_online = (matkul.tanggal_online || []).filter(d => d !== currentCloudEditorDateISO);

    // 2. If active, add to correct list
    if (isClassActive) {
      if (metode === 'Online') {
        matkul.tanggal_online.push(currentCloudEditorDateISO);
        matkul.tanggal_online.sort();
      } else {
        matkul.tanggal_offline.push(currentCloudEditorDateISO);
        matkul.tanggal_offline.sort();
      }
    }

    // 3. Update pertemuan array if exists
    if (matkul.pertemuan) {
      const existingP = matkul.pertemuan.find(p => p.tanggal === currentCloudEditorDateISO);
      if (existingP) {
        existingP.dosen_pengajar = dosenName;
        existingP.metode = metode;
        if (topik) existingP.topik = topik;
      }
    }
  });

  // Prepare database JSON payload for GitHub
  const updatedDbJson = {
    kampus: ACADEMIC_DATA.kampus,
    fakultas: ACADEMIC_DATA.fakultas,
    program_studi: ACADEMIC_DATA.program_studi,
    semester: ACADEMIC_DATA.semester,
    angkatan: ACADEMIC_DATA.angkatan,
    default_zoom: ACADEMIC_DATA.default_zoom,
    default_ruangan: ACADEMIC_DATA.default_ruangan,
    jadwal_matkul: ACADEMIC_DATA.jadwal.map(m => ({
      id: m.id,
      hari: m.hari,
      jam_mulai: m.jam_mulai,
      jam_selesai: m.jam_selesai,
      mata_kuliah: m.mata_kuliah,
      tim_pengajar: m.tim_pengajar,
      tanggal_offline: m.tanggal_offline,
      tanggal_online: m.tanggal_online,
      pertemuan: m.pertemuan
    }))
  };

  try {
    // 1. Get current file SHA from GitHub
    const getRes = await fetch(`https://api.github.com/repos/${cfg.repo}/contents/data/jadwal_kuliah.json`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cfg.token}`
      }
    });

    let sha = '';
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    }

    // 2. Encode to Base64 (UTF-8 safe)
    const jsonString = JSON.stringify(updatedDbJson, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    // 3. Commit update to GitHub
    const putRes = await fetch(`https://api.github.com/repos/${cfg.repo}/contents/data/jadwal_kuliah.json`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cfg.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `chore: update jadwal & dosen pengampu ${currentCloudEditorDateISO} via Web Dashboard`,
        content: base64Content,
        sha: sha || undefined,
        branch: 'main'
      })
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${putRes.status}`);
    }

    // Refresh UI
    initTodaySpotlight();
    renderScheduleCards('today');
    renderCalendar();
    renderBroadcastTab();

    showToast(`🎉 Sukses! Data jadwal ${currentCloudEditorDateISO} telah tersinkronisasi ke server GitHub Bot.`);
    closeBotControlModal();
  } catch (err) {
    alert(`❌ Gagal menyimpan ke GitHub: ${err.message}\n\nPastikan token GitHub memiliki izin (scope) 'repo' atau 'contents:write'.`);
  }
};

