import {
  changePassword,
  getMe,
  loginUser,
  requestPasswordReset,
  registerUser,
  resetPassword,
} from '../services/authService.js';

const getStatusCode = (error, fallback = 500) => error.statusCode || fallback;

export const register = async (req, res) => {
  try {
    const result = await registerUser(req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return res.status(getStatusCode(error)).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const result = await loginUser(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error)).json({ message: error.message });
  }
};

export const me = async (req, res) => {
  try {
    const result = await getMe(req.headers.authorization);
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 401)).json({ message: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const result = await changePassword(req.body || {}, req.headers.authorization);
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 401)).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const result = await requestPasswordReset(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 400)).json({ message: error.message });
  }
};

export const resetForgotPassword = async (req, res) => {
  try {
    const result = await resetPassword(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 400)).json({ message: error.message });
  }
};
