const axios = require("axios");

async function checkGoogleWeb(email) {
  try {
    // 1. Ambil cookie awal dari halaman login
    const getRes = await axios.get("https://accounts.google.com/signin/v2/identifier?hl=id", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      validateStatus: () => true
    });
    
    // Ambil cookie dari response header
    const cookies = getRes.headers['set-cookie'] ? getRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : "";

    // 2. Kirim email dengan cookie tersebut
    const response = await axios.post(
      "https://accounts.google.com/_/signin/v2/identifier?hl=id",
      new URLSearchParams({
        identifier: email,
        flowName: "GlifWebSignIn",
        continue: "https://accounts.google.com/",
        fdm: "1"
      }).toString(),
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
          "Cookie": cookies,
          "Referer": "https://accounts.google.com/signin/v2/identifier?hl=id"
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    const text = String(response.data);
    const status = response.status;

    // --- LOGIKA DETEKSI ---
    if (text.includes("Couldn't find your Google Account") || text.includes("Tidak dapat menemukan Akun Google")) {
      return "unregistered";
    }
    if (text.includes("recaptcha/api2/payload") || text.includes("g-recaptcha") || text.includes("rc-imageselect")) {
      return "captcha";
    }
    if (text.includes('type="password"') || text.includes('name="Passwd"') || text.includes("Masukkan sandi")) {
      return "password";
    }
    if (text.includes("verify it's you") || text.includes("Verifikasi bahwa ini Anda") || text.includes("captcha")) {
      return "unknown"; // Captcha ketik
    }
    
    // Jika tidak ada yang cocok, coba baca error code dari JSON (jika Google balas JSON)
    if (text.includes("errcode") || status >= 400) {
        return "eror";
    }

    return "unknown";
  } catch (err) {
    return "eror";
  }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ result: "eror", msg: "POST only" });

  const { email } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ result: "eror", msg: "format salah" });
  }

  const result = await checkGoogleWeb(email);
  return res.json({ result, email });
};
