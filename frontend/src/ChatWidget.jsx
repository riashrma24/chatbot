import { useCallback, useEffect, useRef, useState } from "react";
import "./ChatWidget.css";

function ChatWidget({
  wsUrl = "ws://127.0.0.1:8000/ws/chat",
  restBaseUrl = "http://127.0.0.1:8000",
  siteName = "Chat",
  currentPath = typeof window !== "undefined" ? window.location.pathname : "/",
  onNavigate,
  primaryColor = "blue",
  title,
}) {
  const storageKey = `ai-chatbot:${siteName}:conversationId`;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? Number(saved) : null;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const socketRef = useRef(null);
  const currentPathRef = useRef(currentPath);
  const messagesEndRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const connectRef = useRef(null);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);


  useEffect(() => {
    if (!conversationId) return;
    fetch(`${restBaseUrl}/conversations/${conversationId}/messages`)
      .then((res) => (res.ok ? res.json() : []))
      .then((history) => {
        if (Array.isArray(history) && history.length) {
          setMessages(history.map((m) => ({ role: m.role, content: m.content })));
        }
      })
      .catch(() => { });
  }, []);

  const connect = useCallback(() => {
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(
        JSON.stringify({
          type: "init",
          site: { siteName },
          currentPath: currentPathRef.current,
        })
      );
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "conversation_id") {
        setConversationId(data.conversation_id);
        localStorage.setItem(storageKey, data.conversation_id);
        return;
      }

      if (data.type === "chunk") {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + data.content };
          return next;
        });
        return;
      }

      if (data.type === "navigate") {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: `Taking you to ${data.path}...` },
        ]);
        if (onNavigate) {
          onNavigate(data.path);
        } else {
          window.location.assign(data.path);
        }
        return;
      }

      if (data.type === "done") {
        setIsSending(false);
        return;
      }

      if (data.type === "error") {
        setIsSending(false);
        setMessages((prev) => [
          ...prev,
          { role: "system", content: data.message || "Something went wrong." },
        ]);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
      reconnectTimerRef.current = setTimeout(() => connectRef.current(), 2000);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [wsUrl]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
    };
  }, [connect]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  function sendMessage() {
    const text = draft.trim();
    if (!text || !isConnected || isSending) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setDraft("");
    setIsSending(true);

    socketRef.current.send(
      JSON.stringify({
        type: "message",
        message: text,
        conversation_id: conversationId,
        currentPath: currentPathRef.current,
      })
    );
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const widgetTitle = 'My AI chatbot';

  return (
    <div className="chat-widget" style={{ "--chat-widget-color": primaryColor }}>
      {isOpen && (
        <div className="chat-widget-panel">
          <div className="chat-widget-header">
            <div>
              <div className="chat-widget-title">{widgetTitle}</div>
            </div>
            <button
              className="chat-widget-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="chat-widget-messages">
            {messages.length === 0 && (
              <div className="chat-widget-empty">Ask me anything about {siteName}.</div>
            )}
            {messages
              .filter((msg) => msg.content !== "")
              .map((msg, i) => (
                <div key={i} className={`chat-widget-message chat-widget-message--${msg.role}`}>
                  {msg.content}
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-widget-input-row">
            <textarea
              className="chat-widget-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a query..."
              rows={1}
            />
            <button
              className="chat-widget-send"
              onClick={sendMessage}
              disabled={!isConnected || isSending || !draft.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        className="chat-widget-bubble"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        c
      </button>
    </div>
  );
}

export default ChatWidget;
