import Allocation from '../models/Allocation.js';
import Portfolio from '../models/Portfolio.js';
import { createHttpError } from './httpError.js';

const applyInvestmentAllocations = async (userId, investments = []) => {
  if (!investments.length) return;

  const portfolio = await Portfolio.findOne({ userId }).sort({ createdAt: -1 });
  if (!portfolio) return;

  investments.forEach((item) => {
    const { portfolioCategory, portfolioName, amount } = item;
    if (!portfolioCategory || !portfolioName || !amount || amount <= 0) return;

    const [root, sub] = portfolioCategory.split('.');
    if (root === 'equity') {
      if (sub === 'directStocks') {
        const list = portfolio.equity.directStocks || [];
        let holding = list.find((h) => h.name === portfolioName);
        if (!holding) {
          holding = { name: portfolioName, invested: 0, current: 0 };
          list.push(holding);
          portfolio.equity.directStocks = list;
        }
        holding.invested += amount;
        holding.current += amount;
      } else if (sub === 'mutualFunds') {
        const list = portfolio.equity.mutualFunds || [];
        let holding = list.find((h) => h.name === portfolioName || h.type === portfolioName);
        if (!holding) {
          holding = { name: portfolioName, type: portfolioName, invested: 0, current: 0 };
          list.push(holding);
          portfolio.equity.mutualFunds = list;
        }
        holding.invested += amount;
        holding.current += amount;
      }
    } else if (root === 'nonEquity') {
      if (sub === 'fixedIncomeAssets') {
        const list = portfolio.nonEquity.fixedIncomeAssets || [];
        let holding = list.find((h) => h.name === portfolioName);
        if (!holding) {
          holding = { name: portfolioName, invested: 0, current: 0 };
          list.push(holding);
          portfolio.nonEquity.fixedIncomeAssets = list;
        }
        holding.invested += amount;
        holding.current += amount;
      } else if (sub === 'cash') {
        portfolio.nonEquity.cash.invested += amount;
        portfolio.nonEquity.cash.current += amount;
      } else if (sub === 'gold') {
        portfolio.nonEquity.commodities.gold.invested += amount;
        portfolio.nonEquity.commodities.gold.current += amount;
      } else if (sub === 'silver') {
        portfolio.nonEquity.commodities.silver.invested += amount;
        portfolio.nonEquity.commodities.silver.current += amount;
      }
    }
  });

  await portfolio.save();
};

export const getAllocationsByYear = async (userId, yearQuery) => {
  const year = parseInt(yearQuery, 10);
  if (!year) {
    throw createHttpError(400, 'year query parameter is required');
  }

  const doc = await Allocation.findOne({ userId, year });
  if (!doc) {
    return { userId, year, months: [] };
  }
  return doc;
};

export const upsertMonthlyAllocation = async (userId, yearParam, monthParam, body = {}) => {
  const year = parseInt(yearParam, 10);
  const month = parseInt(monthParam, 10);
  const { salary, investments = [], savings = [], personalExpenses = [], monthlyNeeds = [] } = body;

  if (!year || !month) {
    throw createHttpError(400, 'Year and month are required');
  }

  if (typeof salary !== 'number' || salary <= 0) {
    throw createHttpError(400, 'Salary must be a positive number');
  }

  let doc = await Allocation.findOne({ userId, year });
  if (!doc) {
    doc = new Allocation({
      userId,
      year,
      months: [],
    });
  }

  const existingIndex = doc.months.findIndex((m) => m.month === month);
  const monthData = {
    month,
    salary,
    investments,
    savings,
    personalExpenses,
    monthlyNeeds,
  };

  if (existingIndex >= 0) {
    doc.months[existingIndex] = monthData;
  } else {
    doc.months.push(monthData);
  }

  await applyInvestmentAllocations(userId, investments);
  return doc.save();
};

