const axios = require("axios");

async function checkGoogle(email) {
  try {
    // Endpoint login murni untuk mengecek email
    const url = "https://accounts.google.com/_/signin/v2/lookup";
    
    // Parameter form data (persis seperti browser)
    const formData = new URLSearchParams();
    formData.append("email", email);
    formData.append("f.req", JSON.stringify([[["TL", null, null]]]));

    const response = await axios.post(url, formData.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Accept": "*/*",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
        "Origin": "https://accounts.google.com",
        "Referer": "https://accounts.google.com/signin/v2/identifier?hl=id"
      },
      timeout: 10000,
      validateStatus: () => true
    });

    const text = String(response.data);

    // Jika respons berisi "unregistered" atau "not found" (Google kadang membalas JSON)
    if (text.includes("unregistered") || text.includes("not found") || text.includes("Unknown")) {
      return "unregistered";
    }

    // Jika ada indikator captcha
    if (text.includes("captcha") || text.includes("recaptcha")) {
      return "captcha";
    }

    // Jika respons menandakan email valid (biasanya ada indikator "password" atau "glif")
    if (text.includes("password") || text.includes("glif") || text.includes("allowed")) {
      return "password";
    }

    // Jika HTTP 429 (Rate Limit) atau error lainnya
    if (response.status >= 400) {
      return "eror";
    }

    // Fallback
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
