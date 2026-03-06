import express from 'express';
import { getAllocations, saveMonthlyAllocation } from '../controllers/allocationController.js';

const router = express.Router();

router.get('/', getAllocations);
router.post('/:year/:month', saveMonthlyAllocation);

export default router;
    