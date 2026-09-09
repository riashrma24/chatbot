import { useState } from "react";

function App() {

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

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
          message: message
        })
      }
    );

    const data = await response.json();

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
    <div>

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
  );
}

export default App;