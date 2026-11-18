const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Halaman utama
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API Chatbot
app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body?.message;

    // Validasi format pesan
    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 30
    ) {
      return res.status(400).json({
        success: false,
        message: "Message harus berupa array yang valid.",
      });
    }

    // Validasi setiap pesan
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
        message: "Format isi pesan tidak valid.",
      });
    }

    // Memeriksa API Key
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey.includes("ISI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "API Key OpenRouter belum diatur di file .env.",
      });
    }

    // Mengirim pesan ke OpenRouter
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Title": "Chatbot AI PWS 10",
        },

        body: JSON.stringify({
          model:
            process.env.OPENROUTER_MODEL ||
            "nvidia/nemotron-3-ultra-550b-a55b:free",

          messages: [
            {
              role: "system",
              content:
                "Kamu adalah Chatbot AI bernama Chatbot AI. " +
                "Kamu menggunakan model NVIDIA Nemotron 3 Ultra. " +
                "Jawablah semua pertanyaan pengguna dengan ramah, " +
                "jelas, sopan, dan menggunakan bahasa Indonesia " +
                "yang mudah dipahami. Berikan jawaban yang " +
                "membantu dan sesuai dengan pertanyaan.",
            },
            ...messages,
          ],

          temperature: 0.7,
          max_tokens: 1000,
          stream: false,
        }),
      },
    );
