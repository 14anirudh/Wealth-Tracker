import { calculateSavingsRate } from './cashFlowService.js';
import { getRecentCashFlowMetrics, roundTo } from './helpers.js';
import { getAssetAllocation, getEmergencyCoverage, getNetWorth } from './portfolioIntelligenceService.js';

const average = (values = []) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const detectExpenseSpike = async (userId) => {
  const months = await getRecentCashFlowMetrics(userId);
  if (!months.length) {
    return { spikeDetected: false, category: null, spikePercent: 0 };
  }

  const latest = months[months.length - 1];
  const history = months.slice(0, -1);
  const fallbackHistory = history.length ? history : months;

  const comparisons = [
    {
      category: 'personalExpenses',
      current: latest.personalExpensesTotal || 0,
      baseline: average(fallbackHistory.map((item) => item.personalExpensesTotal || 0)),
    },
    {
      category: 'monthlyNeeds',
      current: latest.monthlyNeedsTotal || 0,
      baseline: average(fallbackHistory.map((item) => item.monthlyNeedsTotal || 0)),
    },
    {
      category: 'totalExpenses',
      current: latest.totalExpenses || 0,
      baseline: average(fallbackHistory.map((item) => item.totalExpenses || 0)),
    },
  ];

  const spikes = comparisons
    .map((item) => {
      const spikePercent = item.baseline > 0 ? ((item.current - item.baseline) / item.baseline) * 100 : 0;
      return { ...item, spikePercent };
    })
    .sort((a, b) => b.spikePercent - a.spikePercent);

  const topSpike = spikes[0];
  const spikeDetected = topSpike.spikePercent >= 15;

  return {
    spikeDetected,
    category: spikeDetected ? topSpike.category : null,
    spikePercent: spikeDetected ? roundTo(topSpike.spikePercent) : 0,
  };
};

export const detectInvestmentInconsistency = async (userId) => {
  const months = await getRecentCashFlowMetrics(userId);
  const investments = months.map((item) => item.investmentsTotal || 0);

  if (investments.length < 2) {
    return {
      inconsistent: false,
      irregularSip: false,
      decreasingTrend: false,
      reasons: [],
    };
  }

  const avgInvestment = average(investments);
  const variance = average(investments.map((value) => (value - avgInvestment) ** 2));
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = avgInvestment > 0 ? stdDev / avgInvestment : 0;

  const irregularSip = coefficientOfVariation > 0.35;
  const decreasingTrend = investments[investments.length - 1] < investments[0];

  const reasons = [];
  if (irregularSip) reasons.push('Investment amount varies significantly month to month.');
  if (decreasingTrend) reasons.push('Latest monthly investment is lower than earlier months.');

  return {
    inconsistent: irregularSip || decreasingTrend,
    irregularSip,
    decreasingTrend,
    reasons,
  };
};

const getGradeFromScore = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
};

export const generateFinancialHealthScore = async (userId) => {
  const [savingsRate, emergencyCoverage, assetAllocation, investmentConsistency, netWorth] = await Promise.all([
    calculateSavingsRate(userId),
    getEmergencyCoverage(userId),
    getAssetAllocation(userId),
    detectInvestmentInconsistency(userId),
    getNetWorth(userId),
  ]);

  const savingsRateComponent = Math.min(100, (savingsRate.avgSavingsRate / 30) * 100);
  const emergencyCoverageComponent = Math.min(100, (emergencyCoverage.coverageMonths / 6) * 100);

  let assetAllocationComponent = 100;
  if (assetAllocation.equityPercent > 80 || assetAllocation.equityPercent < 40) assetAllocationComponent -= 25;
  if (assetAllocation.emergencyPercent < 10) assetAllocationComponent -= 35;
  if (assetAllocation.nonEquityPercent < 15) assetAllocationComponent -= 20;
  assetAllocationComponent = Math.max(0, assetAllocationComponent);

  const investmentConsistencyComponent = investmentConsistency.inconsistent ? 50 : 100;
  const netWorthGrowthComponent = Math.max(0, Math.min(100, ((netWorth.totalGainPercent + 20) / 40) * 100));

  const score =
    savingsRateComponent * 0.25 +
    emergencyCoverageComponent * 0.25 +
    assetAllocationComponent * 0.2 +
    investmentConsistencyComponent * 0.15 +
    netWorthGrowthComponent * 0.15;

  const strengths = [];
  const weaknesses = [];

  if (savingsRateComponent >= 75) strengths.push('Healthy savings rate');
  else weaknesses.push('Savings rate needs improvement');

  if (emergencyCoverageComponent >= 75) strengths.push('Emergency coverage is adequate');
  else weaknesses.push('Emergency fund coverage is low');

  if (assetAllocationComponent >= 75) strengths.push('Asset allocation is balanced');
  else weaknesses.push('Asset allocation appears imbalanced');

  if (investmentConsistencyComponent >= 75) strengths.push('Investment behavior is consistent');
  else weaknesses.push('Investment pattern is inconsistent');

  if (netWorthGrowthComponent >= 75) strengths.push('Net worth growth is strong');
  else weaknesses.push('Net worth growth is weak');

  return {
    score: roundTo(score, 0),
    grade: getGradeFromScore(score),
    strengths,
    weaknesses,
  };
};

