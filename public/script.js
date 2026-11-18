const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const chatMessages = document.getElementById("chatMessages");
const welcomeScreen = document.getElementById("welcomeScreen");

const newChatButton = document.getElementById("newChatButton");
const menuButton = document.getElementById("menuButton");
const closeSidebar = document.getElementById("closeSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

let conversationHistory = [];

// ===================================
// MENAMPILKAN PESAN
// ===================================

function addMessage(text, sender, extraClass = "") {
  const row = document.createElement("div");

  row.className =
    "message-row " + (sender === "user" ? "user-row" : "assistant-row");

  const bubble = document.createElement("div");

  bubble.className =
    "message " +
    (sender === "user" ? "user-message" : "assistant-message") +
    " " +
    extraClass;

  bubble.textContent = text;

  row.appendChild(bubble);

  chatMessages.appendChild(row);

  chatMessages.scrollTop = chatMessages.scrollHeight;

  return row;
}

// ===================================
// MEMBUKA AREA PERCAKAPAN
// ===================================

function openConversation() {
  welcomeScreen.hidden = true;
  chatMessages.hidden = false;
}

// ===================================
// ANIMASI MENGETIK
// ===================================

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

// ===================================
// MENGHILANGKAN ANIMASI MENGETIK
// ===================================

function hideTyping() {
  const typing = document.getElementById("typingIndicator");

  if (typing) {
    typing.remove();
  }
}

// ===================================
// MENGIRIM PESAN KE BACKEND
// ===================================

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
      },

      body: JSON.stringify({
        message: conversationHistory.slice(-20),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Terjadi kesalahan pada server.",
      );
    }

    if (!data.reply || typeof data.reply !== "string") {
      throw new Error("Jawaban dari AI tidak ditemukan.");
    }

    conversationHistory.push({
      role: "assistant",
      content: data.reply,
    });

    return data.reply;
  } catch (error) {
    conversationHistory.pop();

    throw error;
  }
}

// ===================================
// PROSES PENGIRIMAN PESAN
// ===================================

async function handleSendMessage(message) {
  if (!message || sendButton.disabled) {
    return;
  }

  openConversation();

  // Tampilkan pesan pengguna
  addMessage(message, "user");

  messageInput.value = "";

  // Nonaktifkan tombol sementara
  sendButton.disabled = true;
  messageInput.disabled = true;

  showTyping();

  try {
    const reply = await sendMessage(message);

    hideTyping();

    addMessage(reply, "assistant");
  } catch (error) {
    hideTyping();

    console.error("Chatbot Error:", error);

    addMessage(
      "Maaf, terjadi kesalahan. " + error.message,
      "assistant",
      "error-message",
    );
  } finally {
    sendButton.disabled = false;
    messageInput.disabled = false;

    messageInput.focus();
  }
}

// ===================================
// FORM KIRIM PESAN
// ===================================

chatForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const message = messageInput.value.trim();

  handleSendMessage(message);
});

// ===================================
// ENTER UNTUK MENGIRIM PESAN
// SHIFT + ENTER UNTUK BARIS BARU
// ===================================

messageInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();

    chatForm.requestSubmit();
  }
});

// ===================================
// AUTO RESIZE TEXTAREA
// ===================================

messageInput.addEventListener("input", function () {
  this.style.height = "auto";

  this.style.height = Math.min(this.scrollHeight, 160) + "px";
});

// ===================================
// TOMBOL OBROLAN BARU
// ===================================

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

// ===================================
// TOMBOL BUKA SIDEBAR
// ===================================

menuButton.addEventListener("click", function () {
  document.body.classList.toggle("sidebar-open");
});

// ===================================
// TOMBOL TUTUP SIDEBAR
// ===================================

closeSidebar.addEventListener("click", function () {
  document.body.classList.remove("sidebar-open");
});

sidebarOverlay.addEventListener("click", function () {
  document.body.classList.remove("sidebar-open");
});

// ===================================
// PERTANYAAN REKOMENDASI
// ===================================

document.querySelectorAll(".suggestion-card").forEach((button) => {
  button.addEventListener("click", function () {
    const prompt = this.dataset.prompt;

    if (!prompt) return;

    messageInput.value = prompt;

    chatForm.requestSubmit();
  });
});
