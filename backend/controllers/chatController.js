import { deleteChatConversation, listChatConversations, saveChatMessage } from '../services/chat/chatService.js';

const getStatusCode = (error, fallback = 500) => error.statusCode || fallback;

export const chat = async (req, res) => {
  try {
    const message = `${req.body?.message || ''}`.trim();
    const conversationId = `${req.body?.conversationId || ''}`.trim() || null;
    if (!message) {
      return res.status(400).json({ message: 'message is required' });
    }

    const result = await saveChatMessage(req.userId, message, conversationId);
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 400)).json({ message: error.message });
  }
};

export const list = async (req, res) => {
  try {
    const conversations = await listChatConversations(req.userId);
    return res.json({ conversations });
  } catch (error) {
    return res.status(getStatusCode(error)).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const conversationId = `${req.params?.conversationId || ''}`.trim();
    if (!conversationId) {
      return res.status(400).json({ message: 'conversationId is required' });
    }

    await deleteChatConversation(req.userId, conversationId);
    return res.json({ message: 'Conversation deleted' });
  } catch (error) {
    return res.status(getStatusCode(error, 400)).json({ message: error.message });
  }
};

