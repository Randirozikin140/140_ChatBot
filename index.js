const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, "public");

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

// File frontend untuk localhost
if (!process.env.VERCEL) {
  app.use(express.static(publicPath));
}

// ======================================
// HALAMAN UTAMA
// ======================================

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ======================================
// CEK SERVER
// ======================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server Chatbot AI aktif.",
  });
});

// ======================================
// CEK API
// ======================================

app.get("/api/chat", (req, res) => {
  res.json({
    success: true,
    message: "Chat API aktif.",
  });
});

// ======================================
// FORMAT PESAN ERROR
// ======================================

function getErrorMessage(data) {
  const error = data?.error || data?.message;

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    return error.message || JSON.stringify(error);
  }

  return "Layanan AI gagal memberikan jawaban.";
}

// ======================================
// API CHATBOT
// ======================================

app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body?.message;

    // Validasi pesan
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

    // Validasi setiap pesan
    const validMessages = messages.every(
      (item) =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    );

    if (!validMessages) {
      return res.status(400).json({
        success: false,
        message: "Format pesan tidak valid.",
      });
    }

    // API Key OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "API Key OpenRouter belum diatur.",
      });
    }

    // Model NVIDIA Nemotron
    const model =
      process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

    console.log("Menggunakan model:", model);

    // Request ke OpenRouter
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
                "Kamu adalah Chatbot AI yang ramah, " +
                "cerdas, dan membantu. " +
                "Gunakan bahasa Indonesia yang mudah dipahami. " +
                "Jawablah semua pertanyaan secara jelas, " +
                "sopan, dan informatif. " +
                "Gunakan Markdown untuk membuat jawaban " +
                "lebih terstruktur jika diperlukan.",
            },
            ...messages,
          ],

          temperature: 0.7,
          max_tokens: 2000,
          stream: false,
        }),

        signal: AbortSignal.timeout(55000),
      },
    );

    // Baca respons sebagai teks
    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.error("Respons API tidak valid:", raw);

      return res.status(502).json({
        success: false,
        message: "Respons dari OpenRouter tidak valid.",
      });
    }

    // Tangani error dari OpenRouter
    if (!response.ok) {
      console.error("OpenRouter Error:", {
        status: response.status,
        details: data,
      });

      return res.status(response.status).json({
        success: false,
        message: getErrorMessage(data),
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

    // Periksa jawaban AI
    if (!reply.trim()) {
      console.error("Jawaban AI kosong:", data);

      return res.status(502).json({
        success: false,
        message: "AI tidak memberikan jawaban.",
      });
    }

    // Kirim jawaban ke frontend
    return res.status(200).json({
      success: true,
      reply: reply,
    });
  } catch (error) {
    console.error("Server Error:", error);

    let errorMessage = "Terjadi kesalahan pada server.";

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      errorMessage = "Koneksi ke layanan AI mengalami timeout.";
    } else if (error.cause?.code === "ENOTFOUND") {
      errorMessage = "Tidak dapat terhubung ke layanan AI.";
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

// ======================================
// API TIDAK DITEMUKAN
// ======================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint API tidak ditemukan.",
  });
});

// ======================================
// GLOBAL ERROR HANDLER
// ======================================

app.use((error, req, res, next) => {
  console.error("Global Error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || (error instanceof SyntaxError ? 400 : 500)).json({
    success: false,
    message:
      error instanceof SyntaxError
        ? "Format JSON request tidak valid."
        : "Terjadi kesalahan pada server.",
  });
});

// ======================================
// EXPORT UNTUK VERCEL
// ======================================

module.exports = app;

// ======================================
// JALANKAN SERVER LOKAL
// ======================================

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}
