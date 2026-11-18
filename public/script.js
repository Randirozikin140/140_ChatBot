const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const chatMessages = document.getElementById("chatMessages");
const welcomeScreen = document.getElementById("welcomeScreen");

const newChatButton = document.getElementById("newChatButton");
const menuButton = document.getElementById("menuButton");
const closeSidebar = document.getElementById("closeSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// Riwayat percakapan
let conversationHistory = [];

// =====================================
// MENAMPILKAN JAWABAN MARKDOWN
// =====================================

function renderAssistantMessage(element, text) {
  if (window.marked && window.DOMPurify) {
    const html = window.marked.parse(text, {
      breaks: true,
      gfm: true,
    });

    element.innerHTML = window.DOMPurify.sanitize(html);

    element.classList.add("markdown-body");
  } else {
    // Jika CDN tidak tersedia, tampilkan teks dengan aman.
    element.textContent = text;
  }
}

// =====================================
// MENAMPILKAN PESAN
// =====================================

function addMessage(text, sender, extraClass = "") {
  const row = document.createElement("div");

  row.className =
    "message-row " + (sender === "user" ? "user-row" : "assistant-row");

  const bubble = document.createElement("div");

  bubble.className =
    "message " + (sender === "user" ? "user-message" : "assistant-message");

  if (extraClass) {
    bubble.classList.add(extraClass);
  }

  if (sender === "assistant" && !extraClass) {
    renderAssistantMessage(bubble, text);
  } else {
    bubble.textContent = text;
  }

  row.appendChild(bubble);
  chatMessages.appendChild(row);

  chatMessages.scrollTop = chatMessages.scrollHeight;

  return row;
}

// =====================================
// MEMBUKA AREA PERCAKAPAN
// =====================================

function openConversation() {
  welcomeScreen.hidden = true;
  chatMessages.hidden = false;
}

// =====================================
// ANIMASI MENGETIK
// =====================================

function showTyping() {
  const row = document.createElement("div");

  row.className = "message-row assistant-row";
  row.id = "typingIndicator";

  const bubble = document.createElement("div");

  bubble.className = "message assistant-message typing-message";

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");

    dot.className = "typing-dot";

    bubble.appendChild(dot);
  }

  row.appendChild(bubble);
  chatMessages.appendChild(row);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// =====================================
// MENGHILANGKAN ANIMASI MENGETIK
// =====================================

function hideTyping() {
  const typing = document.getElementById("typingIndicator");

  if (typing) {
    typing.remove();
  }
}

// =====================================
// MENGIRIM PESAN KE BACKEND
// =====================================

async function sendMessage(message) {
  conversationHistory.push({
    role: "user",
    content: message,
  });

  try {
    const response = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        message: conversationHistory.slice(-20),
      }),
    });

    // Membaca respons sebagai teks dahulu
    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        "Server tidak mengembalikan JSON. " +
          "Pastikan endpoint /api/chat aktif dan deployment terbaru sudah terpasang.",
      );
    }

    // Memeriksa status response
    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Terjadi kesalahan pada server.",
      );
    }

    // Memastikan AI memberikan jawaban
    if (!data.reply || typeof data.reply !== "string") {
      throw new Error("Jawaban AI tidak ditemukan.");
    }

    // Simpan jawaban ke riwayat
    conversationHistory.push({
      role: "assistant",
      content: data.reply,
    });

    return data.reply;
  } catch (error) {
    // Hapus pesan user yang gagal diproses
    if (
      conversationHistory.length > 0 &&
      conversationHistory[conversationHistory.length - 1].role === "user"
    ) {
      conversationHistory.pop();
    }

    throw error;
  }
}

// =====================================
// PROSES PENGIRIMAN PESAN
// =====================================

async function handleSendMessage(message) {
  if (!message || sendButton.disabled) {
    return;
  }

  openConversation();

  // Tampilkan pesan pengguna
  addMessage(message, "user");

  // Kosongkan kolom input
  messageInput.value = "";
  messageInput.style.height = "auto";

  // Nonaktifkan input sementara
  sendButton.disabled = true;
  messageInput.disabled = true;

  // Tampilkan animasi mengetik
  showTyping();

  try {
    const reply = await sendMessage(message);

    hideTyping();

    // Tampilkan jawaban AI
    addMessage(reply, "assistant");
  } catch (error) {
    hideTyping();

    console.error("Chatbot Error:", error);

    // Pesan error utama tetap dipertahankan
    addMessage(
      "Maaf, terjadi kesalahan. " + error.message,
      "assistant",
      "error-message",
    );
  } finally {
    // Aktifkan kembali input
    sendButton.disabled = false;
    messageInput.disabled = false;

    messageInput.focus();
  }
}

// =====================================
// FORM KIRIM PESAN
// =====================================

chatForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const message = messageInput.value.trim();

  handleSendMessage(message);
});

// =====================================
// ENTER UNTUK KIRIM PESAN
// SHIFT + ENTER UNTUK BARIS BARU
// =====================================

messageInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();

    chatForm.requestSubmit();
  }
});

// =====================================
// AUTO RESIZE TEXTAREA
// =====================================

messageInput.addEventListener("input", function () {
  this.style.height = "auto";

  this.style.height = Math.min(this.scrollHeight, 160) + "px";
});

// =====================================
// OBROLAN BARU
// =====================================

newChatButton.addEventListener("click", function () {
  conversationHistory = [];

  chatMessages.innerHTML = "";

  chatMessages.hidden = true;
  welcomeScreen.hidden = false;

  messageInput.value = "";
  messageInput.style.height = "auto";

  messageInput.disabled = false;
  sendButton.disabled = false;

  hideTyping();

  document.body.classList.remove("sidebar-open");

  messageInput.focus();
});

// =====================================
// MEMBUKA SIDEBAR
// =====================================

menuButton.addEventListener("click", function () {
  document.body.classList.toggle("sidebar-open");
});

// =====================================
// MENUTUP SIDEBAR
// =====================================

closeSidebar.addEventListener("click", function () {
  document.body.classList.remove("sidebar-open");
});

sidebarOverlay.addEventListener("click", function () {
  document.body.classList.remove("sidebar-open");
});

// =====================================
// PERTANYAAN REKOMENDASI
// =====================================

document.querySelectorAll(".suggestion-card").forEach((button) => {
  button.addEventListener("click", function () {
    const prompt = this.dataset.prompt;

    if (!prompt || sendButton.disabled) {
      return;
    }

    messageInput.value = prompt;

    chatForm.requestSubmit();
  });
});
