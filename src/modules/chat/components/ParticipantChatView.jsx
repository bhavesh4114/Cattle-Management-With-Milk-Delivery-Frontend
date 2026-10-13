import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MessageCircle,
  Send,
  Smile,
  Check,
  CheckCheck,
  Clock,
  Shield,
  RefreshCw,
  AlertTriangle,
  MapPin,
  HelpCircle,
} from "lucide-react";
import chatApi from "../../../services/chatApi";
import { getChatSocket, initChatSocket } from "../../../services/chatSocket";

const QUICK_EMOJIS = ["👍", "🙏", "🥛", "😊", "✅", "🛵", "📦", "⏰", "❤️", "📍"];

const DELIVERY_CHIPS = [
  "🚨 Delivery Delay: Heavy traffic on route",
  "📍 Customer Unavailable: Door locked / no response",
  "🥛 Milk Shortage: Need additional packets",
  "❓ Address Query: Cannot locate delivery address",
];

const USER_CHIPS = [
  "When will today's milk be delivered?",
  "Please deliver an extra packet tomorrow.",
  "I will not be available tomorrow morning.",
  "Need help regarding my milk subscription.",
];

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

const ParticipantChatView = ({ role = "USER", title = "Admin Support Chat" }) => {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  }, []);

  // Initialize and load conversation
  const loadConversationData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatApi.getMyConversation();
      const conv = res.conversation;
      setConversation(conv);

      if (conv?.id) {
        const msgRes = await chatApi.getConversationMessages(conv.id, { limit: 100 });
        setMessages(msgRes.messages || []);

        // Mark incoming messages from Admin as read
        await chatApi.markMessagesAsRead(conv.id);

        setTimeout(() => scrollToBottom(false), 50);
      }
    } catch (err) {
      console.error("[ParticipantChatView] Failed to load chat:", err);
    } finally {
      setLoading(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    loadConversationData();
  }, [loadConversationData]);

  // Real-time socket setup
  useEffect(() => {
    const socket = initChatSocket();
    socketRef.current = socket;

    if (socket && conversation?.id) {
      // Join conversation room
      socket.emit("join_conversation", { conversationId: conversation.id });

      // Listen for incoming messages
      const handleNewMessage = (payload) => {
        if (payload.conversationId === conversation.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.message.id)) return prev;
            return [...prev, payload.message];
          });
          setTimeout(() => scrollToBottom(true), 50);

          // If message is from Admin, mark as read immediately
          if (payload.message.senderRole === "ADMIN") {
            chatApi.markMessagesAsRead(conversation.id).catch(() => {});
          }
        }
      };

      // Listen for read receipts
      const handleMessagesRead = (payload) => {
        if (payload.conversationId === conversation.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderRole !== "ADMIN" && !m.readAt
                ? { ...m, readAt: payload.readAt || new Date().toISOString() }
                : m
            )
          );
        }
      };

      // Listen for typing indicator
      const handleUserTyping = (data) => {
        if (data.conversationId === conversation.id && data.role === "ADMIN") {
          setAdminTyping(data.isTyping);
        }
      };

      // Listen for presence
      const handleUserStatus = (data) => {
        if (data.role === "ADMIN") {
          setIsAdminOnline(data.isOnline);
        }
      };

      socket.on("new_message", handleNewMessage);
      socket.on("messages_read", handleMessagesRead);
      socket.on("user_typing", handleUserTyping);
      socket.on("user_status", handleUserStatus);

      return () => {
        socket.emit("leave_conversation", { conversationId: conversation.id });
        socket.off("new_message", handleNewMessage);
        socket.off("messages_read", handleMessagesRead);
        socket.off("user_typing", handleUserTyping);
        socket.off("user_status", handleUserStatus);
      };
    }
  }, [conversation?.id, scrollToBottom]);

  // Handle typing input
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    const socket = socketRef.current || getChatSocket();
    if (socket && conversation?.id) {
      socket.emit("typing", { conversationId: conversation.id, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { conversationId: conversation.id, isTyping: false });
      }, 2000);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend) => {
    const text = (typeof textToSend === "string" ? textToSend : inputText).trim();
    if (!text || !conversation?.id || sending) return;

    setSending(true);
    setInputText("");
    setShowEmojiPicker(false);

    // Stop typing indicator
    const socket = socketRef.current || getChatSocket();
    if (socket && conversation?.id) {
      socket.emit("typing", { conversationId: conversation.id, isTyping: false });
    }

    try {
      const res = await chatApi.sendMessage(conversation.id, text);
      const newMsg = res.message;

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      console.error("[ParticipantChatView] Failed to send message:", err);
      alert("Failed to send message: " + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDateLabel = null;
    let currentGroup = [];

    messages.forEach((msg) => {
      const dateLabel = formatDateLabel(msg.createdAt);
      if (dateLabel !== currentDateLabel) {
        if (currentGroup.length > 0) {
          groups.push({ dateLabel: currentDateLabel, messages: currentGroup });
        }
        currentDateLabel = dateLabel;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ dateLabel: currentDateLabel, messages: currentGroup });
    }

    return groups;
  }, [messages]);

  const quickChips = role === "DELIVERY_BOY" ? DELIVERY_CHIPS : USER_CHIPS;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)",
        minHeight: "560px",
        background: "#efeae2",
        backgroundImage: "radial-gradient(#d1d7db 0.8px, transparent 0.8px)",
        backgroundSize: "20px 20px",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
        border: "1px solid #d1d7db",
        position: "relative",
        fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 24px",
          background: "#0c2340",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "1.2rem",
              boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
            }}
          >
            🐮
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>
                Admin Support Desk
              </h3>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: role === "DELIVERY_BOY" ? "#7c3aed" : "#2563eb",
                  color: "white",
                  fontWeight: "600",
                }}
              >
                {role === "DELIVERY_BOY" ? "Delivery Boy" : "Customer Support"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#93c5fd", marginTop: "2px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "inline-block",
                }}
              />
              <span>Live Support • Direct message with Dairy Admin</span>
            </div>
          </div>
        </div>

        <button
          onClick={loadConversationData}
          title="Refresh chat"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "8px",
            padding: "8px",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Quick Inquiry Chips for Faster Communication */}
      <div
        style={{
          background: "#ffffff",
          padding: "10px 18px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
        }}
      >
        <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "700", display: "flex", alignItems: "center", marginRight: "4px" }}>
          Quick:
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(chip)}
            disabled={sending}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "16px",
              padding: "4px 12px",
              fontSize: "0.78rem",
              fontWeight: "600",
              color: "#1e293b",
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e0f2fe";
              e.currentTarget.style.borderColor = "#38bdf8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Scrollable Message History */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {loading ? (
          <div style={{ margin: "auto", textAlign: "center", color: "#64748b" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid #cbd5e1",
                borderTopColor: "#2563eb",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            <span>Loading support messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: "380px" }}>
            <div
              style={{
                background: "white",
                padding: "24px 20px",
                borderRadius: "16px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#dbeafe",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <MessageCircle size={28} />
              </div>
              <h4 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "1.05rem" }}>
                Welcome to Support Chat!
              </h4>
              <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "#64748b", lineHeight: "1.5" }}>
                Send a message directly to Dairy Management. Whether you have delivery questions,
                delays, or special instructions, we will reply right here in real time.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#475569",
                  }}
                >
                  🔒 Private & Secure
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    color: "#166534",
                  }}
                >
                  ⚡ Instant Delivery
                </span>
              </div>
            </div>
          </div>
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <React.Fragment key={groupIdx}>
              {/* Date Pill Separator */}
              <div style={{ textAlign: "center", margin: "14px 0 8px" }}>
                <span
                  style={{
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    padding: "4px 14px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                  }}
                >
                  {group.dateLabel}
                </span>
              </div>

              {group.messages.map((msg) => {
                const isMe = msg.senderRole !== "ADMIN";

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                      margin: "2px 0",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "9px 14px",
                        borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        background: isMe ? "#dcf8c6" : "#ffffff", // WhatsApp classic bubble
                        color: "#111827",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                        fontSize: "0.92rem",
                        lineHeight: "1.45",
                        wordBreak: "break-word",
                      }}
                    >
                      {/* Sender label for Admin */}
                      {!isMe && (
                        <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#2563eb", marginBottom: "2px" }}>
                          Dairy Admin
                        </div>
                      )}

                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.messageText}</div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "4px",
                          marginTop: "3px",
                          fontSize: "0.7rem",
                          color: "#64748b",
                        }}
                      >
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMe && (
                          <span title={msg.readAt ? "Read by Admin" : "Delivered"}>
                            {msg.readAt ? (
                              <CheckCheck size={14} color="#3b82f6" strokeWidth={2.5} />
                            ) : (
                              <CheckCheck size={14} color="#94a3b8" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}

        {/* Admin Typing Indicator */}
        {adminTyping && (
          <div style={{ display: "flex", justifyContent: "flex-start", margin: "4px 0" }}>
            <div
              style={{
                background: "white",
                padding: "8px 14px",
                borderRadius: "14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                fontSize: "0.82rem",
                color: "#2563eb",
                fontStyle: "italic",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#2563eb",
                  animation: "pulse 1.2s infinite",
                }}
              />
              Dairy Admin is typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Popover */}
      {showEmojiPicker && (
        <div
          style={{
            position: "absolute",
            bottom: "74px",
            left: "24px",
            background: "white",
            borderRadius: "12px",
            padding: "10px 14px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            border: "1px solid #e2e8f0",
            display: "flex",
            gap: "8px",
            zIndex: 20,
          }}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInputText((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              style={{
                fontSize: "1.3rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 6px",
                borderRadius: "6px",
                transition: "transform 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <div
        style={{
          padding: "12px 24px",
          background: "#f0f2f5",
          borderTop: "1px solid #d1d7db",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          title="Add emoji"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            padding: "6px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s",
          }}
        >
          <Smile size={24} />
        </button>

        <div style={{ flex: 1 }}>
          <textarea
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message to Admin (Enter to send)..."
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: "22px",
              border: "1px solid #d1d7db",
              background: "white",
              fontSize: "0.92rem",
              color: "#0f172a",
              outline: "none",
              resize: "none",
              fontFamily: "inherit",
              maxHeight: "100px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || sending}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: inputText.trim() && !sending ? "#2563eb" : "#cbd5e1",
            border: "none",
            color: "white",
            cursor: inputText.trim() && !sending ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              inputText.trim() && !sending
                ? "0 4px 10px rgba(37, 99, 235, 0.3)"
                : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Send size={18} />
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default ParticipantChatView;
