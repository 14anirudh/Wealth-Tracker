import { buildTrend, getRecentCashFlowMetrics, roundTo, toPercent } from './helpers.js';

const averageFrom = (values = []) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const getAverageMonthlyIncome = async (userId) => {
  const months = await getRecentCashFlowMetrics(userId);
  const incomes = months.map((item) => item.salary || 0);
  const avgIncome = roundTo(averageFrom(incomes));

  return {
    avgIncome,
    incomeTrend: buildTrend(incomes),
  };
};

export const getAverageMonthlyExpenses = async (userId) => {
  const months = await getRecentCashFlowMetrics(userId);
  const personal = months.map((item) => item.personalExpensesTotal || 0);
  const needs = months.map((item) => item.monthlyNeedsTotal || 0);
  const totalExpenses = months.map((item) => item.totalExpenses || 0);
  const incomes = months.map((item) => item.salary || 0);

  const personalAvg = roundTo(averageFrom(personal));
  const needsAvg = roundTo(averageFrom(needs));
  const avgExpenses = roundTo(averageFrom(totalExpenses));
  const avgIncome = averageFrom(incomes);

  return {
    avgExpenses,
    needsAvg,
    personalAvg,
    expenseRatio: toPercent(avgExpenses, avgIncome),
  };
};

export const calculateSavingsRate = async (userId) => {
  const months = await getRecentCashFlowMetrics(userId);
  const monthlyRates = months.map((item) => toPercent(item.totalSavingsAndInvestments, item.salary));
  const avgSavingsRate = roundTo(averageFrom(monthlyRates));

  return {
    avgSavingsRate,
    trend: buildTrend(monthlyRates),
  };
};

export const getExpenseBreakdown = async (userId) => {
  const months = await getRecentCashFlowMetrics(userId);

  const totals = months.reduce(
    (acc, item) => {
      acc.investments += item.investmentsTotal || 0;
      acc.savings += item.savingsTotal || 0;
      acc.needs += item.monthlyNeedsTotal || 0;
      acc.personal += item.personalExpensesTotal || 0;
      return acc;
    },
    { investments: 0, savings: 0, needs: 0, personal: 0 }
  );

  const denominator = totals.investments + totals.savings + totals.needs + totals.personal;

  return {
    investmentsPercent: toPercent(totals.investments, denominator),
    savingsPercent: toPercent(totals.savings, denominator),
    needsPercent: toPercent(totals.needs, denominator),
    personalPercent: toPercent(totals.personal, denominator),
  };
};

