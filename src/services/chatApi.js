import api from "./api";

export const chatApi = {
  getMyConversation: async () => {
    const response = await api.get("/chat/my-conversation");
    return response.data;
  },

  getAdminConversations: async ({ filter = "ALL", search = "", limit = 50, offset = 0 } = {}) => {
    const response = await api.get("/chat/conversations", {
      params: { filter, search, limit, offset },
    });
    return response.data;
  },

  getConversationMessages: async (conversationId, { limit = 50, beforeMessageId = null } = {}) => {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`, {
      params: { limit, beforeMessageId },
    });
    return response.data;
  },

  sendMessage: async (conversationId, messageText) => {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
      messageText,
    });
    return response.data;
  },

  markMessagesAsRead: async (conversationId) => {
    const response = await api.put(`/chat/conversations/${conversationId}/read`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/chat/unread-count");
    return response.data;
  },
};

export default chatApi;
