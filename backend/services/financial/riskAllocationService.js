import { getAssetAllocation, getEquityBreakdown } from './portfolioIntelligenceService.js';
import { getLatestPortfolioSnapshot, roundTo } from './helpers.js';

const DEFAULT_TARGET_ALLOCATION = {
  equityPercent: 60,
  nonEquityPercent: 25,
  emergencyPercent: 15,
};

export const analyzePortfolioRisk = async (userId) => {
  const allocation = await getAssetAllocation(userId);
  const equityBreakdown = await getEquityBreakdown(userId);
  const reasons = [];
  let riskScore = 0;

  if (equityBreakdown.smallCapExposure > 30) {
    riskScore += 2;
    reasons.push('Small-cap exposure is high (>30% of equity).');
  } else if (equityBreakdown.smallCapExposure > 20) {
    riskScore += 1;
    reasons.push('Small-cap exposure is moderately high (>20% of equity).');
  }

  if (equityBreakdown.directStocksPercent > 40) {
    riskScore += 1;
    reasons.push('Direct stocks are above 40% of equity (concentration risk).');
  }

  if (allocation.equityPercent > 75) {
    riskScore += 1;
    reasons.push('Overall equity allocation is above 75% (aggressive profile).');
  }

  let riskLevel = 'Low';
  if (riskScore >= 3) riskLevel = 'High';
  else if (riskScore >= 1) riskLevel = 'Moderate';

  return {
    riskLevel,
    reasons,
  };
};

export const calculateRebalanceRecommendation = async (userId, targetAllocation = DEFAULT_TARGET_ALLOCATION) => {
  const portfolio = await getLatestPortfolioSnapshot(userId);
  if (!portfolio) {
    return {
      equityAdjustment: 0,
      nonEquityAdjustment: 0,
      emergencyAdjustment: 0,
    };
  }

  const totalCurrent = portfolio.currentValue || portfolio.grandTotal || 0;
  const currentEquity = portfolio?.equity?.total || 0;
  const currentNonEquity = portfolio?.nonEquity?.total || 0;
  const currentEmergency = portfolio?.emergency?.total || 0;

  const targetEquity = (totalCurrent * (targetAllocation.equityPercent || 0)) / 100;
  const targetNonEquity = (totalCurrent * (targetAllocation.nonEquityPercent || 0)) / 100;
  const targetEmergency = (totalCurrent * (targetAllocation.emergencyPercent || 0)) / 100;

  return {
    equityAdjustment: roundTo(targetEquity - currentEquity),
    nonEquityAdjustment: roundTo(targetNonEquity - currentNonEquity),
    emergencyAdjustment: roundTo(targetEmergency - currentEmergency),
  };
};

