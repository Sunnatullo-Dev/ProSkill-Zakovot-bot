import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// .env yuklash
const dotenv = require("dotenv");
dotenv.config({ path: resolve(__dirname, "../.env") });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const COUNT = process.argv[2] || "1003";
const adminSet = new Set();
for (const raw of (process.env.ADMIN_TELEGRAM_IDS || "").split(",")) {
  const n = parseInt(raw.trim()); if (n > 0) adminSet.add(n);
}
const legacyId = parseInt(process.env.ADMIN_ID || "0");
if (legacyId > 0) adminSet.add(legacyId);
const ADMIN_IDS = [...adminSet];

if (!TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN topilmadi (.env faylini tekshiring)");
  process.exit(1);
}
if (ADMIN_IDS.length === 0) {
  console.error("❌ ADMIN_TELEGRAM_IDS topilmadi (.env faylini tekshiring)");
  process.exit(1);
}

const text =
  `🎉 Tabriklayman\\! Biz yana 100 taga ko'paydik\\!\n\n` +
  `📊 Hozirgi ko'rsatkich: *${COUNT} ta* foydalanuvchi`;

function sendMessage(chatId, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    });
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${TOKEN}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const parsed = JSON.parse(data);
          if (parsed.ok) resolve(parsed);
          else reject(new Error(parsed.description || "Telegram xatosi"));
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

console.log(`📤 ${ADMIN_IDS.length} ta adminga xabar yuborilmoqda...`);

for (const adminId of ADMIN_IDS) {
  try {
    await sendMessage(adminId, text);
    console.log(`✅ ${adminId} ga yuborildi`);
  } catch (e) {
    console.error(`❌ ${adminId} ga yuborib bo'lmadi: ${e.message}`);
  }
}

console.log("✅ Tugadi.");
