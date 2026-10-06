/**
 * Google Apps Script - Backend Database SiJadwal MIKOM ULM
 * Menyimpan dan menyinkronkan data tugas & link Google Drive secara otomatis ke Google Sheet.
 * 
 * CARA MEMASANG:
 * 1. Buat Google Sheet baru di Google Drive Anda (misal: "Database Tugas SiJadwal MIKOM 2026").
 * 2. Di menu atas Google Sheet, klik "Ekstensi" (Extensions) > "Apps Script".
 * 3. Hapus semua kode yang ada di editor Apps Script, lalu tempelkan (paste) seluruh kode di bawah ini.
 * 4. Klik tombol "Simpan" (ikon disket).
 * 5. Klik tombol biru "Terapkan" (Deploy) di kanan atas > Pilih "Deployment baru" (New deployment).
 * 6. Pilih jenis: "Aplikasi Web" (Web app).
 * 7. Konfigurasi Deployment:
 *    - Deskripsi: "API Database Papan Tugas SiJadwal"
 *    - Jalankan sebagai (Execute as): "Saya" (Me)
 *    - Siapa yang memiliki akses (Who has access): "Siapa saja" (Anyone) -> SANGAT PENTING!
 * 8. Klik "Terapkan" (Deploy) dan salin "URL Aplikasi Web" (Web App URL) yang dihasilkan.
 * 9. Tempelkan URL tersebut ke pengaturan SiJadwal!
 */

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("DaftarTugas");
  if (!sheet) {
    sheet = ss.insertSheet("DaftarTugas");
  }

  // Header Kolom
  const headers = [
    "id",
    "matkul",
    "title",
    "deadline",
    "pekan",
    "driveUrl",
    "notes",
    "completed",
    "createdAt"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}

// 1. Endpoint GET: Mengambil seluruh data tugas untuk ditampilkan di Web
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("DaftarTugas");
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName("DaftarTugas");
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      // Sheet masih kosong (hanya header), return array kosong
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0];
    const tasks = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] && !row[2]) continue; // Lewati baris kosong

      const task = {
        id: String(row[0] || "task-" + i),
        matkul: String(row[1] || "Tugas Umum"),
        title: String(row[2] || ""),
        deadline: String(row[3] || ""),
        pekan: row[4] ? String(row[4]) : "current",
        driveUrl: String(row[5] || ""),
        notes: String(row[6] || ""),
        completed: row[7] === true || String(row[7]).toLowerCase() === "true",
        createdAt: row[8] ? String(row[8]) : new Date().toISOString()
      };
      tasks.push(task);
    }

    return ContentService.createTextOutput(JSON.stringify(tasks))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. Endpoint POST: Menyimpan / Meng-update tugas dari Web ke Google Sheet
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("DaftarTugas");
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName("DaftarTugas");
    }

    const postData = JSON.parse(e.postData.contents);
    let tasksToSave = [];

    if (Array.isArray(postData)) {
      tasksToSave = postData;
    } else if (postData.tasks && Array.isArray(postData.tasks)) {
      tasksToSave = postData.tasks;
    } else if (postData.task) {
      tasksToSave = [postData.task];
    }

    // Bersihkan data lama (kecuali header baris 1)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
    }

    if (tasksToSave.length > 0) {
      const rows = tasksToSave.map((t, idx) => [
        t.id || "task-" + (idx + 1),
        t.matkul || "",
        t.title || "",
        t.deadline || "",
        t.pekan || "current",
        t.driveUrl || "",
        t.notes || "",
        t.completed ? true : false,
        t.createdAt || new Date().toISOString()
      ]);

      sheet.getRange(2, 1, rows.length, 9).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data tugas berhasil disimpan ke Google Sheet!",
      count: tasksToSave.length,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
