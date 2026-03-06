import MonthlyReturn from '../models/Returns.js';
import { createHttpError } from './httpError.js';

export const getReturns = async (userId, monthsQuery) => {
  const months = parseInt(monthsQuery, 10) || 12;
  const returns = await MonthlyReturn.find({ userId })
    .sort({ year: -1, month: -1 })
    .limit(months);

  return returns.reverse();
};

export const createReturn = async (userId, body) => {
  const monthlyReturn = new MonthlyReturn({
    ...body,
    userId,
  });
  return monthlyReturn.save();
};

export const updateReturn = async (userId, id, body) => {
  const updatedReturn = await MonthlyReturn.findOneAndUpdate(
    { _id: id, userId },
    body,
    { new: true }
  );

  if (!updatedReturn) {
    throw createHttpError(404, 'Return entry not found');
  }

  return updatedReturn;
};

export const getReturnsSummary = async (userId) => {
  const returns = await MonthlyReturn.find({ userId })
    .sort({ year: -1, month: -1 });

  return {
    totalReturns: returns.reduce((sum, entry) => sum + entry.totalReturns, 0),
    byCategory: {
      stocks: returns.reduce((sum, entry) => sum + entry.returns.stocks, 0),
      mutualFunds: returns.reduce((sum, entry) => sum + entry.returns.mutualFunds, 0),
      commodities: returns.reduce((sum, entry) => sum + entry.returns.commodities, 0),
      bonds: returns.reduce((sum, entry) => sum + entry.returns.bonds, 0),
    },
    monthlyData: returns,
  };
};

