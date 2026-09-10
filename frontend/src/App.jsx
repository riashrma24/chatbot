import { useState, useEffect } from "react";

function App() {

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);

  function loadConversation(id) {
    setConversationId(id);
    localStorage.setItem("conversationId", id);
    fetch(`http://127.0.0.1:8000/conversations/${id}/messages`)
      .then(res => res.json())
      .then(data => setMessages(data));
  }

  function refreshConversations() {
    fetch("http://127.0.0.1:8000/conversations")
      .then(res => res.json())
      .then(data => setConversations(data));
  }

  function startNewConversation() {
    setConversationId(null);
    localStorage.removeItem("conversationId");
    setMessages([]);
  }

  useEffect(() => {
    refreshConversations();
    const savedId = localStorage.getItem("conversationId");
    if (savedId) {
      loadConversation(Number(savedId));
    }
  }, []);

  async function sendMessage() {

    if (!message.trim()) {
      return;
    }

    const userMessage = {
      role: "user",
      content: message
    };

    setMessages(prev => [
      ...prev,
      userMessage
    ]);

    const response = await fetch(
      "http://127.0.0.1:8000/chat",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          message: message,
          conversation_id: conversationId
        })
      }
    );

    const data = await response.json();
    setConversationId(data.conversation_id);
    localStorage.setItem("conversationId", data.conversation_id);
    refreshConversations();

    const botMessage = {
      role: "assistant",
      content: data.response
    };

    setMessages(prev => [
      ...prev,
      botMessage
    ]);

    setMessage("");
  }


  return (
    <div style={{ display: "flex" }}>

      <div style={{ width: "220px", borderRight: "1px solid #ccc", padding: "10px" }}>

        <button onClick={startNewConversation}>
          + New Conversation
        </button>

        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => loadConversation(c.id)}
            style={{
              fontWeight: c.id === conversationId ? "bold" : "normal",
              cursor: "pointer",
              padding: "6px 0"
            }}
          >
            {c.title}
          </div>
        ))}

      </div>

      <div style={{ flex: 1, padding: "10px" }}>

        <h1>My AI Chatbot</h1>

        <div>

          {messages.map((msg, index) => (

            <div key={index}>

              <strong>
                {msg.role === "user"
                  ? "You"
                  : "Bot"}
              </strong>

              <p>
                {msg.content}
              </p>

            </div>

          ))}

        </div>


        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask something..."
        />

        <button onClick={sendMessage}>
          Send
        </button>

      </div>

    </div>
  );
}

export default App;
