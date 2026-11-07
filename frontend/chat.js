
const $chat = (selector) => document.querySelector(selector);

let chatConversationId = null;
let chatSocket = null;
const displayedChatMessages = new Set();

function displayChatMessage(message) {
  if (!message || displayedChatMessages.has(String(message.id))) return;

  displayedChatMessages.add(String(message.id));

  const messagesBox = $chat("#chatMessages");
  const messageElement = document.createElement("div");

  messageElement.className =
    message.sender_type === "customer" ? "user-message" : "bot-message";

  // textContent prevents HTML or script injection.
  messageElement.textContent = message.message;

  messagesBox.appendChild(messageElement);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

async function loadCustomerChat() {
  const messagesBox = $chat("#chatMessages");

  try {
    const response = await fetch("/api/chat/conversation", {
      credentials: "same-origin"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load chat.");
    }

    chatConversationId = data.conversation.id;

    messagesBox.replaceChildren();
    displayedChatMessages.clear();

    if (data.messages && data.messages.length) {
      data.messages.forEach(displayChatMessage);
    } else {
      const welcome = document.createElement("div");
      welcome.className = "bot-message";
      welcome.textContent =
        "Hello! Welcome to FreshMart. How can we help you today?";
      messagesBox.appendChild(welcome);
    }

    // Connect only after the customer session and conversation are ready.
    if (chatSocket) {
  chatSocket.disconnect();
}

chatSocket = io({
  withCredentials: true,
  transports: ["websocket", "polling"]
});

chatSocket.on("connect", () => {
  console.log("FreshMart customer chat connected:", chatSocket.id);
});

chatSocket.on("connect_error", (error) => {
  console.error("FreshMart chat connection error:", error.message);
});

chatSocket.on("chat:new_message", (event) => {
  console.log("REAL-TIME CHAT EVENT:", event);

  if (
    String(event.conversationId) !== String(chatConversationId)
  ) {
    return;
  }

  displayChatMessage(event.message);
});

  } catch (error) {
    console.error("FreshMart chat error:", error);

    messagesBox.replaceChildren();

    const notice = document.createElement("div");
    notice.className = "bot-message";
    notice.textContent =
      "Chat is temporarily unavailable. Please refresh the page.";
    messagesBox.appendChild(notice);
  }
}

$chat("#chatLaunch").addEventListener("click", () => {
  $chat("#chatBox").classList.toggle("show");
});

$chat("#chatClose").addEventListener("click", () => {
  $chat("#chatBox").classList.remove("show");
});

$chat("#chatForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const input = $chat("#chatInput");
  const message = input.value.trim();

  if (!message) return;

  if (!chatConversationId) {
    alert("Chat is still loading. Please try again.");
    return;
  }

  input.disabled = true;

  try {
    const response = await fetch("/api/chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({
        conversationId: chatConversationId,
        message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Message could not be sent.");
    }

    // Add the saved message. The ID prevents duplicate display
    // if Socket.IO also delivers the same message.
    displayChatMessage(data.message);

    input.value = "";

  } catch (error) {
    console.error("Message sending error:", error);
    alert(error.message || "Could not send your message.");
  } finally {
    input.disabled = false;
    input.focus();
  }
});

loadCustomerChat();
