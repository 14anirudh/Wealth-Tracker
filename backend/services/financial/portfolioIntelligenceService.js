import { getAverageMonthlyExpenses } from './cashFlowService.js';
import { getLatestPortfolioSnapshot, roundTo, toPercent } from './helpers.js';

const sumHoldingCurrentByType = (holdings = [], matcher) =>
  holdings.reduce((sum, item) => {
    const type = `${item?.type || item?.subType || item?.name || ''}`.toLowerCase();
    return matcher(type) ? sum + (item?.current || 0) : sum;
  }, 0);

const getEmergencyStatus = (coverageMonths) => {
  if (coverageMonths < 3) return 'low';
  if (coverageMonths < 6) return 'healthy';
  return 'strong';
};

export const getNetWorth = async (userId) => {
  const portfolio = await getLatestPortfolioSnapshot(userId);
  if (!portfolio) {
    return {
      totalCurrent: 0,
      totalInvested: 0,
      totalGain: 0,
      totalGainPercent: 0,
    };
  }

  const totalCurrent = portfolio.currentValue || portfolio.grandTotal || 0;
  const totalInvested = portfolio.invested || 0;
  const totalGain = totalCurrent - totalInvested;

  return {
    totalCurrent: roundTo(totalCurrent),
    totalInvested: roundTo(totalInvested),
    totalGain: roundTo(totalGain),
    totalGainPercent: toPercent(totalGain, totalInvested),
  };
};

export const getAssetAllocation = async (userId) => {
  const portfolio = await getLatestPortfolioSnapshot(userId);
  if (!portfolio) {
    return {
      equityPercent: 0,
      nonEquityPercent: 0,
      emergencyPercent: 0,
    };
  }

  const equity = portfolio?.equity?.total || 0;
  const nonEquity = portfolio?.nonEquity?.total || 0;
  const emergency = portfolio?.emergency?.total || 0;
  const total = portfolio.currentValue || portfolio.grandTotal || equity + nonEquity + emergency;

  return {
    equityPercent: toPercent(equity, total),
    nonEquityPercent: toPercent(nonEquity, total),
    emergencyPercent: toPercent(emergency, total),
  };
};

export const getEquityBreakdown = async (userId) => {
  const portfolio = await getLatestPortfolioSnapshot(userId);
  if (!portfolio) {
    return {
      mutualFundsPercent: 0,
      directStocksPercent: 0,
      smallCapExposure: 0,
      midCapExposure: 0,
      flexiCapExposure: 0,
    };
  }

  const directStocksTotal = (portfolio.equity?.directStocks || []).reduce((sum, item) => sum + (item.current || 0), 0);
  const mutualFunds = portfolio.equity?.mutualFunds || [];
  const mutualFundsTotal = mutualFunds.reduce((sum, item) => sum + (item.current || 0), 0);
  const equityTotal = portfolio.equity?.total || directStocksTotal + mutualFundsTotal;

  const smallCapTotal = sumHoldingCurrentByType(mutualFunds, (type) => type.includes('small'));
  const midCapTotal = sumHoldingCurrentByType(mutualFunds, (type) => type.includes('mid'));
  const flexiCapTotal = sumHoldingCurrentByType(
    mutualFunds,
    (type) => type.includes('flexi') || type.includes('flexi-cap') || type.includes('flexicap')
  );

  return {
    mutualFundsPercent: toPercent(mutualFundsTotal, equityTotal),
    directStocksPercent: toPercent(directStocksTotal, equityTotal),
    smallCapExposure: toPercent(smallCapTotal, equityTotal),
    midCapExposure: toPercent(midCapTotal, equityTotal),
    flexiCapExposure: toPercent(flexiCapTotal, equityTotal),
  };
};

export const getEmergencyCoverage = async (userId) => {
  const portfolio = await getLatestPortfolioSnapshot(userId);
  const { avgExpenses } = await getAverageMonthlyExpenses(userId);
  const emergencyFund = portfolio?.emergency?.total || 0;

  const coverageMonths = avgExpenses > 0 ? emergencyFund / avgExpenses : 0;

  return {
    coverageMonths: roundTo(coverageMonths),
    recommendedMonths: 6,
    status: getEmergencyStatus(coverageMonths),
  };
};

