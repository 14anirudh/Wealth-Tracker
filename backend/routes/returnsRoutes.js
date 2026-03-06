import express from 'express';
import { create, list, summary, update } from '../controllers/returnsController.js';

const router = express.Router();

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.get('/summary', summary);

export default router;
