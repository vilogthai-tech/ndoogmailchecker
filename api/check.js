const axios = require("axios");

async function checkGoogle(email) {
  try {
    // Gunakan endpoint "signin/v2/identifier" dengan metode GET untuk mengambil cookie dan struktur HTML
    const response = await axios.post(
      "https://accounts.google.com/signin/v2/identifier?hl=id&flowName=GlifWebSignIn&flowEntry=ServiceLogin",
      new URLSearchParams({
        identifier: email,
        fdm: "1"
      }).toString(),
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8"
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    const text = String(response.data);

    // 1. Cek Unregistered
    if (
      text.includes("Couldn't find your Google Account") || 
      text.includes("Tidak dapat menemukan Akun Google")
    ) {
      return "unregistered";
    }

    // 2. Cek Captcha Gambar (Cari jejak recaptcha di HTML)
    if (
      text.includes("recaptcha/api2/payload") || 
      text.includes("g-recaptcha") || 
      text.includes("rc-imageselect") ||
      text.includes("recaptcha")
    ) {
      return "captcha";
    }

    // 3. Cek Halaman Password
    if (
      text.includes('type="password"') || 
      text.includes('name="Passwd"') || 
      text.includes("Masukkan sandi")
    ) {
      return "password";
    }

    // 4. Cek Captcha ketik / verifikasi tambahan
    if (
      text.includes("captcha") || 
      text.includes("verify it's you") ||
      text.includes("Verifikasi bahwa ini Anda")
    ) {
      return "unknown";
    }

    // 5. Jika HTTP error
    if (response.status >= 400) {
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

  const result = await checkGoogle(email);
  return res.json({ result, email });
};
