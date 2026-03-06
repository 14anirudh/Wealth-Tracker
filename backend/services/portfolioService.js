import Portfolio from '../models/Portfolio.js';
import { createHttpError } from './httpError.js';

export const getCurrentPortfolio = async (userId) => {
  const portfolio = await Portfolio.findOne({ userId }).sort({ createdAt: -1 });
  if (!portfolio) {
    throw createHttpError(404, 'No portfolio found');
  }
  return portfolio;
};

export const getPortfolioHistory = async (userId) => {
  return Portfolio.find({ userId }).sort({ createdAt: -1 });
};

export const createPortfolio = async (userId, body) => {
  const portfolio = new Portfolio({
    ...body,
    userId,
  });
  return portfolio.save();
};

export const updatePortfolio = async (userId, id, body) => {
  const updatedPortfolio = await Portfolio.findOneAndUpdate(
    { _id: id, userId },
    body,
    { new: true }
  );

  if (!updatedPortfolio) {
    throw createHttpError(404, 'Portfolio not found');
  }

  return updatedPortfolio;
};

export const deletePortfolio = async (userId, id) => {
  const deleted = await Portfolio.findOneAndDelete({
    _id: id,
    userId,
  });

  if (!deleted) {
    throw createHttpError(404, 'Portfolio not found');
  }
};

