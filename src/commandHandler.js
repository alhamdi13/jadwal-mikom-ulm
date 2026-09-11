import { config } from './config.js';
import {
  getFormattedDate,
  getScheduleForDate,
  getScheduleByDayName,
  searchSchedules
} from './dataService.js';
import {
  formatGroupScheduleMessage,
  formatGeneralDaySchedule,
  formatHelpMessage,
  formatZoomSearchResult
} from './messageFormatter.js';
import { executeMorningBroadcast } from './scheduler.js';

/**
 * Helper untuk mengambil teks dari berbagai tipe pesan WhatsApp (termasuk Pesan Sementara / Ephemeral)
 */
function extractMessageText(rawMsg) {
  if (!rawMsg) return '';
  let msg = rawMsg;
  if (msg.ephemeralMessage?.message) msg = msg.ephemeralMessage.message;
  if (msg.viewOnceMessage?.message) msg = msg.viewOnceMessage.message;
  if (msg.viewOnceMessageV2?.message) msg = msg.viewOnceMessageV2.message;
  if (msg.documentWithCaptionMessage?.message) msg = msg.documentWithCaptionMessage.message;
  if (msg.editedMessage?.message?.protocolMessage?.editedMessage) {
    msg = msg.editedMessage.message.protocolMessage.editedMessage;
  }

  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    ''
  );
}

/**
 * Memproses pesan masuk dari WhatsApp
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {any} msg
 */
export async function handleIncomingMessage(sock, msg) {
  try {
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? (msg.key.participant || msg.participant || 'Saya') : from;

    const body = extractMessageText(msg.message);
    const cleanBody = body.trim();
    const prefix = config.prefix || '!';

    if (!cleanBody.startsWith(prefix)) return;

    const args = cleanBody.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    console.log(`[Command] Menerima perintah: "${command}" dari ${sender} (Group: ${isGroup})`);

    switch (command) {
      case 'jadwal':
      case 'schedule': {
        const subCmd = args[0]?.toLowerCase();

        // 1. !jadwal besok
        if (subCmd === 'besok') {
          const tomorrowDate = getFormattedDate(1);
          const scheduleData = await getScheduleForDate(1);
          const replyText = formatGroupScheduleMessage(scheduleData, tomorrowDate);
          await sock.sendMessage(from, { text: replyText }, { quoted: msg });
          return;
        }

        // 2. !jadwal jumat / !jadwal sabtu / hari lainnya
        if (subCmd && (subCmd.includes('jum') || subCmd.includes('sab') || subCmd.includes('sen') || subCmd.includes('sel') || subCmd.includes('rab') || subCmd.includes('kam') || subCmd.includes('ming'))) {
          const generalData = await getScheduleByDayName(subCmd);
          const replyText = formatGeneralDaySchedule(generalData, subCmd);
          await sock.sendMessage(from, { text: replyText }, { quoted: msg });
          return;
        }

        // 3. Default: !jadwal hari ini
        const todayDate = getFormattedDate(0);
        const scheduleData = await getScheduleForDate(0);
        const replyText = formatGroupScheduleMessage(scheduleData, todayDate);
        await sock.sendMessage(from, { text: replyText }, { quoted: msg });
        break;
      }

      case 'zoom':
      case 'link':
      case 'meet':
      case 'ruangan': {
        const { default_zoom, default_ruangan, results } = await searchSchedules('');
        const replyText = formatZoomSearchResult(results, default_zoom, default_ruangan);
        await sock.sendMessage(from, { text: replyText }, { quoted: msg });
        break;
      }

      case 'cari':
      case 'search':
      case 'dosen': {
        const query = args.join(' ');
        if (!query) {
          await sock.sendMessage(
            from,
            { text: `⚠️ Mohon masukkan kata kunci.\nContoh: \`${prefix}cari Bachruddin\` atau \`${prefix}cari Filsafat\`` },
            { quoted: msg }
          );
          return;
        }

        const { results, default_zoom, default_ruangan } = await searchSchedules(query);
        if (!results || results.length === 0) {
          await sock.sendMessage(from, { text: `❌ Tidak ditemukan matkul/dosen dengan kata kunci: *"${query}"*` }, { quoted: msg });
          return;
        }

        let msgSearch = `🔍 *HASIL PENCARIAN:* _"${query}"_\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        results.forEach((item, idx) => {
          msgSearch += `*${idx + 1}. ${item.mata_kuliah}*\n`;
          msgSearch += `⏰ Hari ${item.hari}, Pukul ${item.jam_mulai} - ${item.jam_selesai} WITA\n`;
          msgSearch += `👥 Dosen: ${item.tim_pengajar.map(d => d.nama).join(', ')}\n\n`;
        });
        msgSearch += `━━━━━━━━━━━━━━━━━━━━\nKetik \`${prefix}jadwal\` untuk melihat jadwal hari ini.`;

        await sock.sendMessage(from, { text: msgSearch }, { quoted: msg });
        break;
      }

      case 'test-broadcast':
      case 'broadcast': {
        await sock.sendMessage(from, { text: '⏳ Sedang menjalankan simulasi broadcast pagi MIKOM FISIP ULM...' }, { quoted: msg });
        await executeMorningBroadcast(sock, isGroup ? from : null);
        await sock.sendMessage(from, { text: '✅ Simulasi broadcast selesai.' }, { quoted: msg });
        break;
      }

      case 'ping': {
        const start = Date.now();
        await sock.sendMessage(from, { text: `🏓 Pong! Bot SiJadwal MIKOM FISIP ULM aktif.\n⚡ Kecepatan respon: ${Date.now() - start}ms` }, { quoted: msg });
        break;
      }

      case 'help':
      case 'menu':
      case 'bantuan': {
        const helpText = formatHelpMessage(prefix);
        await sock.sendMessage(from, { text: helpText }, { quoted: msg });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[CommandHandler] Error:', err);
  }
}
