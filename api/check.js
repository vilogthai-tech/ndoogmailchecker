const axios = require("axios");

// URL dari Cloudflared yang baru saja kamu jalankan
const TERMUX_API_URL = "https://gossip-sleeve-bowling-antarctica.trycloudflare.com/check";

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

  try {
    // Tembak API yang ada di Termux
    const response = await axios.get(`${TERMUX_API_URL}?email=${encodeURIComponent(email)}`, {
      timeout: 60000, // Timeout lama karena Termux butuh waktu buka browser
      validateStatus: () => true
    });

    // Ambil status dari balasan Termux (PASSWORD, CAPTCHA, NOT_EXIST, ERROR)
    const status = response.data.status || "eror";

    // Konversi nama status agar sesuai dengan UI kita (lowercase)
    let result = "eror";
    if (status === "PASSWORD") result = "password";
    else if (status === "CAPTCHA") result = "captcha";
    else if (status === "NOT_EXIST" || status === "UNREGISTERED") result = "unregistered";
    else if (status === "UNKNOWN") result = "unknown";
    else result = "eror";

    return res.json({ result, email });
    
  } catch (err) {
    // Jika termux mati / tunnel terputus
    return res.status(500).json({ result: "eror", email, msg: err.message });
  }
};
