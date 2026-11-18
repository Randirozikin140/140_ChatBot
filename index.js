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
