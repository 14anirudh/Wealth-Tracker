import {
  createPortfolio,
  deletePortfolio,
  getCurrentPortfolio,
  getPortfolioHistory,
  updatePortfolio,
} from '../services/portfolioService.js';

const getStatusCode = (error, fallback = 500) => error.statusCode || fallback;

export const getCurrent = async (req, res) => {
  try {
    const result = await getCurrentPortfolio(req.userId);
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error)).json({ message: error.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const result = await getPortfolioHistory(req.userId);
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error)).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const result = await createPortfolio(req.userId, req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 400)).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const result = await updatePortfolio(req.userId, req.params.id, req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 400)).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await deletePortfolio(req.userId, req.params.id);
    return res.json({ message: 'Portfolio deleted' });
  } catch (error) {
    return res.status(getStatusCode(error)).json({ message: error.message });
  }
};

