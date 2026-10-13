import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MessageCircle,
  Send,
  Smile,
  Search,
  Check,
  CheckCheck,
  Clock,
  User as UserIcon,
  Bike,
  Truck,
  RefreshCw,
  Phone,
  Mail,
  ChevronDown,
  Shield,
  Circle,
} from "lucide-react";
import chatApi from "../../../services/chatApi";
import { getChatSocket, initChatSocket } from "../../../services/chatSocket";

const QUICK_EMOJIS = ["👍", "🙏", "🥛", "😊", "✅", "🛵", "📦", "⏰", "❤️", "📍"];

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

const AdminChatView = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | USERS | DELIVERY_BOYS
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map()); // convId -> { userName, isTyping }
  const [unreadStats, setUnreadStats] = useState({ total: 0, users: 0, deliveryBoys: 0 });

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  }, []);

  // Fetch conversations list
  const loadConversations = useCallback(async (isInitial = false) => {
    if (isInitial) setLoadingConvs(true);
    try {
      const data = await chatApi.getAdminConversations({
        filter: activeTab,
        search: searchQuery,
      });
      setConversations(data.conversations || []);
      if (data.unreadStats) {
        setUnreadStats(data.unreadStats);
      }
    } catch (err) {
      console.error("[AdminChatView] Failed to load conversations:", err);
    } finally {
      if (isInitial) setLoadingConvs(false);
    }
  }, [activeTab, searchQuery]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const data = await chatApi.getConversationMessages(convId, { limit: 100 });
      setMessages(data.messages || []);

      // Mark messages as read
      await chatApi.markMessagesAsRead(convId);

      // Decrement unread counts locally
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
      setUnreadStats((prev) => {
        const target = conversations.find((c) => c.id === convId);
        const count = target?.unreadCount || 0;
        return {
          ...prev,
          total: Math.max(0, prev.total - count),
          ...(target?.participantRole === "USER"
            ? { users: Math.max(0, prev.users - count) }
            : { deliveryBoys: Math.max(0, prev.deliveryBoys - count) }),
        };
      });

      setTimeout(() => scrollToBottom(false), 50);
    } catch (err) {
      console.error("[AdminChatView] Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [conversations, scrollToBottom]);

  // Initial setup & Socket.IO initialization
  useEffect(() => {
    loadConversations(true);

    const socket = initChatSocket();
    socketRef.current = socket;

    if (socket) {
      // Get initial online list
      socket.emit("get_online_users", (res) => {
        if (res?.onlineUserIds) {
          setOnlineUserIds(new Set(res.onlineUserIds));
        }
      });

      // Presence changes
      const handleUserStatus = (data) => {
        setOnlineUserIds((prev) => {
          const updated = new Set(prev);
          if (data.isOnline) {
            updated.add(Number(data.userId));
          } else {
            updated.delete(Number(data.userId));
          }
          return updated;
        });
      };

      // New message incoming
      const handleNewMessage = (payload) => {
        const { conversationId, message } = payload;

        // If message is in currently selected conversation
        if (selectedConv && selectedConv.id === conversationId) {
          setMessages((prev) => {
            // Avoid duplicate message if already added
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          setTimeout(() => scrollToBottom(true), 50);

          // Mark as read immediately if admin has this window open
          if (message.senderRole !== "ADMIN") {
            chatApi.markMessagesAsRead(conversationId).catch(() => {});
          }
        }

        // Update conversations list ordering & last message
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversationId);
          if (!exists) {
            // Reload list to fetch full participant object
            loadConversations();
            return prev;
          }

          return prev
            .map((c) => {
              if (c.id === conversationId) {
                const isCurrent = selectedConv && selectedConv.id === conversationId;
                return {
                  ...c,
                  lastMessage: message,
                  lastMessageAt: message.createdAt,
                  unreadCount: isCurrent ? 0 : c.unreadCount + (message.senderRole !== "ADMIN" ? 1 : 0),
                };
              }
              return c;
            })
            .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
        });
      };

      // Read receipts
      const handleMessagesRead = (payload) => {
        if (selectedConv && selectedConv.id === payload.conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderRole === "ADMIN" && !m.readAt
                ? { ...m, readAt: payload.readAt || new Date().toISOString() }
                : m
            )
          );
        }
      };

      // Typing event
      const handleUserTyping = (data) => {
        setTypingUsers((prev) => {
          const updated = new Map(prev);
          if (data.isTyping) {
            updated.set(data.conversationId, { userName: data.userName, role: data.role });
          } else {
            updated.delete(data.conversationId);
          }
          return updated;
        });
      };

      socket.on("user_status", handleUserStatus);
      socket.on("new_message", handleNewMessage);
      socket.on("messages_read", handleMessagesRead);
      socket.on("user_typing", handleUserTyping);

      return () => {
        socket.off("user_status", handleUserStatus);
        socket.off("new_message", handleNewMessage);
        socket.off("messages_read", handleMessagesRead);
        socket.off("user_typing", handleUserTyping);
      };
    }
  }, [selectedConv, loadConversations, scrollToBottom]);

  // When selected conversation changes
  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);

      // Join socket room
      const socket = socketRef.current || getChatSocket();
      if (socket) {
        socket.emit("join_conversation", { conversationId: selectedConv.id });
      }

      return () => {
        if (socket && selectedConv) {
          socket.emit("leave_conversation", { conversationId: selectedConv.id });
        }
      };
    }
  }, [selectedConv?.id]);

  // Trigger search / tab change
  useEffect(() => {
    loadConversations();
  }, [activeTab, searchQuery, loadConversations]);

  // Handle typing input
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    const socket = socketRef.current || getChatSocket();
    if (socket && selectedConv) {
      socket.emit("typing", { conversationId: selectedConv.id, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { conversationId: selectedConv.id, isTyping: false });
      }, 2000);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedConv || sending) return;

    setSending(true);
    setInputText("");
    setShowEmojiPicker(false);

    // Stop typing indicator immediately
    const socket = socketRef.current || getChatSocket();
    if (socket && selectedConv) {
      socket.emit("typing", { conversationId: selectedConv.id, isTyping: false });
    }

    try {
      const res = await chatApi.sendMessage(selectedConv.id, text);
      const newMsg = res.message;

      // Optimistically append message if not received via socket yet
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Update conversation in list
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === selectedConv.id
              ? { ...c, lastMessage: newMsg, lastMessageAt: newMsg.createdAt }
              : c
          )
          .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
      );

      setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      console.error("[AdminChatView] Failed to send message:", err);
      alert("Failed to send message: " + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  // Keydown handler: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Add emoji to input
  const handleAddEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
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

  const isSelectedOnline = selectedConv
    ? onlineUserIds.has(Number(selectedConv.participantId))
    : false;

  const currentTyping = selectedConv
    ? typingUsers.get(selectedConv.id)
    : null;

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 120px)",
        minHeight: "620px",
        background: "#f0f2f5",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        border: "1px solid #e2e8f0",
        fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
      }}
    >
      {/* ======================================================== */}
      {/* LEFT PANEL: Conversation List (WhatsApp Web Style)       */}
      {/* ======================================================== */}
      <div
        style={{
          width: "360px",
          minWidth: "320px",
          maxWidth: "400px",
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Left Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)",
              }}
            >
              <MessageCircle size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                Support Chats
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#64748b" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10b981",
                    display: "inline-block",
                  }}
                />
                Real-Time Messaging
              </div>
            </div>
          </div>

          <button
            onClick={() => loadConversations(true)}
            title="Refresh conversations"
            style={{
              background: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "7px",
              cursor: "pointer",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: "12px 16px", background: "#ffffff", borderBottom: "1px solid #f1f5f9" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#f1f5f9",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
            }}
          >
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: "0.88rem",
                color: "#1e293b",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "0 4px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs: All, Users, Delivery Boys */}
        <div
          style={{
            display: "flex",
            padding: "8px 16px",
            gap: "6px",
            background: "#ffffff",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          {[
            { id: "ALL", label: "All", count: unreadStats.total },
            { id: "USERS", label: "Users", count: unreadStats.users },
            { id: "DELIVERY_BOYS", label: "Delivery Boys", count: unreadStats.deliveryBoys },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "0.82rem",
                  fontWeight: isActive ? "700" : "500",
                  cursor: "pointer",
                  background: isActive ? "#2563eb" : "#f1f5f9",
                  color: isActive ? "white" : "#475569",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    style={{
                      background: isActive ? "white" : "#ef4444",
                      color: isActive ? "#2563eb" : "white",
                      fontSize: "0.72rem",
                      fontWeight: "800",
                      padding: "1px 6px",
                      borderRadius: "999px",
                      lineHeight: "14px",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
          {loadingConvs ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  border: "3px solid #e2e8f0",
                  borderTopColor: "#2563eb",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 12px",
                }}
              />
              <p style={{ margin: 0, fontSize: "0.88rem" }}>Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
              <MessageCircle size={36} color="#cbd5e1" style={{ marginBottom: "12px" }} />
              <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#475569" }}>
                No conversations found
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "0.82rem" }}>
                {searchQuery ? "Try a different search query." : "Messages from Users & Delivery Boys will appear here."}
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = selectedConv?.id === conv.id;
              const isUser = conv.participantRole === "USER";
              const isOnline = onlineUserIds.has(Number(conv.participantId));
              const typingInfo = typingUsers.get(conv.id);

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9",
                    background: isSelected ? "#eff6ff" : conv.unreadCount > 0 ? "#f8fafc" : "#ffffff",
                    borderLeft: isSelected ? "4px solid #2563eb" : "4px solid transparent",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = conv.unreadCount > 0 ? "#f8fafc" : "#ffffff";
                  }}
                >
                  {/* Participant Avatar */}
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "50%",
                        background: isUser
                          ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                          : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "700",
                        fontSize: "1.05rem",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                      }}
                    >
                      {conv.participant?.name ? conv.participant.name.charAt(0).toUpperCase() : "?"}
                    </div>

                    {/* Online Dot */}
                    {isOnline && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "1px",
                          right: "1px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: "#10b981",
                          border: "2px solid white",
                        }}
                      />
                    )}
                  </div>

                  {/* Conversation Meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: conv.unreadCount > 0 ? "700" : "600",
                            fontSize: "0.92rem",
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {conv.participant?.name || "Participant"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "2px 6px",
                            borderRadius: "6px",
                            fontWeight: "600",
                            background: isUser ? "#dbeafe" : "#ede9fe",
                            color: isUser ? "#1e40af" : "#5b21b6",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          {isUser ? <UserIcon size={10} /> : <Bike size={10} />}
                          {isUser ? "User" : "Delivery"}
                        </span>
                      </div>

                      <span style={{ fontSize: "0.72rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.82rem",
                          color: typingInfo ? "#2563eb" : conv.unreadCount > 0 ? "#0f172a" : "#64748b",
                          fontWeight: conv.unreadCount > 0 || typingInfo ? "600" : "400",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "190px",
                          fontStyle: typingInfo ? "italic" : "normal",
                        }}
                      >
                        {typingInfo
                          ? "typing..."
                          : conv.lastMessage
                          ? (conv.lastMessage.senderRole === "ADMIN" ? "You: " : "") + conv.lastMessage.messageText
                          : "No messages yet"}
                      </p>

                      {conv.unreadCount > 0 && (
                        <span
                          style={{
                            background: "#2563eb",
                            color: "white",
                            borderRadius: "999px",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            padding: "2px 7px",
                            minWidth: "18px",
                            textAlign: "center",
                            boxShadow: "0 2px 5px rgba(37, 99, 235, 0.3)",
                          }}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANEL: Active Chat History & Input (WhatsApp Web) */}
      {/* ======================================================== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#efeae2",
          backgroundImage: "radial-gradient(#d1d7db 0.8px, transparent 0.8px)",
          backgroundSize: "20px 20px",
          position: "relative",
        }}
      >
        {selectedConv ? (
          <>
            {/* Active Chat Header */}
            <div
              style={{
                padding: "12px 24px",
                background: "#f0f2f5",
                borderBottom: "1px solid #d1d7db",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      background:
                        selectedConv.participantRole === "USER"
                          ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                          : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "700",
                      fontSize: "1.1rem",
                    }}
                  >
                    {selectedConv.participant?.name
                      ? selectedConv.participant.name.charAt(0).toUpperCase()
                      : "?"}
                  </div>
                  {isSelectedOnline && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "1px",
                        right: "1px",
                        width: "11px",
                        height: "11px",
                        borderRadius: "50%",
                        background: "#10b981",
                        border: "2px solid white",
                      }}
                    />
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#0f172a" }}>
                      {selectedConv.participant?.name || "Participant"}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        background:
                          selectedConv.participantRole === "USER" ? "#dbeafe" : "#ede9fe",
                        color:
                          selectedConv.participantRole === "USER" ? "#1e40af" : "#5b21b6",
                      }}
                    >
                      {selectedConv.participantRole === "USER" ? "Customer" : "Delivery Boy"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                    <span style={{ fontSize: "0.78rem", color: isSelectedOnline ? "#16a34a" : "#64748b", fontWeight: isSelectedOnline ? "600" : "400" }}>
                      {isSelectedOnline ? "● Online" : "Offline"}
                    </span>
                    {selectedConv.participant?.email && (
                      <span style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Mail size={12} /> {selectedConv.participant.email}
                      </span>
                    )}
                    {selectedConv.participant?.deliveryProfile?.mobile && (
                      <span style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Phone size={12} /> {selectedConv.participant.deliveryProfile.mobile}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Right Action */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "#475569",
                    background: "#e2e8f0",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontWeight: "500",
                  }}
                >
                  Conv ID: #{selectedConv.id}
                </span>
              </div>
            </div>

            {/* Scrollable Chat History */}
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
              {loadingMessages ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
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
                  <span>Loading chat history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center", color: "#64748b", maxWidth: "340px" }}>
                  <div
                    style={{
                      background: "white",
                      padding: "16px 20px",
                      borderRadius: "12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: "600", color: "#334155" }}>
                      🔒 End-to-End Support Chat
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                      Messages between you and this participant are saved securely and delivered in real time.
                    </p>
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
                      const isMe = msg.senderRole === "ADMIN";

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
                              maxWidth: "68%",
                              padding: "9px 14px",
                              borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                              background: isMe ? "#dcf8c6" : "#ffffff", // WhatsApp classic sent bubble or white card
                              color: "#111827",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                              fontSize: "0.92rem",
                              lineHeight: "1.45",
                              wordBreak: "break-word",
                            }}
                          >
                            {/* Message Text */}
                            <div style={{ whiteSpace: "pre-wrap" }}>{msg.messageText}</div>

                            {/* Message Timestamp & Read Status */}
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
                                <span title={msg.readAt ? "Read" : "Delivered"}>
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

              {/* Typing Bubble */}
              {currentTyping && (
                <div style={{ display: "flex", justifyContent: "flex-start", margin: "4px 0" }}>
                  <div
                    style={{
                      background: "white",
                      padding: "8px 14px",
                      borderRadius: "14px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      fontSize: "0.82rem",
                      color: "#64748b",
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
                    {currentTyping.userName || "Participant"} is typing...
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
                    onClick={() => handleAddEmoji(emoji)}
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
              {/* Emoji Button */}
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
                onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
              >
                <Smile size={24} />
              </button>

              {/* Text Input */}
              <div style={{ flex: 1 }}>
                <textarea
                  rows={1}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message (Enter to send, Shift+Enter for new line)..."
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

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSendMessage}
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
          </>
        ) : (
          /* Empty State: No conversation selected (WhatsApp Web Style) */
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              padding: "40px",
              maxWidth: "460px",
            }}
          >
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: "#2563eb",
              }}
            >
              <MessageCircle size={46} />
            </div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: "700", color: "#1e293b", margin: "0 0 10px" }}>
              WhatsApp-Style Support Chat
            </h2>
            <p style={{ fontSize: "0.92rem", color: "#64748b", lineHeight: "1.6", margin: "0 0 24px" }}>
              Select a conversation from the left to read customer questions, communicate with delivery boys,
              and provide real-time updates.
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "#ffffff",
                borderRadius: "20px",
                fontSize: "0.82rem",
                color: "#475569",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <Shield size={14} color="#16a34a" />
              <span>Real-Time Socket Connection Active</span>
            </div>
          </div>
        )}
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

export default AdminChatView;
