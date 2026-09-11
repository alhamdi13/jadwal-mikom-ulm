/**
 * SiJadwal - Web Dashboard Application Logic
 * Magister Ilmu Komunikasi FISIP ULM Angkatan 2026
 */

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initTheme();
  initTodaySpotlight();
  renderScheduleCards('today');
  renderCalendar();
  renderLecturerDirectory();
  initBotSimulator();
  initEventListeners();
});

// Format YYYY-MM-DD
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
    // Gunakan formatter WITA
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
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sijadwal_theme', next);
      toggleBtn.innerHTML = next === 'dark' ? '🌙' : '☀️';
    });
  }
}

// 3. Status Spotlight Hari Ini
function initTodaySpotlight() {
  const spotlightEl = document.getElementById('todaySpotlight');
  if (!spotlightEl) return;

  const today = new Date();
  const todayISO = formatDateISO(today);
  const dayIndex = today.getDay(); // 5 = Jumat, 6 = Sabtu

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
          ? `Tersedia di Zoom Meeting (${todayClasses.length} Mata Kuliah)` 
          : `Gedung FISIP - Ruang ${ACADEMIC_DATA.default_ruangan} (${todayClasses.length} Mata Kuliah)`}
      </div>
      <div>
        ${isOnline 
          ? `<a href="${ACADEMIC_DATA.default_zoom.link}" target="_blank" class="quick-action-btn btn-blue" onclick="copyZoomInfo()">🚀 Buka Zoom Meeting</a>`
          : `<button class="quick-action-btn" onclick="showToast('Lokasi: Ruang ${ACADEMIC_DATA.default_ruangan} FISIP ULM')">📍 Lokasi Ruang ${ACADEMIC_DATA.default_ruangan}</button>`}
      </div>
    `;
  } else {
    spotlightEl.className = 'status-spotlight';
    spotlightEl.innerHTML = `
      <div class="status-label">Status Hari Ini</div>
      <div class="status-title">🎉 Tidak Ada Jadwal Kuliah</div>
      <div class="status-detail">Perkuliahan MIKOM aktif setiap hari Jum'at & Sabtu.</div>
      <div>
        <button class="quick-action-btn" onclick="switchTab('jumat')">📅 Lihat Jadwal Jum'at</button>
      </div>
    `;
  }
}

// 4. Render Schedule Cards
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
    // Jika hari ini tidak ada kuliah, tampilkan jadwal Jum'at sebagai default preview
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
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
        🔍 Tidak ditemukan mata kuliah yang sesuai dengan kata kunci "${searchQuery}".
      </div>
    `;
    return;
  }

  container.innerHTML = list.map((item, idx) => {
    // Tentukan apakah Online atau Offline
    const isOnlineToday = (item.tanggal_online || []).includes(todayISO);
    const isOfflineToday = (item.tanggal_offline || []).includes(todayISO);
    
    let modeBadge = `<span class="badge-mode offline">🟢 Berselang Online/Offline</span>`;
    if (isOnlineToday) {
      modeBadge = `<span class="badge-mode online">🌐 Hari Ini: ONLINE</span>`;
    } else if (isOfflineToday) {
      modeBadge = `<span class="badge-mode offline">🟢 Hari Ini: OFFLINE</span>`;
    }

    return `
      <div class="schedule-card">
        <div>
          <div class="card-header">
            <span class="card-time-badge">⏰ ${item.hari}, ${item.jam_mulai} - ${item.jam_selesai} WITA</span>
            ${modeBadge}
          </div>

          <h3 class="card-title">${item.mata_kuliah}</h3>
          <p class="card-desc">${item.deskripsi || 'Mata kuliah inti Program Studi Magister Ilmu Komunikasi.'}</p>

          <div class="card-lecturers">
            <div class="lecturer-label">Tim Dosen Pengajar:</div>
            ${(item.tim_pengajar || []).map(d => `
              <div class="lecturer-item">
                <span class="lecturer-name">${d.nama}</span>
                ${d.no_hp ? `
                  <a href="https://wa.me/${d.no_hp}?text=${encodeURIComponent(`Assalamu'alaikum Wr. Wb. Selamat Pagi Bapak/Ibu ${d.nama}. Saya mahasiswa MIKOM ULM Angkatan 2026 ingin mengonfirmasi perkuliahan mata kuliah ${item.mata_kuliah}. Terima kasih.`)}" target="_blank" class="wa-lecturer-link">
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

// 5. Render Kalender Semester Ganjil 2026
function renderCalendar() {
  const container = document.getElementById('calendarMonthsGrid');
  if (!container) return;

  const months = [
    { name: 'September 2026', key: '2026-09' },
    { name: 'Oktober 2026', key: '2026-10' },
    { name: 'November 2026', key: '2026-11' },
    { name: 'Desember 2026', key: '2026-12' }
  ];

  // Kumpulkan seluruh tanggal unik dari data jadwal
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
                  ${isOnline ? '🌐 ONLINE (Zoom)' : '🟢 OFFLINE (G1.103)'}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// 6. Render Directory Dosen
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
            <a href="https://wa.me/${d.no_hp}?text=${encodeURIComponent(`Assalamu'alaikum Warahmatullahi Wabarakatuh,\nSelamat Pagi Bapak/Ibu ${d.nama}.\nSaya mahasiswa Magister Ilmu Komunikasi FISIP ULM Angkatan 2026 ingin mengonfirmasi jadwal perkuliahan. Terima kasih.`)}" target="_blank" class="lecturer-contact-btn">
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

// 7. Interactive WhatsApp Bot Simulator
function initBotSimulator() {
  const input = document.getElementById('simInput');
  const sendBtn = document.getElementById('simSendBtn');
  const messagesBox = document.getElementById('simMessages');

  if (!input || !sendBtn || !messagesBox) return;

  function appendChat(text, sender) {
    const div = document.createElement('div');
    div.className = `chat-bubble ${sender}`;
    div.textContent = text;
    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function handleCommand(cmd) {
    const raw = cmd.trim().toLowerCase();
    appendChat(cmd, 'user');

    setTimeout(() => {
      const zoomLink = ACADEMIC_DATA.default_zoom.link;
      const zoomId = ACADEMIC_DATA.default_zoom.meeting_id;
      const zoomPass = ACADEMIC_DATA.default_zoom.passcode;

      if (raw === '!jadwal' || raw === '!jadwal hari ini') {
        appendChat(`📢 *JADWAL KULIAH HARI INI*\n🏛️ Magister Ilmu Komunikasi FISIP ULM\nStatus: 🌐 ONLINE (Zoom Meeting)\n\n1️⃣ Filsafat Ilmu Komunikasi (14.00 - 16.30 WITA)\n2️⃣ Perspektif Komunikasi Organisasi (16.30 - 18.00 WITA)\n3️⃣ CSR dan Komunikasi Pemberdayaan (18.45 - 21.15 WITA)\n\n🔗 Link Zoom:\n${zoomLink}\n🔑 Meeting ID: ${zoomId}\n🔐 Passcode: ${zoomPass}`, 'bot');
      } else if (raw === '!jadwal besok') {
        appendChat(`📢 *JADWAL KULIAH BESOK*\n🏛️ Magister Ilmu Komunikasi FISIP ULM\nStatus: 🌐 ONLINE (Zoom Meeting)\n\n1️⃣ Perspektif dan Teori Komunikasi (08.00 - 10.30 WITA)\n2️⃣ Perspektif Psikologi Komunikasi (10.30 - 13.00 WITA)\n3️⃣ Media dan Teknologi Komunikasi (13.00 - 15.30 WITA)\n\n🔗 Link Zoom:\n${zoomLink}\n🔑 Meeting ID: ${zoomId}\n🔐 Passcode: ${zoomPass}`, 'bot');
      } else if (raw.startsWith('!zoom') || raw === '!link') {
        appendChat(`🔗 *LINK ZOOM MEETING RESMI FISIP ULM*\nTopik: ${ACADEMIC_DATA.default_zoom.topik || "Zoom Meeting Ilmu Komunikasi FISIP ULM's"}\nLink: ${zoomLink}\nMeeting ID: ${zoomId}\nPasscode: ${zoomPass}`, 'bot');
      } else if (raw.startsWith('!dosen') || raw.startsWith('!cari')) {
        appendChat(`👨‍🏫 *TIM DOSEN MIKOM FISIP ULM*\n1. Prof. Dr. H. Bachruddin Ali Ahmad, M.Si\n2. Prof. Dr. H. Budi Suryadi, M.Si\n3. Dr. Fahrianoor, S.IP., M.Si\n4. Dr. Siswanto, S.Sos., M.Si\n5. Dr. Irwansyah, S.Sos,. M.Si\n6. Dr. Muhammad Alif, M.Si\n7. Dr. Yuanita Setyastuti, S.IP., M.Si\n8. DR. Novaria Maulina, S.I Kom., M.IKom`, 'bot');
      } else if (raw === '!ping') {
        appendChat(`🏓 Pong! Bot SiJadwal MIKOM FISIP ULM aktif & responsif (12ms).`, 'bot');
      } else {
        appendChat(`🤖 *MENU BANTUAN BOT MIKOM ULM*\nPerintah:\n• !jadwal 👉 Cek jadwal kuliah hari ini\n• !jadwal besok 👉 Cek jadwal kuliah esok hari\n• !zoom 👉 Dapatkan link Zoom Meeting resmi\n• !dosen 👉 Daftar dosen pengampu\n• !ping 👉 Cek koneksi bot`, 'bot');
      }
    }, 350);
  }

  sendBtn.addEventListener('click', () => {
    if (input.value.trim()) {
      handleCommand(input.value);
      input.value = '';
    }
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      handleCommand(input.value);
      input.value = '';
    }
  });
}

// 8. Event Listeners & Navigation
function initEventListeners() {
  const searchInput = document.getElementById('searchSchedule');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderScheduleCards('all', e.target.value);
    });
  }

  // Navigation Tab Buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget.getAttribute('data-tab');
      e.currentTarget.classList.add('active');

      // Tampilkan atau sembunyikan section
      const scheduleSec = document.getElementById('scheduleSection');
      const calendarSec = document.getElementById('calendarSection');
      const lecturerSec = document.getElementById('lecturerSection');
      const botSec = document.getElementById('botHubSection');

      if (scheduleSec) scheduleSec.style.display = (target === 'calendar' || target === 'lecturers' || target === 'bot') ? 'none' : 'block';
      if (calendarSec) calendarSec.style.display = (target === 'calendar') ? 'block' : 'none';
      if (lecturerSec) lecturerSec.style.display = (target === 'lecturers') ? 'block' : 'none';
      if (botSec) botSec.style.display = (target === 'bot') ? 'block' : 'none';

      if (target !== 'calendar' && target !== 'lecturers' && target !== 'bot') {
        renderScheduleCards(target);
      }
    });
  });
}

