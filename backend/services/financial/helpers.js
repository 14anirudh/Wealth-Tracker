import Allocation from '../../models/Allocation.js';
import Portfolio from '../../models/Portfolio.js';

export const CASH_FLOW_LOOKBACK_MONTHS = 5;

const toNumber = (value) => (Number.isFinite(value) ? value : Number(value) || 0);

export const roundTo = (value, digits = 2) => {
  const base = 10 ** digits;
  return Math.round(toNumber(value) * base) / base;
};

export const toPercent = (part, total) => {
  const safeTotal = toNumber(total);
  if (safeTotal <= 0) return 0;
  return roundTo((toNumber(part) / safeTotal) * 100, 2);
};

export const buildTrend = (values = [], tolerancePercent = 2) => {
  if (!Array.isArray(values) || values.length < 2) return 'stable';
  const first = toNumber(values[0]);
  const last = toNumber(values[values.length - 1]);
  if (first <= 0) return 'stable';

  const changePercent = ((last - first) / first) * 100;
  if (Math.abs(changePercent) <= tolerancePercent) return 'stable';
  return changePercent > 0 ? 'improving' : 'declining';
};

export const getRecentCashFlowMetrics = async (userId, limit = CASH_FLOW_LOOKBACK_MONTHS) => {
  const months = await Allocation.aggregate([
    { $match: { userId } },
    { $unwind: '$months' },
    {
      $project: {
        _id: 0,
        year: '$year',
        month: '$months.month',
        salary: { $ifNull: ['$months.salary', 0] },
        investmentsTotal: {
          $sum: {
            $map: {
              input: { $ifNull: ['$months.investments', []] },
              as: 'item',
              in: { $ifNull: ['$$item.amount', 0] },
            },
          },
        },
        savingsTotal: {
          $sum: {
            $map: {
              input: { $ifNull: ['$months.savings', []] },
              as: 'item',
              in: { $ifNull: ['$$item.amount', 0] },
            },
          },
        },
        personalExpensesTotal: {
          $sum: {
            $map: {
              input: { $ifNull: ['$months.personalExpenses', []] },
              as: 'item',
              in: { $ifNull: ['$$item.amount', 0] },
            },
          },
        },
        monthlyNeedsTotal: {
          $sum: {
            $map: {
              input: { $ifNull: ['$months.monthlyNeeds', []] },
              as: 'item',
              in: { $ifNull: ['$$item.amount', 0] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        sortKey: { $add: [{ $multiply: ['$year', 100] }, '$month'] },
      },
    },
    { $sort: { sortKey: -1 } },
    { $limit: limit },
    { $sort: { sortKey: 1 } },
    {
      $addFields: {
        totalExpenses: { $add: ['$monthlyNeedsTotal', '$personalExpensesTotal'] },
        totalSavingsAndInvestments: { $add: ['$investmentsTotal', '$savingsTotal'] },
      },
    },
  ]);

  return months;
};

export const getLatestPortfolioSnapshot = async (userId) => {
  const [snapshot] = await Portfolio.aggregate([
    { $match: { userId } },
    { $sort: { createdAt: -1 } },
    { $limit: 1 },
    {
      $project: {
        _id: 1,
        userId: 1,
        createdAt: 1,
        equity: { $ifNull: ['$equity', {}] },
        nonEquity: { $ifNull: ['$nonEquity', {}] },
        emergency: { $ifNull: ['$emergency', {}] },
        invested: { $ifNull: ['$invested', 0] },
        currentValue: { $ifNull: ['$currentValue', 0] },
        grandTotal: { $ifNull: ['$grandTotal', 0] },
      },
    },
  ]);

  return snapshot || null;
};

