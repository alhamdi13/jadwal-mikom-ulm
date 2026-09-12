/**
 * SiJadwal - Web Dashboard Application Logic
 * Magister Ilmu Komunikasi FISIP Universitas Lambung Mangkurat Angkatan 2026
 */

document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  initClock();
  initTheme();
  initTodaySpotlight();
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

    return `
      <div class="schedule-card">
        <div>
          <div class="card-header">
            <span class="card-time-badge">⏰ ${item.hari}, ${item.jam_mulai} - ${item.jam_selesai} WITA</span>
            ${modeBadge}
          </div>

          <h3 class="card-title">${item.mata_kuliah}</h3>
          <p class="card-desc">${item.deskripsi || 'Mata kuliah inti Program Studi Magister Ilmu Komunikasi FISIP ULM.'}</p>

          <div class="card-lecturers">
            <div class="lecturer-label">Tim Dosen Pengajar:</div>
            ${(item.tim_pengajar || []).map(d => `
              <div class="lecturer-item">
                <span class="lecturer-name">${d.nama}</span>
                ${d.no_hp ? `
                  <a href="https://wa.me/${d.no_hp}?text=${encodeURIComponent(`Assalamu'alaikum Wr. Wb. Selamat Pagi Bapak/Ibu ${d.nama}.\n\nSaya mahasiswa Magister Ilmu Komunikasi FISIP ULM Angkatan 2026 ingin mengonfirmasi perkuliahan mata kuliah *${item.mata_kuliah}*. Terima kasih.`)}" target="_blank" class="wa-lecturer-link">
                    💬 Hubungi
                  </a>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card-footer">
          <div class="location-info">
            🏢 Ruang ${ACADEMIC_DATA.default_ruangan} / 🌐 Zoom
          </div>
          <div class="action-buttons">
            <a href="${ACADEMIC_DATA.default_zoom.link}" target="_blank" class="btn-icon" onclick="copyZoomInfo()">
              🚀 Zoom
            </a>
            <button class="btn-icon" onclick="copyCourseBroadcast('${item.id}')">
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

  let headerNote = data.isToday 
    ? `📢 *PENGUMUMAN PERKULIAHAN HARI INI*` 
    : `📢 *JADWAL PERKULIAHAN (PRATINJAU JUM'AT)*`;

  let modeText = data.isOnline 
    ? `🌐 *Metode: KULIAH DARING (ONLINE ZOOM)*\n🔗 Link Zoom: ${zoom.link}\n🔑 Meeting ID: ${zoom.meeting_id}\n🔐 Passcode: ${zoom.passcode}`
    : `🟢 *Metode: TATAP MUKA (OFFLINE KAMPUS)*\n🏢 Ruangan: Ruang ${ruangan} (Lantai 1)\n🏛️ Lokasi: Gedung Pascasarjana FISIP ULM`;

  let matkulListText = data.classes.map((m, idx) => {
    const lecturerNames = (m.tim_pengajar || []).map(d => d.nama).join(', ');
    return `${idx + 1}️⃣ *${m.mata_kuliah}*\n   ⏰ ${m.jam_mulai} - ${m.jam_selesai} WITA\n   👥 Dosen: ${lecturerNames}`;
  }).join('\n\n');

  return `${headerNote}
🎓 *Magister Ilmu Komunikasi FISIP ULM*
👥 Angkatan 2026
🗓️ ${dateFormatted}
━━━━━━━━━━━━━━━━━━━━

${matkulListText}

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
    if (prefill.matkul) matkulSelect.value = prefill.matkul;
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

  if (!previewBox || !typeSelect || !matkulSelect) return;

  const type = typeSelect.value;
  const matkulName = matkulSelect.value;
  const detail = detailInput.value.trim();
  const notes = notesInput.value.trim();

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

// 11. Helper Actions
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

  const text = `📚 *${matkul.mata_kuliah}*\n⏰ ${matkul.hari}, ${matkul.jam_mulai} - ${matkul.jam_selesai} WITA\n👥 Dosen: ${matkul.tim_pengajar.map(d => d.nama).join(', ')}\n🔗 Link Zoom: ${ACADEMIC_DATA.default_zoom.link}\n🏢 Ruang: ${ACADEMIC_DATA.default_ruangan}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`✅ Jadwal ${matkul.mata_kuliah} berhasil disalin!`);
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

  let msg = `📅 ${formatted}\nStatus: ${isOnline ? '🌐 ONLINE (Zoom)' : `🟢 OFFLINE (Ruang ${ACADEMIC_DATA.default_ruangan})`}\n\nDaftar Matkul:\n`;
  matkulList.forEach((m, i) => {
    msg += `${i + 1}. ${m.mata_kuliah} (${m.jam_mulai} - ${m.jam_selesai} WITA)\n`;
  });

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
