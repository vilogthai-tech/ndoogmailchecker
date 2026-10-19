const axios = require("axios");

module.exports = async (req, res) => {
  // Memaksa Vercel untuk tidak menyimpan cache
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  
  try {
    // Tembak domain permanenmu menggunakan axios (lebih stabil dari fetch)
    const response = await axios.get("https://api.ndoo.my.id", { 
      timeout: 10000, // Naikkan timeout jadi 10 detik
      validateStatus: () => true // Biarkan ambil status apapun
    });
    
    // Jika status 200 atau 404 (terjangkau), anggap ONLINE
    if (response.status === 200 || response.status === 404) {
        return res.status(200).json({ status: "ONLINE" });
    }
    
    // Jika 502/503/Error, anggap OFFLINE
    return res.status(500).json({ status: "OFFLINE" });
    
  } catch (error) {
    // Jika benar-benar tidak ada koneksi / DNS gagal / Timeout
    return res.status(500).json({ status: "OFFLINE" });
  }
};
