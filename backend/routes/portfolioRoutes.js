import express from 'express';
import { create, getCurrent, getHistory, remove, update } from '../controllers/portfolioController.js';

const router = express.Router();

router.get('/current', getCurrent);
router.get('/history', getHistory);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
