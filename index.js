const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, "public");

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

// Menampilkan file public saat dijalankan secara lokal.
// Pada Vercel, file public disajikan melalui CDN.
if (!process.env.VERCEL) {
  app.use(express.static(publicPath));
}

// =====================================
// HALAMAN UTAMA
// =====================================

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// =====================================
// CEK SERVER
// =====================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server Chatbot AI aktif.",
  });
});

// =====================================
// CEK API CHAT
// =====================================

app.get("/api/chat", (req, res) => {
  res.json({
    success: true,
    message: "Chat API aktif.",
  });
});

// =====================================
// API CHATBOT
// =====================================

app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body?.message;

    // Validasi array pesan
    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 20
    ) {
      return res.status(400).json({
        success: false,
        message: "Message harus berupa array.",
      });
    }

    // Validasi isi pesan
    const validMessages = messages.every((item) => {
      return (
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim().length > 0
      );
    });

    if (!validMessages) {
      return res.status(400).json({
        success: false,
        message: "Format pesan tidak valid.",
      });
    }

    // Mengambil API Key
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "API Key OpenRouter belum diatur.",
      });
    }

    // Mengambil model dari environment
    // Tetap menggunakan model yang sebelumnya dipakai.
    const model =
      process.env.OPENROUTER_MODEL || "nvidia/neutron-3.5-super-v1:free";

    // Menghubungkan ke OpenRouter
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Chatbot AI PWS 10",
        },

        body: JSON.stringify({
          model: model,

          messages: [
            {
              role: "system",
              content:
                "Kamu adalah Chatbot AI yang ramah, cerdas, " +
                "dan membantu. Jawablah menggunakan bahasa " +
                "Indonesia yang mudah dipahami. Gunakan " +
                "format Markdown yang rapi seperti heading, " +
                "teks tebal, daftar, tabel, dan blok kode " +
                "jika diperlukan. Jawab sesuai pertanyaan.",
            },
            ...messages,
          ],

          temperature: 0.7,
          max_tokens: 2000,
          stream: false,
        }),
      },
    );

    // Membaca respons OpenRouter
    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.error("Respons OpenRouter bukan JSON:", raw);

      return res.status(502).json({
        success: false,
        message: "Respons dari layanan AI tidak valid.",
      });
    }

    // Menangani error dari OpenRouter
    if (!response.ok) {
      console.error("OpenRouter Error:", data);

      return res
        .status(
          response.status >= 400 && response.status <= 599
            ? response.status
            : 502,
        )
        .json({
          success: false,
          message:
            data.error?.message ||
            data.message ||
            "Gagal mendapatkan jawaban dari AI.",
        });
    }

    // Mengambil jawaban AI
    const content = data.choices?.[0]?.message?.content;

    let reply = "";

    if (typeof content === "string") {
      reply = content;
    } else if (Array.isArray(content)) {
      reply = content
        .map((item) => {
          return typeof item === "string" ? item : item.text || "";
        })
        .join("");
    }

    // Memeriksa jawaban AI
    if (!reply.trim()) {
      console.error("Jawaban AI kosong:", data);

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

    let errorMessage = "Terjadi kesalahan pada server.";

    if (error.name === "AbortError" || error.name === "TimeoutError") {
      errorMessage = "Koneksi ke layanan AI mengalami timeout.";
    } else if (
      error.cause?.code === "ECONNREFUSED" ||
      error.cause?.code === "ENOTFOUND"
    ) {
      errorMessage = "Tidak dapat terhubung ke layanan AI.";
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

// =====================================
// ERROR ROUTE API
// =====================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint API tidak ditemukan.",
  });
});

// =====================================
// GLOBAL ERROR HANDLER
// =====================================

app.use((error, req, res, next) => {
  console.error("Global Error:", error);

  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || (error instanceof SyntaxError ? 400 : 500);

  res.status(status).json({
    success: false,
    message:
      error instanceof SyntaxError
        ? "Format JSON request tidak valid."
        : "Terjadi kesalahan pada server.",
  });
});

// =====================================
// EXPORT UNTUK VERCEL
// =====================================

module.exports = app;

// =====================================
// MENJALANKAN SERVER LOKAL
// =====================================

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}