// Global Actions & Modal Zoom Controllers
window.openZoomSettingsModal = function() {
  const overlay = document.getElementById('zoomModalOverlay');
  if (!overlay) return;

  const current = ACADEMIC_DATA.default_zoom || {};
  document.getElementById('inputZoomTopik').value = current.topik || '';
  document.getElementById('inputZoomLink').value = current.link || '';
  document.getElementById('inputZoomId').value = current.meeting_id || '';
  document.getElementById('inputZoomPass').value = current.passcode || '';
  document.getElementById('inputZoomInstruksi').value = current.instruksi_link || '';

  overlay.classList.add('active');
};

window.closeZoomModal = function(e) {
  const overlay = document.getElementById('zoomModalOverlay');
  if (overlay) overlay.classList.remove('active');
};

window.saveZoomSettings = function() {
  const topik = document.getElementById('inputZoomTopik').value.trim();
  const link = document.getElementById('inputZoomLink').value.trim();
  const meeting_id = document.getElementById('inputZoomId').value.trim();
  const passcode = document.getElementById('inputZoomPass').value.trim();
  const instruksi_link = document.getElementById('inputZoomInstruksi').value.trim();

  if (!link) {
    alert('Tautan Zoom tidak boleh kosong!');
    return;
  }

  const updated = {
    topik: topik || "Zoom Meeting Ilmu Komunikasi FISIP ULM's",
    link,
    meeting_id: meeting_id || "-",
    passcode: passcode || "-",
    instruksi_link
  };

  localStorage.setItem('sijadwal_custom_zoom', JSON.stringify(updated));
  ACADEMIC_DATA.default_zoom = updated;

  // Re-render UI
  initTodaySpotlight();
  renderScheduleCards('all');
  closeZoomModal();
  showToast('✅ Pengaturan Link Zoom berhasil diperbarui & disimpan di browser!');
};

