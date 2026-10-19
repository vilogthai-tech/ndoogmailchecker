const axios = require("axios");

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
];

function pickUA() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

function classify(body, httpStatus) {
  const b = String(body || "");

  if (
    /Couldn'?t find your Google Account/i.test(b) ||
    /find your Google Account/i.test(b) ||
    /Tidak dapat menemukan Akun Google/i.test(b) ||
    (/Akun Google Anda/i.test(b) && /tidak ditemukan/i.test(b))
  ) return "unregistered";

  if (
    /recaptcha\/api2\/payload/i.test(b) ||
    /rc-imageselect/i.test(b) ||
    /g-recaptcha/i.test(b) ||
    /captcha-img/i.test(b) ||
    /pilih semua gambar/i.test(b) ||
    /select all images/i.test(b)
  ) return "captcha";

  if (
    /type="password"/i.test(b) ||
    /name="Passwd"/i.test(b) ||
    /Enter your password/i.test(b) ||
    /Masukkan sandi/i.test(b) ||
    /showpassword/i.test(b)
  ) return "password";

  if (
    /captcha/i.test(b) ||
    /ketikkan (teks|karakter)/i.test(b) ||
    /type the (text|characters)/i.test(b) ||
    /verify it'?s you/i.test(b) ||
    /verifikasi bahwa ini anda/i.test(b)
  ) return "unknown";

  if (httpStatus >= 400) return "eror";

  return "unknown";
}

async function attempt(email) {
  const ua = pickUA();
  const r = await axios.post(
    "https://accounts.google.com/_/signin/v2/identifier",
    new URLSearchParams({
      identifier: email,
      flowName: "GlifWebSignIn",
      continue: "https://accounts.google.com/",
      hl: "id",
      fdm: "1"
    }).toString(),
    {
      headers: {
        "User-Agent": ua,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        "Origin": "https://accounts.google.com",
        "Referer": "https://accounts.google.com/signin/v2/identifier"
      },
      timeout: 12000,
      maxRedirects: 5,
      validateStatus: () => true
    }
  );
  return { status: r.status, body: r.data };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ result: "eror", msg: "POST only" });

  const { email } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return res.status(400).json({ result: "eror", msg: "email tidak valid" });

  const MAX_RETRY = 3;
  let lastResult = "unknown";
  let lastStatus = 0;

  for (let i = 1; i <= MAX_RETRY; i++) {
    try {
      const { status, body } = await attempt(email);
      lastStatus = status;
      const result = classify(body, status);
      lastResult = result;

      if (result !== "unknown") {
        return res.json({
          result,
          email,
          attempt: i,
          http: status
        });
      }

      if (i < MAX_RETRY) {
        await new Promise(r => setTimeout(r, 800 + Math.random() * 900));
        continue;
      }
    } catch (e) {
      lastResult = "eror";
      lastStatus = -1;
      if (i < MAX_RETRY) {
        await new Promise(r => setTimeout(r, 800 + Math.random() * 900));
        continue;
      }
    }
  }

  return res.json({
    result: lastResult === "eror" ? "eror" : "unknown",
    email,
    attempt: MAX_RETRY,
    http: lastStatus,
    retried: true
  });
};
