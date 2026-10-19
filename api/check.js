const axios = require("axios");

async function checkGoogle(email) {
  try {
    // 1. Dapatkan cookie dari halaman awal Google
    const getRes = await axios.get("https://accounts.google.com/signin/v2/identifier?hl=id", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    });
    const cookies = getRes.headers['set-cookie'] ? getRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : "";

    // 2. Tembak halaman web dengan cookie tersebut (untuk deteksi halaman visual)
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
          "Cookie": cookies
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    const text = String(response.data);

    // Cek Unregistered
    if (text.includes("Couldn't find your Google Account") || text.includes("Tidak dapat menemukan Akun Google")) {
      return "unregistered";
    }
    // Cek Captcha Gambar (Visual)
    if (text.includes("recaptcha/api2/payload") || text.includes("g-recaptcha") || text.includes("rc-imageselect")) {
      return "captcha";
    }
    // Cek Password
    if (text.includes('type="password"') || text.includes('name="Passwd"')) {
      return "password";
    }
    // Cek Captcha Ketik
    if (text.includes("captcha") || text.includes("verify it's you")) {
      return "unknown"; 
    }

    // JIKA WEB GAGAL MENDETEKSI (misal karena IP diblokir), BARU pakai Android API
    const androidRes = await axios.post(
      "https://android.clients.google.com/auth",
      new URLSearchParams({
        Email: email,
        EncryptedPasswd: "dummy_password_to_check",
        service: "ac2dm",
        app: "com.google.android.gms",
        client_sig: "38918a453d0719931ef8d5d482c74f8b0a5e08f5",
        callerPkg: "com.google.android.gms",
        device_country: "id",
        operatorCountry: "id",
        lang: "id",
        sdk_version: "28"
      }).toString(),
      {
        headers: {
          "User-Agent": "GoogleAuth/1.4 (walleye PQ2A.190305.002)",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );
    
    const androidText = String(androidRes.data);
    if (androidText.includes("Error=BadAuthentication")) return "password";
    if (androidText.includes("Error=Unknown") || androidText.includes("Error=NotRegistered")) return "unregistered";
    if (androidText.includes("CaptchaRequired") || androidText.includes("NeedsBrowser")) return "captcha";

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
