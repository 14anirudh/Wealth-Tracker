import express from 'express';
import { chat, list, remove } from '../controllers/chatController.js';

const router = express.Router();

router.get('/', list);
router.post('/', chat);
router.delete('/:conversationId', remove);

export default router;

