import { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Bell, ChevronDown } from 'lucide-react';
import { portfolioAPI, ratiosAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const SUBCATEGORIES = {
  equity: [
    { value: 'all', label: 'All' },
    { value: 'directStocks', label: 'Direct Stocks' },
    { value: 'mutualFunds', label: 'Mutual Funds' },
  ],
  nonEquity: [
    { value: 'all', label: 'All' },
    { value: 'cash', label: 'Cash' },
    { value: 'gold', label: 'Gold' },
    { value: 'silver', label: 'Silver' },
    { value: 'fixedIncome', label: 'Fixed Income' },
  ],
  emergency: [
    { value: 'all', label: 'All' },
    { value: 'invested', label: 'Invested' },
    { value: 'bankAccount', label: 'Bank Account' },
  ],
  total: [],
};

const PART_LABELS = {
  equity: { all: 'Equity (All)', directStocks: 'Direct Stocks', mutualFunds: 'Mutual Funds' },
  nonEquity: { all: 'Non-Equity (All)', cash: 'Cash', gold: 'Gold', silver: 'Silver', fixedIncome: 'Fixed Income' },
  emergency: { all: 'Emergency (All)', invested: 'Invested', bankAccount: 'Bank Account' },
  total: { total: 'Total Wealth' },
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const formatCurrency = (amount) => `₹${amount?.toLocaleString('en-IN') || 0}`;

const calculateTotal = (items, field = 'current') => {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + (item[field] || 0), 0);
};

function getValueForPart(portfolio, part) {
  if (!portfolio || !part) return 0;
  const { category, subcategory } = part;
  if (category === 'total') return getTotalWealth(portfolio);

  if (category === 'equity') {
    const equity = portfolio.equity || {};
    const ds = equity.directStocks || [];
    const mf = equity.mutualFunds || [];
    if (subcategory === 'all') return calculateTotal(ds) + calculateTotal(mf);
    if (subcategory === 'directStocks') return calculateTotal(ds);
    if (subcategory === 'mutualFunds') return calculateTotal(mf);
    return 0;
  }

  if (category === 'nonEquity') {
    const ne = portfolio.nonEquity || {};
    if (subcategory === 'all') {
      return (
        (ne.cash?.current || 0) +
        (ne.commodities?.gold?.current || 0) +
        (ne.commodities?.silver?.current || 0) +
        calculateTotal(ne.fixedIncomeAssets || [])
      );
    }
    if (subcategory === 'cash') return ne.cash?.current || 0;
    if (subcategory === 'gold') return ne.commodities?.gold?.current || 0;
    if (subcategory === 'silver') return ne.commodities?.silver?.current || 0;
    if (subcategory === 'fixedIncome') return calculateTotal(ne.fixedIncomeAssets || []);
    return 0;
  }

  if (category === 'emergency') {
    const em = portfolio.emergency || {};
    if (subcategory === 'all') {
      return (em.invested?.currentAmount || 0) + (em.bankAccount?.currentAmount || 0);
    }
    if (subcategory === 'invested') return em.invested?.currentAmount || 0;
    if (subcategory === 'bankAccount') return em.bankAccount?.currentAmount || 0;
    return 0;
  }

  // Custom category (key matches portfolio.customCategories[].key)
  const customCat = (portfolio.customCategories || []).find((c) => c.key === category);
  if (customCat) {
    let total = 0;
    (customCat.subcategories || []).forEach((sub) => {
      if (subcategory === 'all' || sub.key === subcategory) {
        if (sub.type === 'amount' && sub.amount) {
          total += sub.amount.current || 0;
        } else if (sub.holdings && sub.holdings.length) {
          total += calculateTotal(sub.holdings);
        }
      }
    });
    return total;
  }

  return 0;
}

function getTotalWealth(portfolio) {
  if (!portfolio) return 0;
  const equity = portfolio.equity || {};
  const ne = portfolio.nonEquity || {};
  const em = portfolio.emergency || {};
  const equityTotal = calculateTotal(equity.directStocks) + calculateTotal(equity.mutualFunds);
  const neTotal =
    (ne.cash?.current || 0) +
    (ne.commodities?.gold?.current || 0) +
    (ne.commodities?.silver?.current || 0) +
    calculateTotal(ne.fixedIncomeAssets);
  const emTotal = (em.invested?.currentAmount || 0) + (em.bankAccount?.currentAmount || 0);
  let customTotal = 0;
  (portfolio.customCategories || []).forEach((cat) => {
    (cat.subcategories || []).forEach((sub) => {
      if (sub.type === 'amount' && sub.amount) customTotal += sub.amount.current || 0;
      else if (sub.holdings?.length) customTotal += calculateTotal(sub.holdings);
    });
  });
  return equityTotal + neTotal + emTotal + customTotal;
}

function getPartLabel(part, portfolio) {
  if (!part) return '';
  if (part.category === 'total') return 'Total Wealth';
  const sub = part.subcategory || '';
  if (PART_LABELS[part.category]?.[sub]) return PART_LABELS[part.category][sub];
  const customCat = (portfolio?.customCategories || []).find((c) => c.key === part.category);
  if (customCat) {
    if (sub === 'all') return `${customCat.name} (All)`;
    const customSub = (customCat.subcategories || []).find((s) => s.key === sub);
    return customSub ? customSub.name : customCat.name;
  }
  return sub || part.category;
}

function getAlertTargetOptions(item, portfolio) {
  return [
    { value: 'part1', label: getPartLabel(item?.part1, portfolio) || 'Part 1' },
    { value: 'part2', label: getPartLabel(item?.part2, portfolio) || 'Part 2' },
  ];
}

const SelectorDropdown = ({ value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label || '',
    [options, value],
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        value={selectedLabel}
        readOnly
        onClick={() => setOpen((prev) => !prev)}
        className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-bg text-dark pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dark/20 cursor-pointer"
      />
      <button
        type="button"
        aria-label={open ? 'Close dropdown' : 'Open dropdown'}
        onClick={() => setOpen((prev) => !prev)}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-dark/60 hover:text-dark"
      >
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && options.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl bg-[#f7f5f3] dark:bg-[#1d1f1f] shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(option.value);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-dark/5 text-sm text-dark"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Ratios = () => {
  const { isDarkMode } = useTheme();
  const [portfolio, setPortfolio] = useState(null);
  const [ratios, setRatios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [part1, setPart1] = useState({ category: 'equity', subcategory: 'all' });
  const [part2, setPart2] = useState({ category: 'nonEquity', subcategory: 'gold' });
  const [saveName, setSaveName] = useState('');
  const [message, setMessage] = useState(null);
  const [openAlertFor, setOpenAlertFor] = useState(null);
  const [alertDrafts, setAlertDrafts] = useState({});
  const [alertSaving, setAlertSaving] = useState({});
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const openAlertRatio = useMemo(
    () => ratios.find((ratio) => ratio._id === openAlertFor) || null,
    [ratios, openAlertFor],
  );
  const alertTargetOptions = useMemo(
    () => getAlertTargetOptions(openAlertRatio, portfolio),
    [openAlertRatio, portfolio],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [portRes, ratiosRes] = await Promise.all([
          portfolioAPI.getCurrent().catch(() => ({ data: null })),
          ratiosAPI.getAll().catch(() => ({ data: { ratios: [] } })),
        ]);
        setPortfolio(portRes.data);
        setRatios(ratiosRes.data?.ratios || []);
        setCurrentUserEmail(portRes?.data?.userId || '');
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categoryOptions = useMemo(() => {
    const base = [
      { value: 'equity', label: 'Equity' },
      { value: 'nonEquity', label: 'Non-Equity' },
      { value: 'emergency', label: 'Emergency' },
    ];
    const custom = (portfolio?.customCategories || []).map((c) => ({ value: c.key, label: c.name }));
    return [...base, ...custom, { value: 'total', label: 'Total Wealth' }];
  }, [portfolio]);

  const getSubcategoryOptions = (category) => {
    if (category === 'total') return [];
    if (SUBCATEGORIES[category]) return SUBCATEGORIES[category];
    const customCat = (portfolio?.customCategories || []).find((c) => c.key === category);
    if (!customCat) return [];
    const all = [{ value: 'all', label: `${customCat.name} (All)` }];
    const subs = (customCat.subcategories || []).map((s) => ({ value: s.key, label: s.name }));
    return [...all, ...subs];
  };

  const subcategoryOptions1 = useMemo(() => getSubcategoryOptions(part1.category), [portfolio, part1.category]);
  const subcategoryOptions2 = useMemo(() => getSubcategoryOptions(part2.category), [portfolio, part2.category]);

  const effectivePart1 = useMemo(() => {
    if (part1.category === 'total') return { category: 'total', subcategory: null };
    const valid = subcategoryOptions1.some((s) => s.value === part1.subcategory);
    return {
      category: part1.category,
      subcategory: valid ? part1.subcategory : subcategoryOptions1[0]?.value ?? null,
    };
  }, [part1, subcategoryOptions1]);

  const effectivePart2 = useMemo(() => {
    if (part2.category === 'total') return { category: 'total', subcategory: null };
    const valid = subcategoryOptions2.some((s) => s.value === part2.subcategory);
    return {
      category: part2.category,
      subcategory: valid ? part2.subcategory : subcategoryOptions2[0]?.value ?? null,
    };
  }, [part2, subcategoryOptions2]);

  const chartData = useMemo(() => {
    if (!portfolio) return [];
    const totalWealth = getTotalWealth(portfolio);
    const v1 = getValueForPart(portfolio, effectivePart1);
    const v2 = getValueForPart(portfolio, effectivePart2);

    const isPart1Total = effectivePart1.category === 'total';
    const isPart2Total = effectivePart2.category === 'total';

    const label1 = getPartLabel(effectivePart1, portfolio);
    const label2 = getPartLabel(effectivePart2, portfolio);

    let raw = [];
    if (isPart1Total && isPart2Total) {
      raw = [{ name: 'Total Wealth', value: totalWealth, color: CHART_COLORS[0] }];
    } else if (isPart1Total) {
      raw = [
        { name: label2, value: v2, color: CHART_COLORS[0] },
        { name: 'Total Wealth', value: Math.max(0, totalWealth - v2), color: CHART_COLORS[1] },
      ].filter((d) => d.value > 0);
    } else if (isPart2Total) {
      raw = [
        { name: label1, value: v1, color: CHART_COLORS[0] },
        { name: 'Total Wealth', value: Math.max(0, totalWealth - v1), color: CHART_COLORS[1] },
      ].filter((d) => d.value > 0);
    } else {
      raw = [
        { name: label1, value: v1, color: CHART_COLORS[0] },
        { name: label2, value: v2, color: CHART_COLORS[1] },
      ].filter((d) => d.value > 0);
    }
    const sum = raw.reduce((s, d) => s + d.value, 0);
    return raw.map((d) => ({
      ...d,
      percentage: sum ? ((d.value / sum) * 100).toFixed(1) : '0',
    }));
  }, [portfolio, effectivePart1, effectivePart2]);

  const getRatioChartData = (p1, p2) => {
    if (!portfolio) return [];
    const totalWealth = getTotalWealth(portfolio);
    const v1 = getValueForPart(portfolio, p1);
    const v2 = getValueForPart(portfolio, p2);

    const isPart1Total = p1.category === 'total';
    const isPart2Total = p2.category === 'total';

    const label1 = getPartLabel(p1, portfolio);
    const label2 = getPartLabel(p2, portfolio);

    let raw = [];
    if (isPart1Total && isPart2Total) {
      raw = [{ name: 'Total Wealth', value: totalWealth, color: CHART_COLORS[0] }];
    } else if (isPart1Total) {
      raw = [
        { name: label2, value: v2, color: CHART_COLORS[0] },
        { name: 'Total Wealth', value: Math.max(0, totalWealth - v2), color: CHART_COLORS[1] },
      ].filter((d) => d.value > 0);
    } else if (isPart2Total) {
      raw = [
        { name: label1, value: v1, color: CHART_COLORS[0] },
        { name: 'Total Wealth', value: Math.max(0, totalWealth - v1), color: CHART_COLORS[1] },
      ].filter((d) => d.value > 0);
    } else {
      raw = [
        { name: label1, value: v1, color: CHART_COLORS[0] },
        { name: label2, value: v2, color: CHART_COLORS[1] },
      ].filter((d) => d.value > 0);
    }
    const sum = raw.reduce((s, d) => s + d.value, 0);
    return raw.map((d) => ({
      ...d,
      percentage: sum ? ((d.value / sum) * 100).toFixed(1) : '0',
    }));
  };

  const handleSave = async () => {
    const name = (saveName || '').trim();
    if (!name) {
      setMessage({ type: 'error', text: 'Enter a name for this ratio.' });
      return;
    }
    try {
      await ratiosAPI.create({
        name,
        part1: effectivePart1,
        part2: effectivePart2,
      });
      const res = await ratiosAPI.getAll();
      setRatios(res.data?.ratios || []);
      setSaveName('');
      setMessage({ type: 'success', text: 'Ratio saved.' });
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to save.' });
    }
  };

  const handleLoad = (item) => {
    setPart1(item.part1 || { category: 'equity', subcategory: 'directStocks' });
    setPart2(item.part2 || { category: 'total', subcategory: null });
  };

  const handleDelete = async (id) => {
    try {
      await ratiosAPI.delete(id);
      const res = await ratiosAPI.getAll();
      setRatios(res.data?.ratios || []);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to delete.' });
    }
  };

  const getInitialAlertDraft = (item) => ({
    email: item?.alert?.email || currentUserEmail || '',
    targetPart: item?.alert?.targetPart === 'part2' ? 'part2' : 'part1',
    condition: item?.alert?.condition === 'below' ? 'below' : 'above',
    thresholdPercent:
      item?.alert?.enabled && typeof item?.alert?.thresholdPercent === 'number'
        ? String(item.alert.thresholdPercent)
        : '',
  });

  const handleOpenAlertModal = (item) => {
    setOpenAlertFor(item._id);
    setAlertDrafts((prev) => ({ ...prev, [item._id]: getInitialAlertDraft(item) }));
  };

  const handleAlertDraftChange = (id, key, value) => {
    setAlertDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [key]: value,
      },
    }));
  };

  const handleSaveAlert = async (id) => {
    const draft = alertDrafts[id];
    if (!draft) return;

    if (!`${draft.thresholdPercent ?? ''}`.trim()) {
      setMessage({ type: 'error', text: 'Alert threshold is required.' });
      return;
    }

    const threshold = Number(draft.thresholdPercent);
    if (Number.isNaN(threshold) || threshold < 1 || threshold > 100) {
      setMessage({ type: 'error', text: 'Alert threshold should be between 1 and 100.' });
      return;
    }

    if (!(draft.email || '').trim()) {
      setMessage({ type: 'error', text: 'Email is required.' });
      return;
    }

    try {
      setAlertSaving((prev) => ({ ...prev, [id]: true }));
      await ratiosAPI.updateAlert(id, {
        email: draft.email.trim(),
        targetPart: draft.targetPart === 'part2' ? 'part2' : 'part1',
        condition: draft.condition,
        thresholdPercent: threshold,
      });
      const res = await ratiosAPI.getAll();
      setRatios(res.data?.ratios || []);
      setOpenAlertFor(null);
      setMessage({ type: 'success', text: 'Alert saved.' });
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to save alert.' });
    } finally {
      setAlertSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-dark">Loading...</div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center text-dark">
          <p className="mb-4">No portfolio found.</p>
          <p className="text-sm text-dark/70">Add a portfolio from the Dashboard to view ratios here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-dark mb-2">Ratios</h1>
        <p className="text-dark/80 text-sm mb-6">
          Compare two parts of your portfolio: select a category and subcategory for each part, or use &quot;Total Wealth&quot; to see one segment against the rest.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Selectors + Save */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-dark font-medium text-sm">Part 1</label>
                <SelectorDropdown
                  value={part1.category}
                  options={categoryOptions}
                  onSelect={(cat) => {
                    const subs = getSubcategoryOptions(cat);
                    setPart1({ category: cat, subcategory: cat === 'total' ? null : (subs[0]?.value ?? null) });
                  }}
                />
                {part1.category !== 'total' && (
                  <SelectorDropdown
                    value={part1.subcategory ?? ''}
                    options={subcategoryOptions1}
                    onSelect={(subcategory) => setPart1((p) => ({ ...p, subcategory }))}
                  />
                )}
              </div>
              <div className="space-y-3">
                <label className="block text-dark font-medium text-sm">Part 2</label>
                <SelectorDropdown
                  value={part2.category}
                  options={categoryOptions}
                  onSelect={(cat) => {
                    const subs = getSubcategoryOptions(cat);
                    setPart2({ category: cat, subcategory: cat === 'total' ? null : (subs[0]?.value ?? null) });
                  }}
                />
                {part2.category !== 'total' && (
                  <SelectorDropdown
                    value={part2.subcategory ?? ''}
                    options={subcategoryOptions2}
                    onSelect={(subcategory) => setPart2((p) => ({ ...p, subcategory }))}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-dark font-medium text-sm mb-2">Save this ratio</label>
                <input
                  type="text"
                  placeholder="e.g. Direct Stocks vs Fixed Income"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-bg text-dark px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-dark/20"
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1] px-5 py-2 font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Save
              </button>
              {message && (
                <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {message.text}
                </span>
              )}
            </div>

          </div>

          {/* Right: Donut chart with legend */}
          <div className="rounded-xl min-h-[320px] flex flex-col items-center justify-start pt-2">
            {chartData.length === 0 ? (
              <p className="text-dark/60">No data for this selection.</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#171717' : '#ffffff',
                      borderColor: 'rgba(0,0,0,0.1)',
                      color: isDarkMode ? '#f5f5f5' : '#000000',
                    }}
                    itemStyle={{
                      color: isDarkMode ? '#f5f5f5' : '#000000',
                    }}
                    formatter={(value, name, props) => [
                      `${props.payload.percentage}% · ${formatCurrency(value)}`,
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => (
                      <span className="text-dark/80">{value} {entry.payload.percentage}%</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {ratios.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-dark mb-3">Saved ratios</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {ratios.map((item) => {
                const ratioChartData = getRatioChartData(item.part1, item.part2);
                return (
                  <li key={item._id} className="w-full">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleLoad(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLoad(item);
                        }
                      }}
                      className="group relative w-full text-left rounded-3xl border border-[#c6c6c6] dark:border-[#303030] bg-white/50 dark:bg-[#111313] px-5 py-5 hover:bg-white/70 dark:hover:bg-[#151818] transition-colors cursor-pointer"
                    >
                              <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAlertModal(item);
                        }}
                        className={`absolute left-3 top-3 text-xs px-2 py-1 rounded-md transition-colors ${
                          item.alert?.enabled
                            ? 'text-red-500 bg-red-100/80 dark:bg-red-900/35'
                            : 'text-dark/60 hover:bg-dark/10'
                        }`}
                        aria-label="Configure alert"
                      >
                        <Bell className={`h-4 w-4 ${item.alert?.enabled ? 'fill-red-500 text-red-500' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item._id);
                        }}
                        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-dark/60 hover:text-red-600 text-xs px-2 py-1 rounded-md hover:bg-dark/10 transition-opacity"
                        aria-label="Delete ratio"
                      >
                        Delete
                      </button>

                      <h3 className="text-xl font-semibold text-dark text-center mb-4">
                        {item.name || `${getPartLabel(item.part1, portfolio)} vs ${getPartLabel(item.part2, portfolio)}`}
                      </h3>

                      <div className="h-[260px]">
                        {ratioChartData.length === 0 ? (
                          <p className="text-dark/60 text-sm text-center pt-16">No data for this ratio.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={ratioChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={58}
                                outerRadius={100}
                                paddingAngle={1}
                                dataKey="value"
                                labelLine={false}
                                stroke={isDarkMode ? '#e7e7e7' : '#d7d7d7'}
                                strokeWidth={1}
                              >
                                {ratioChartData.map((entry, index) => (
                                  <Cell key={`saved-cell-${item._id}-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      {ratioChartData.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                          {ratioChartData.map((entry, index) => (
                            <span key={`saved-legend-${item._id}-${index}`} className="inline-flex items-center text-dark/80">
                              <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ backgroundColor: entry.color }} />
                              {entry.name} {entry.percentage}%
                            </span>
                          ))}
                        </div>
                      )}

                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {openAlertFor && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpenAlertFor(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#d6d6d6] dark:border-[#2f2f2f] bg-[#f8f8f8] dark:bg-[#1a1d1d] p-5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Configure ratio alert"
          >
            <h3 className="text-lg font-semibold text-dark mb-4">Ratio alert</h3>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email for alerts"
                value={alertDrafts[openAlertFor]?.email || ''}
                onChange={(e) => handleAlertDraftChange(openAlertFor, 'email', e.target.value)}
                className="w-full border border-[#d0d0d0] dark:border-[#353535] rounded-lg px-3 py-2 text-sm bg-bg text-dark"
              />
              <select
                value={alertDrafts[openAlertFor]?.targetPart || 'part1'}
                onChange={(e) => handleAlertDraftChange(openAlertFor, 'targetPart', e.target.value)}
                className="w-full border border-[#d0d0d0] dark:border-[#353535] rounded-lg px-3 py-2 text-sm bg-bg text-dark"
              >
                {alertTargetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Alert on {option.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={alertDrafts[openAlertFor]?.condition || 'above'}
                  onChange={(e) => handleAlertDraftChange(openAlertFor, 'condition', e.target.value)}
                  className="border border-[#d0d0d0] dark:border-[#353535] rounded-lg px-3 py-2 text-sm bg-bg text-dark"
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  value={alertDrafts[openAlertFor]?.thresholdPercent || ''}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (/^\d{0,3}$/.test(nextValue)) {
                      handleAlertDraftChange(openAlertFor, 'thresholdPercent', nextValue);
                    }
                  }}
                  className="border border-[#d0d0d0] dark:border-[#353535] rounded-lg px-3 py-2 text-sm bg-bg text-dark"
                  placeholder="1 to 100"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenAlertFor(null)}
                className="px-4 py-2 text-sm rounded-xl border border-[#d0d0d0] dark:border-[#353535] text-dark"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveAlert(openAlertFor)}
                disabled={Boolean(alertSaving[openAlertFor])}
                className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1] px-4 py-2 text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {alertSaving[openAlertFor] ? 'Saving...' : 'Save Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ratios;
