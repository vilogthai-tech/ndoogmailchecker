const axios = require("axios");

module.exports = async (req, res) => {
  // Memaksa Vercel untuk tidak menyimpan cache (selalu real-time)
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  
  try {
    // URL Cloudflared kamu
    await axios.get("https://gossip-sleeve-bowling-antarctica.trycloudflare.com", { 
      timeout: 3000,
      validateStatus: () => true 
    });
    
    return res.status(200).json({ status: "ONLINE" });
  } catch (error) {
    return res.status(500).json({ status: "OFFLINE" });
  }
};