window.resetZoomToDefault = function() {
  if (confirm('Apakah Anda yakin ingin mengembalikan link Zoom ke pengaturan default resmi ULM?')) {
    localStorage.removeItem('sijadwal_custom_zoom');
    ACADEMIC_DATA.default_zoom = { ...ACADEMIC_DATA.base_default_zoom };
    
    initTodaySpotlight();
    renderScheduleCards('all');
    closeZoomModal();
    showToast('🔄 Link Zoom telah direset ke default resmi FISIP ULM.');
  }
};

window.switchTab = function(tabName) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (btn) btn.click();
};

window.copyZoomInfo = function() {
  const text = `Zoom: ${ACADEMIC_DATA.default_zoom.link}\nID: ${ACADEMIC_DATA.default_zoom.meeting_id}\nPasscode: ${ACADEMIC_DATA.default_zoom.passcode}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ Tautan, ID, dan Passcode Zoom berhasil disalin!');
  });
};

window.copyFullBroadcastWAG = function() {
  const today = new Date();
  const text = `📢 *JADWAL KULIAH MAGISTER ILMU KOMUNIKASI FISIP ULM*\n🎓 Angkatan 2026\n🗓️ Tanggal: ${today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n━━━━━━━━━━━━━━━━━━━━\n\n1️⃣ Filsafat Ilmu Komunikasi (14.00 WITA)\n2️⃣ Perspektif Komunikasi Organisasi (16.30 WITA)\n3️⃣ CSR dan Komunikasi Pemberdayaan (18.45 WITA)\n\n🌐 Metode: ONLINE (Zoom Meeting)\n🔗 Link: ${ACADEMIC_DATA.default_zoom.link}\n🔑 ID: ${ACADEMIC_DATA.default_zoom.meeting_id} | Pass: ${ACADEMIC_DATA.default_zoom.passcode}\n\nSelamat belajar & sukses! ✨`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ Format Pesan Broadcast WAG berhasil disalin ke Clipboard!');
  });
};

window.copyCourseBroadcast = function(courseId) {
  const matkul = ACADEMIC_DATA.jadwal.find(m => m.id === courseId);
  if (!matkul) return;

  const text = `📚 *${matkul.mata_kuliah}*\n⏰ ${matkul.hari}, ${matkul.jam_mulai} - ${matkul.jam_selesai} WITA\n👥 Dosen: ${matkul.tim_pengajar.map(d => d.nama).join(', ')}\n🔗 Link Zoom: ${ACADEMIC_DATA.default_zoom.link}\n🏢 Ruang: ${ACADEMIC_DATA.default_ruangan}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`✅ Jadwal ${matkul.mata_kuliah} berhasil disalin!`);
  });
};

window.showDateModal = function(dateStr) {
  const matkulList = ACADEMIC_DATA.jadwal.filter(m => 
    (m.tanggal_offline || []).includes(dateStr) || (m.tanggal_online || []).includes(dateStr)
  );

  const isOnline = matkulList.some(m => (m.tanggal_online || []).includes(dateStr));
  const dateObj = new Date(dateStr);
  const formatted = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let msg = `📅 ${formatted}\nStatus: ${isOnline ? '🌐 ONLINE (Zoom)' : '🟢 OFFLINE (Ruang G1.103)'}\n\nDaftar Matkul:\n`;
  matkulList.forEach((m, i) => {
    msg += `${i + 1}. ${m.mata_kuliah} (${m.jam_mulai} - ${m.jam_selesai} WITA)\n`;
  });

  alert(msg);
};

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
