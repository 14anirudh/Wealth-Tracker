import Ratio from '../models/Ratio.js';
import Portfolio from '../models/Portfolio.js';
import { sendRatioAlertEmail } from '../utils/ratioAlertMailer.js';
import { createHttpError } from './httpError.js';

const calculateTotal = (items = [], field = 'current') => {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + (item?.[field] || 0), 0);
};

const getValueForPart = (portfolio, part) => {
  if (!portfolio || !part) return 0;
  const { category, subcategory } = part;
  if (category === 'total') return portfolio.grandTotal || 0;

  if (category === 'equity') {
    const equity = portfolio.equity || {};
    const stocks = equity.directStocks || [];
    const funds = equity.mutualFunds || [];
    if (subcategory === 'all') return equity.total || 0;
    if (subcategory === 'directStocks') return calculateTotal(stocks);
    if (subcategory === 'mutualFunds') return calculateTotal(funds);
    return 0;
  }

  if (category === 'nonEquity') {
    const nonEquity = portfolio.nonEquity || {};
    if (subcategory === 'all') return nonEquity.total || 0;
    if (subcategory === 'cash') return nonEquity.cash?.current || 0;
    if (subcategory === 'gold') return nonEquity.commodities?.gold?.current || 0;
    if (subcategory === 'silver') return nonEquity.commodities?.silver?.current || 0;
    if (subcategory === 'fixedIncome') return calculateTotal(nonEquity.fixedIncomeAssets);
    return 0;
  }

  if (category === 'emergency') {
    const emergency = portfolio.emergency || {};
    if (subcategory === 'all') return emergency.total || 0;
    if (subcategory === 'invested') return emergency.invested?.currentAmount || 0;
    if (subcategory === 'bankAccount') return emergency.bankAccount?.currentAmount || 0;
    return 0;
  }

  const customCat = (portfolio.customCategories || []).find((c) => c.key === category);
  if (!customCat) return 0;

  let total = 0;
  (customCat.subcategories || []).forEach((sub) => {
    if (subcategory === 'all' || sub.key === subcategory) {
      if (sub.type === 'amount' && sub.amount) {
        total += sub.amount.current || 0;
      } else if (sub.holdings?.length) {
        total += calculateTotal(sub.holdings);
      }
    }
  });
  return total;
};

const PART_LABELS = {
  equity: { all: 'Equity (All)', directStocks: 'Direct Stocks', mutualFunds: 'Mutual Funds' },
  nonEquity: { all: 'Non-Equity (All)', cash: 'Cash', gold: 'Gold', silver: 'Silver', fixedIncome: 'Fixed Income' },
  emergency: { all: 'Emergency (All)', invested: 'Invested', bankAccount: 'Bank Account' },
  total: { total: 'Total Wealth' },
};

const getPartLabel = (part, portfolio) => {
  if (!part) return '';
  if (part.category === 'total') return 'Total Wealth';
  const sub = part.subcategory || '';
  if (PART_LABELS[part.category]?.[sub]) return PART_LABELS[part.category][sub];
  const customCat = (portfolio?.customCategories || []).find((c) => c.key === part.category);
  if (customCat) {
    if (sub === 'all') return `${customCat.name} (All)`;
    const customSub = (customCat.subcategories || []).find((entry) => entry.key === sub);
    return customSub ? customSub.name : customCat.name;
  }
  return sub || part.category;
};

const shouldSendAlert = ({ condition, valuePercent, thresholdPercent }) => {
  if (condition === 'below') return valuePercent < thresholdPercent;
  return valuePercent > thresholdPercent;
};

const MIN_ALERT_INTERVAL_MS = 24 * 60 * 60 * 1000;

