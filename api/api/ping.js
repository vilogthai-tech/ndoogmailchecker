const axios = require("axios");

module.exports = async (req, res) => {
  try {
    // Cek ke URL Tunnel Cloudflared kamu
    await axios.get("https://gossip-sleeve-bowling-antarctica.trycloudflare.com", { 
      timeout: 3000,
      validateStatus: () => true 
    });
    
    // Jika Cloudflared membalas, artinya terhubung ke Termux
    return res.status(200).json({ status: "ONLINE" });
  } catch (error) {
    // Jika timeout atau koneksi ditolak, artinya Termux mati
    return res.status(500).json({ status: "OFFLINE" });
  }
};
