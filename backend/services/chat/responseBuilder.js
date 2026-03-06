const formatCurrency = (value = 0) => `Rs ${Math.round(value).toLocaleString('en-IN')}`;

const formatPercent = (value = 0) => `${Number(value || 0).toFixed(2)}%`;

export const buildResponse = ({ intent, data }) => {
  if (intent === 'SAVINGS_CHECK') {
    return `Average savings rate: ${formatPercent(data.avgSavingsRate)}. Average income: ${formatCurrency(
      data.avgIncome
    )}. Average expenses: ${formatCurrency(data.avgExpenses)}.`;
  }

  if (intent === 'AFFORDABILITY_CHECK') {
    const decision = data.affordable ? 'Yes, this looks affordable.' : 'This is not safely affordable right now.';
    return `${decision} Safe amount: ${formatCurrency(data.safeAmount)}. Projected savings: ${formatCurrency(data.projectedSavings)}.`;
  }

  if (intent === 'FINANCIAL_REVIEW') {
    return `Health score: ${Number(data?.health?.score || 0)}/100. Net worth: ${formatCurrency(
      data?.netWorth?.totalCurrent
    )}. Emergency coverage: ${Number(data?.emergency?.coverageMonths || 0).toFixed(2)} months.`;
  }

  if (intent === 'PORTFOLIO_RISK') {
    const riskScore = Number(data?.risk?.riskScore || 0);
    return `Risk score: ${riskScore}. Equity: ${formatPercent(
      data?.risk?.allocation?.equityPercent
    )}, Direct stocks: ${formatPercent(data?.risk?.equityBreakdown?.directStocksPercent)}, Small-cap: ${formatPercent(
      data?.risk?.equityBreakdown?.smallCapExposure
    )}.`;
  }

  if (intent === 'CORPUS_PROJECTION') {
    return `At current pace, estimated time to reach target corpus is about ${data.estimatedYears} years. Suggested monthly investment for target: ${formatCurrency(
      data.requiredMonthlyInvestment
    )}.`;
  }

  if (intent === 'SALARY_SPLIT') {
    return `Recommended split: Investments ${formatPercent(data.investmentsPercent)}, Emergency ${formatPercent(
      data.emergencyPercent
    )}, Needs ${formatPercent(data.needsPercent)}, Lifestyle ${formatPercent(data.lifestylePercent)}.`;
  }

  return "I couldn't confidently identify the request. Ask about savings, affordability, risk, review, target corpus, or salary split.";
};
