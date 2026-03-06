import { getAverageMonthlyExpenses, getAverageMonthlyIncome, getExpenseBreakdown } from './cashFlowService.js';
import { getEmergencyCoverage, getNetWorth } from './portfolioIntelligenceService.js';
import { analyzePortfolioRisk } from './riskAllocationService.js';
import { roundTo } from './helpers.js';

const DEFAULT_TARGET_CORPUS = 5000000;

const normalizeSplit = (split) => {
  const total = Object.values(split).reduce((sum, value) => sum + value, 0);
  if (!total) return split;
  return Object.fromEntries(Object.entries(split).map(([key, value]) => [key, roundTo((value / total) * 100)]));
};

export const calculateAffordability = async (userId, purchaseAmount, months) => {
  const amount = Number(purchaseAmount) || 0;
  const projectionMonths = Number(months) || 0;

  const [{ avgIncome }, { avgExpenses }, emergencyCoverage] = await Promise.all([
    getAverageMonthlyIncome(userId),
    getAverageMonthlyExpenses(userId),
    getEmergencyCoverage(userId),
  ]);

  const monthlySurplus = Math.max(0, avgIncome - avgExpenses);
  const projectedSavings = roundTo(monthlySurplus * projectionMonths);

  const emergencyRequired = avgExpenses * 6;
  const emergencyCurrent = (avgExpenses || 0) * (emergencyCoverage.coverageMonths || 0);
  const emergencyGap = Math.max(0, emergencyRequired - emergencyCurrent);
  const safeAmount = roundTo(Math.max(0, projectedSavings - emergencyGap));

  return {
    affordable: amount <= safeAmount,
    safeAmount,
    projectedSavings,
  };
};

export const projectFutureCorpus = async (userId, monthlyInvestment, years, expectedReturn = 12) => {
  const monthlySip = Number(monthlyInvestment) || 0;
  const projectionYears = Number(years) || 0;
  const annualReturn = Number(expectedReturn) || 0;
  const months = projectionYears * 12;
  const monthlyRate = annualReturn / 100 / 12;

  const { totalCurrent } = await getNetWorth(userId);
  const baseCorpusFutureValue = roundTo(totalCurrent * ((1 + monthlyRate) ** months));

  let sipFutureValue = 0;
  if (months > 0 && monthlyRate > 0) {
    sipFutureValue = monthlySip * ((((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate));
  } else {
    sipFutureValue = monthlySip * months;
  }

  const projectedCorpus = roundTo(baseCorpusFutureValue + sipFutureValue);

  const targetCorpus = DEFAULT_TARGET_CORPUS;
  const requiredFromSip = Math.max(0, targetCorpus - baseCorpusFutureValue);
  let requiredMonthlyInvestment = 0;
  if (months > 0 && monthlyRate > 0) {
    const annuityFactor = (((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate);
    requiredMonthlyInvestment = annuityFactor > 0 ? requiredFromSip / annuityFactor : 0;
  } else if (months > 0) {
    requiredMonthlyInvestment = requiredFromSip / months;
  }

  return {
    projectedCorpus,
    requiredMonthlyInvestment: roundTo(requiredMonthlyInvestment),
  };
};

export const simulateSalarySplit = async (userId, salaryAmount) => {
  const salary = Number(salaryAmount) || 0;
  const [breakdown, risk] = await Promise.all([getExpenseBreakdown(userId), analyzePortfolioRisk(userId)]);

  const split = {
    investments: breakdown.investmentsPercent || 35,
    emergency: breakdown.savingsPercent || 10,
    needs: breakdown.needsPercent || 40,
    lifestyle: breakdown.personalPercent || 15,
  };

  if (risk.riskLevel === 'High') {
    split.investments = Math.max(25, split.investments - 5);
    split.emergency = Math.min(20, split.emergency + 5);
  } else if (risk.riskLevel === 'Low') {
    split.investments = Math.min(45, split.investments + 3);
    split.emergency = Math.max(8, split.emergency - 3);
  }

  const normalized = normalizeSplit(split);

  return {
    investments: normalized.investments,
    emergency: normalized.emergency,
    needs: normalized.needs,
    lifestyle: normalized.lifestyle,
    suggestedAmounts: {
      investments: roundTo((salary * normalized.investments) / 100),
      emergency: roundTo((salary * normalized.emergency) / 100),
      needs: roundTo((salary * normalized.needs) / 100),
      lifestyle: roundTo((salary * normalized.lifestyle) / 100),
    },
  };
};