const processRatioAlerts = async (doc, userId) => {
  if (!doc?.ratios?.length) return 0;

  const portfolio = await Portfolio.findOne({ userId }).sort({ createdAt: -1 });
  if (!portfolio) return 0;

  let hasChanges = false;
  let sentCount = 0;
  const now = new Date();

  for (const ratio of doc.ratios) {
    const alert = ratio.alert;
    if (!alert?.enabled || !alert.email || alert.thresholdPercent === undefined || alert.thresholdPercent === null) {
      continue;
    }

    const part1Value = getValueForPart(portfolio, ratio.part1);
    const part2Value = getValueForPart(portfolio, ratio.part2);
    const denominator = part1Value + part2Value;
    if (denominator <= 0) continue;

    const part1Percent = (part1Value / denominator) * 100;
    const part2Percent = (part2Value / denominator) * 100;
    const targetPart = alert.targetPart === 'part2' ? 'part2' : 'part1';
    const watchedPercent = targetPart === 'part2' ? part2Percent : part1Percent;
    const thresholdPercent = Number(alert.thresholdPercent);

    if (!shouldSendAlert({ condition: alert.condition, valuePercent: watchedPercent, thresholdPercent })) {
      continue;
    }

    const lastSent = alert.lastSentAt ? new Date(alert.lastSentAt).getTime() : 0;
    if (lastSent && now.getTime() - lastSent < MIN_ALERT_INTERVAL_MS) {
      continue;
    }

    try {
      const emailResult = await sendRatioAlertEmail({
        to: alert.email,
        ratioName: ratio.name || `${getPartLabel(ratio.part1, portfolio)} vs ${getPartLabel(ratio.part2, portfolio)}`,
        ratioValuePercent: watchedPercent,
        thresholdPercent,
        condition: alert.condition || 'above',
        part1Label: getPartLabel(ratio.part1, portfolio),
        part2Label: getPartLabel(ratio.part2, portfolio),
        watchedPartLabel: targetPart === 'part2' ? getPartLabel(ratio.part2, portfolio) : getPartLabel(ratio.part1, portfolio),
      });

      if (emailResult.sent) {
        ratio.alert.lastSentAt = now;
        hasChanges = true;
        sentCount += 1;
      }
    } catch (error) {
      console.error('Failed to send ratio alert email', error.message);
    }
  }

  if (hasChanges) {
    await doc.save();
  }

  return sentCount;
};

export const getRatios = async (userId) => {
  const doc = await Ratio.findOne({ userId });
  if (!doc) {
    return { ratios: [] };
  }

  return { ratios: doc.ratios || [] };
};

export const runRatioAlertsForAllUsers = async () => {
  const docs = await Ratio.find({
    ratios: {
      $elemMatch: {
        'alert.enabled': true,
        'alert.email': { $ne: '' },
      },
    },
  });

  let usersChecked = 0;
  let alertsSent = 0;

  for (const doc of docs) {
    usersChecked += 1;
    alertsSent += await processRatioAlerts(doc, doc.userId);
  }

  return { usersChecked, alertsSent };
};

export const createRatio = async (userId, { name, part1, part2 }) => {
  if (!name || !part1 || !part2) {
    throw createHttpError(400, 'name, part1 and part2 are required');
  }

  let doc = await Ratio.findOne({ userId });
  if (!doc) {
    doc = new Ratio({ userId, ratios: [] });
  }

  doc.ratios.push({ name, part1, part2 });
  await doc.save();

  return doc.ratios[doc.ratios.length - 1];
};

export const deleteRatio = async (userId, ratioId) => {
  const doc = await Ratio.findOne({ userId });
  if (!doc) {
    throw createHttpError(404, 'No ratios found');
  }

  const before = doc.ratios.length;
  doc.ratios = doc.ratios.filter((ratio) => ratio._id.toString() !== ratioId);
  if (doc.ratios.length === before) {
    throw createHttpError(404, 'Ratio not found');
  }

  await doc.save();
};

export const updateRatioAlert = async (userId, ratioId, alertBody) => {
  const { email, condition, thresholdPercent, targetPart } = alertBody;
  const normalizedCondition = condition === 'below' ? 'below' : 'above';
  const threshold = Number(thresholdPercent);

  if (Number.isNaN(threshold) || threshold < 1 || threshold > 100) {
    throw createHttpError(400, 'thresholdPercent must be between 1 and 100');
  }

  const doc = await Ratio.findOne({ userId });
  if (!doc) {
    throw createHttpError(404, 'No ratios found');
  }

  const ratio = doc.ratios.id(ratioId);
  if (!ratio) {
    throw createHttpError(404, 'Ratio not found');
  }
  const normalizedTargetPart =
    targetPart === 'part2' ? 'part2' : (ratio.alert?.targetPart === 'part2' ? 'part2' : 'part1');

  const finalEmail = (email || userId || '').trim();
  if (!finalEmail) {
    throw createHttpError(400, 'email is required');
  }

  ratio.alert = {
    enabled: true,
    email: finalEmail,
    targetPart: normalizedTargetPart,
    condition: normalizedCondition,
    thresholdPercent: threshold,
    lastSentAt: ratio.alert?.lastSentAt || null,
  };

  await doc.save();
  return { alert: ratio.alert };
};
