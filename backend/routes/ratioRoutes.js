import express from 'express';
import { create, list, remove, updateAlert } from '../controllers/ratioController.js';

const router = express.Router();

router.get('/', list);
router.post('/', create);
router.delete('/:id', remove);
router.put('/:id/alert', updateAlert);

export default router;
