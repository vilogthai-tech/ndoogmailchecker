const axios = require("axios");

// Menggunakan endpoint Android Mobile API yang jauh lebih stabil
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

    // Jika Google merespons dengan Error=BadAuthentication, berarti format email valid & terdaftar
    if (text.includes("Error=BadAuthentication")) {
      return "password"; 
    }
    
    // Jika Google meminta verifikasi tambahan / captcha
    if (text.includes("Error=NeedsBrowser") || text.includes("Error=CaptchaRequired")) {
      return "captcha";
    }

    // Jika email tidak terdaftar
    if (text.includes("Error=Unknown") || text.includes("Error=NotRegistered")) {
      return "unregistered";
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
