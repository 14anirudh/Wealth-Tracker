import express from 'express';
import {
  forgotPassword,
  login,
  me,
  register,
  resetForgotPassword,
  updatePassword,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetForgotPassword);
router.get('/me', me);
router.put('/password', updatePassword);

export default router;
