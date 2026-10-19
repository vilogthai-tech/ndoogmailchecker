const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");

// List proxy publik (HTTP/HTTPS) - Diambil dari API publik gratis
const PROXY_LIST_URL = "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt";

async function getProxyAgent() {
  try {
    const res = await axios.get(PROXY_LIST_URL, { timeout: 5000 });
    const proxies = res.data.split("\n").filter(p => p.trim() !== "");
    if (proxies.length === 0) return null;
    // Ambil 1 proxy acak
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    return new HttpsProxyAgent(`http://${randomProxy}`);
  } catch (e) {
    return null; // Jika gagal ambil proxy, lanjut tanpa proxy
  }
}

async function checkGoogle(email) {
  try {
    // Ambil proxy acak
    const agent = await getProxyAgent();
    
    const axiosConfig = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8"
      },
      timeout: 15000,
      validateStatus: () => true
    };
    
    if (agent) axiosConfig.httpsAgent = agent;

    const response = await axios.post(
      "https://accounts.google.com/_/signin/v2/identifier?hl=id",
      new URLSearchParams({
        identifier: email,
        flowName: "GlifWebSignIn",
        continue: "https://accounts.google.com/",
        fdm: "1"
      }).toString(),
      axiosConfig
    );

    const text = String(response.data);
    const httpStatus = response.status;

    // 1. Deteksi Unregistered (Tidak Terdaftar)
    if (
      text.includes("Couldn't find your Google Account") || 
      text.includes("Tidak dapat menemukan Akun Google")
    ) {
      return "unregistered";
    }

    // 2. Deteksi Captcha
    if (
      text.includes("recaptcha/api2/payload") || 
      text.includes("g-recaptcha") || 
      text.includes("rc-imageselect")
    ) {
      return "captcha";
    }

    // 3. Deteksi Halaman Password
    if (
      text.includes('type="password"') || 
      text.includes('name="Passwd"') || 
      text.includes("Masukkan sandi")
    ) {
      return "password";
    }

    // 4. Captcha Ketik
    if (text.includes("captcha") || text.includes("verify it's you")) {
      return "unknown";
    }

    // 5. Blokir IP (Fake Response)
    if (httpStatus >= 400 || text.length < 100) {
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
