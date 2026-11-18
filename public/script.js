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

// Tampilkan pesan
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

// Buka percakapan
function openConversation() {
  welcomeScreen.hidden = true;
  chatMessages.hidden = false;
}

// Animasi mengetik
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

// Hapus animasi
function hideTyping() {
  document.getElementById("typingIndicator")?.remove();
}

// Mengirim pesan ke backend
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

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Server tidak mengembalikan JSON. Periksa endpoint API dan deployment.",
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Terjadi kesalahan pada server.",
      );
    }

    if (!data.reply || typeof data.reply !== "string") {
      throw new Error("Jawaban AI tidak ditemukan.");
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

// Proses pengiriman pesan
async function handleSendMessage(message) {
  if (!message || sendButton.disabled) return;

  openConversation();

  addMessage(message, "user");

  messageInput.value = "";
  messageInput.style.height = "auto";

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

// Form kirim pesan
chatForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const message = messageInput.value.trim();

  handleSendMessage(message);
});

// Enter untuk mengirim, Shift + Enter untuk baris baru
messageInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

// Auto resize input
messageInput.addEventListener("input", function () {
  this.style.height = "auto";

  this.style.height = Math.min(this.scrollHeight, 160) + "px";
});

// Obrolan baru
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

// Buka sidebar
menuButton.addEventListener("click", function () {
  document.body.classList.toggle("sidebar-open");
});

// Tutup sidebar
closeSidebar.addEventListener("click", function () {
  document.body.classList.remove("sidebar-open");
});

sidebarOverlay.addEventListener("click", function () {
  document.body.classList.remove("sidebar-open");
});

// Tombol pertanyaan rekomendasi
document.querySelectorAll(".suggestion-card").forEach((button) => {
  button.addEventListener("click", function () {
    const prompt = this.dataset.prompt;

    if (!prompt || sendButton.disabled) return;

    messageInput.value = prompt;
    chatForm.requestSubmit();
  });
});
