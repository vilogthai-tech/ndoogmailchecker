module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const response = await fetch("https://api.ndoo.my.id", { 
      method: 'GET',
      signal: AbortSignal.timeout(3000) 
    });
    if (response.ok) return res.status(200).json({ status: "ONLINE" });
    return res.status(500).json({ status: "OFFLINE" });
  } catch (error) {
    return res.status(500).json({ status: "OFFLINE" });
  }
};
