import { io } from "socket.io-client";

let socket = null;
let listeners = new Map(); // event -> Set(callbacks)

const getSocketURL = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_URL);
      return url.origin;
    } catch {
      // ignore
    }
  }
  // When in local development, connect directly to port 5100 or via proxy
  if (window.location.port === "5173") {
    return "http://localhost:5100";
  }
  return window.location.origin;
};

export const initChatSocket = () => {
  const token = localStorage.getItem("adminToken");
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  // If already connected with valid socket, reuse it
  if (socket && socket.connected) {
    return socket;
  }

  const socketUrl = getSocketURL();

  socket = io(socketUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    // Reattach any custom listeners if needed
  });

  socket.on("connect_error", (err) => {
    console.warn("[chatSocket] Connection error:", err.message);
  });

  return socket;
};

export const getChatSocket = () => {
  if (!socket || !socket.connected) {
    return initChatSocket();
  }
  return socket;
};

export const disconnectChatSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default {
  initChatSocket,
  getChatSocket,
  disconnectChatSocket,
};
