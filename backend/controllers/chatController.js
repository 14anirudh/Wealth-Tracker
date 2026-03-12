import { deleteChatConversation, listChatConversations, saveChatMessage } from '../services/chat/chatService.js';
import { logChatStep } from '../utils/chatLogger.js';

const getStatusCode = (error, fallback = 500) => error.statusCode || fallback;

export const chat = async (req, res) => {
  const traceId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  try {
    const message = `${req.body?.message || ''}`.trim();
    const conversationId = `${req.body?.conversationId || ''}`.trim() || null;

    await logChatStep('chat_route_hit', {
      traceId,
      userId: req.userId,
      route: req.originalUrl,
      method: req.method,
      conversationId,
      message,
      body: req.body,
    });

    if (!message) {
      await logChatStep('chat_route_validation_failed', {
        traceId,
        userId: req.userId,
        reason: 'message is required',
      });
      return res.status(400).json({ message: 'message is required' });
    }

    const result = await saveChatMessage(req.userId, message, conversationId, { traceId });
    await logChatStep('chat_route_response_sent', {
      traceId,
      userId: req.userId,
      conversationId: result?.conversation?.id || conversationId,
      intent: result?.intent,
      llm: result?.llm,
      assistantMessage: result?.message,
    });
    return res.json(result);
  } catch (error) {
    await logChatStep('chat_route_error', {
      traceId,
      userId: req.userId,
      error,
    });
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

