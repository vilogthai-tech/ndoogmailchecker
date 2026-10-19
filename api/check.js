const axios = require("axios");

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
];

function pickUA() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

function classify(body, httpStatus) {
  const b = String(body || "");

  if (
    /Couldn'?t find your Google Account/i.test(b) ||
    /find your Google Account/i.test(b) ||
    /Tidak dapat menemukan Akun Google/i.test(b)
  ) return "unregistered";

  if (
    /recaptcha\/api2\/payload/i.test(b) ||
    /rc-imageselect/i.test(b) ||
    /g-recaptcha/i.test(b) ||
    /captcha-img/i.test(b)
  ) return "captcha";

  if (
    /type="password"/i.test(b) ||
    /name="Passwd"/i.test(b) ||
    /Enter your password/i.test(b) ||
    /Masukkan sandi/i.test(b)
  ) return "password";

  if (
    /captcha/i.test(b) ||
    /verify it'?s you/i.test(b)
  ) return "unknown";

  // Jika status 400/403/429 atau body kosong, kembalikan eror
  if (httpStatus >= 400 || b.length < 50) return "eror";

  return "unknown";
}

async function attempt(email) {
  const ua = pickUA();
  
  // Menggunakan endpoint alternatif Google yang lebih stabil
  const r = await axios.post(
    "https://accounts.google.com/signin/v2/identifier?hl=id&flowName=GlifWebSignIn&flowEntry=ServiceLogin",
    new URLSearchParams({
      identifier: email,
      fdm: "1",
      continue: "https://accounts.google.com/",
      hl: "id"
    }).toString(),
    {
      headers: {
        "User-Agent": ua,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true
    }
  );
  
  // Ambil response body
  let bodyText = "";
  if (typeof r.data === "string") bodyText = r.data;
  else if (typeof r.data === "object") bodyText = JSON.stringify(r.data);
  
  return { status: r.status, body: bodyText };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ result: "eror", msg: "POST only" });

  const { email } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return res.status(400).json({ result: "eror", msg: "format salah" });

  try {
    const { status, body } = await attempt(email);
    const result = classify(body, status);
    return res.json({ result, email, http: status });
  } catch (e) {
    return res.json({ result: "eror", email, msg: e.message });
  }
};
