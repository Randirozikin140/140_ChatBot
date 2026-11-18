const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Halaman utama
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Cek koneksi API
app.get("/api/chat", (req, res) => {
  res.json({
    success: true,
    message: "Chat API aktif",
  });
});

// API Chatbot
app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body?.message;

    // Validasi pesan
    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 25
    ) {
      return res.status(400).json({
        success: false,
        message: "Message harus berupa array.",
      });
    }

    // Validasi isi array
    const valid = messages.every(
      (item) =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim().length > 0 &&
        item.content.length <= 5000,
    );

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Format pesan tidak valid.",
      });
    }

    // Ambil API Key
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "API Key OpenRouter belum diatur.",
      });
    }

    // Hubungkan ke OpenRouter
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Chatbot AI",
        },

        body: JSON.stringify({
          model:
            process.env.OPENROUTER_MODEL ||
            "nvidia/nemotron-3-ultra-550b-a55b:free",

          messages: [
            {
              role: "system",
              content:
                "Kamu adalah Chatbot AI yang ramah, " +
                "cerdas, dan membantu. " +
                "Gunakan bahasa Indonesia yang mudah " +
                "dipahami. Jawablah pertanyaan secara " +
                "jelas, sopan, dan informatif.",
            },
            ...messages,
          ],

          temperature: 0.7,
          max_tokens: 1000,
          stream: false,
        }),
      },
    );

    // Membaca respons API
    const data = await response.json().catch(() => ({}));

    // Penanganan error OpenRouter
    if (!response.ok) {
      console.error("OpenRouter Error:", data);

      return res.status(response.status).json({
        success: false,
        message: data.error?.message || "Gagal mendapatkan jawaban dari AI.",
      });
    }

    // Mengambil jawaban AI
    const content = data.choices?.[0]?.message?.content;

    let reply = "";

    if (typeof content === "string") {
      reply = content;
    } else if (Array.isArray(content)) {
      reply = content
        .map((item) => (typeof item === "string" ? item : item.text || ""))
        .join("");
    }

    if (!reply.trim()) {
      return res.status(502).json({
        success: false,
        message: "AI tidak memberikan jawaban.",
      });
    }

    // Mengirim jawaban ke frontend
    return res.status(200).json({
      success: true,
      reply: reply,
    });
  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Terjadi kesalahan pada server.",
    });
  }
});

// Export untuk Vercel
module.exports = app;

// Menjalankan server secara lokal
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}
