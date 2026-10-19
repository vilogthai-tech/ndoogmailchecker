const axios = require("axios");

async function checkGoogle(email) {
  try {
    const response = await axios.post(
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

    const text = String(response.data);

    // 1. Deteksi Akun Terdaftar (tapi password salah)
    if (text.includes("Error=BadAuthentication")) {
      // Cek apakah Google memaksa verifikasi / captcha
      if (text.includes("CaptchaRequired") || text.includes("NeedsBrowser")) {
        return "captcha";
      }
      return "password"; 
    }
    
    // 2. Deteksi Akun Tidak Terdaftar
    if (text.includes("Error=Unknown") || text.includes("Error=NotRegistered")) {
      return "unregistered";
    }

    // 3. Jika Error=NeedsBrowser dari awal
    if (text.includes("Error=NeedsBrowser")) {
       return "captcha";
    }

    // 4. Jika HTTP Error (429 / 403 / 500)
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
