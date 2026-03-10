import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const makeKey = () => `custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const formatReturns = (gain, gainPct) => {
    const pctNum = typeof gainPct === 'string' ? parseFloat(gainPct) : gainPct;
    if (gain === 0 && (pctNum === 0 || Number.isNaN(pctNum))) return '—';
    const sign = gain >= 0 ? '+' : '-';
    const amount = `₹${Math.abs(gain).toLocaleString('en-IN')}`;
    const pct = gain >= 0 ? `+${gainPct}%` : `${gainPct}%`;
    return `${sign}${amount} (${pct})`;
  };

const defaultFormData = () => ({
  equity: {
    directStocks: [],
    mutualFunds: [],
  },
  nonEquity: {
    cash: { invested: 0, current: 0 },
    commodities: {
      gold: { invested: 0, current: 0 },
      silver: { invested: 0, current: 0 }
    },
    fixedIncomeAssets: []
  },
  emergency: {
    invested: { investedAmount: 0, currentAmount: 0 },
    bankAccount: { investedAmount: 0, currentAmount: 0 }
  },
  customCategories: []
});

const WealthForm = ({ onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState(() => {
    const base = initialData || defaultFormData();
    const customCategories = Array.isArray(base.customCategories) && base.customCategories.length > 0
      ? base.customCategories.map((cat) => ({
          key: cat.key || makeKey(),
          name: cat.name || 'New Category',
          subcategories: (cat.subcategories || []).map((sub) => ({
            key: sub.key || makeKey(),
            name: sub.name || 'New Subcategory',
            type: sub.type === 'amount' ? 'amount' : 'holdings',
            holdings: Array.isArray(sub.holdings) ? sub.holdings : [],
            amount: sub.amount ? { invested: sub.amount.invested || 0, current: sub.amount.current || 0 } : { invested: 0, current: 0 }
          }))
        }))
      : [];
    return {
      equity: base.equity || defaultFormData().equity,
      nonEquity: base.nonEquity || defaultFormData().nonEquity,
      emergency: base.emergency || defaultFormData().emergency,
      customCategories
    };
  });



  const calculateGainPercentage = (invested, current) => {
    if (!invested || invested === 0) return 0;
    return (((current - invested) / invested) * 100).toFixed(2);
  };

  const updateStock = (index, field, value) => {
    const updated = [...(formData.equity.directStocks || [])];
    if (!updated[index]) updated[index] = { name: '', invested: 0, current: 0 };
    updated[index] = { ...updated[index], [field]: field === 'name' ? value : (parseFloat(value) || 0) };
    setFormData({
      ...formData,
      equity: { ...formData.equity, directStocks: updated }
    });
  };

  const addStock = () => {
    setFormData({
      ...formData,
      equity: {
        ...formData.equity,
        directStocks: [...(formData.equity.directStocks || []), { name: '', invested: 0, current: 0 }]
      }
    });
  };

  const removeStock = (index) => {
    const newStocks = (formData.equity.directStocks || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      equity: { ...formData.equity, directStocks: newStocks }
    });
  };

  const updateMutualFund = (index, field, value) => {
    const updated = [...(formData.equity.mutualFunds || [])];
    if (!updated[index]) updated[index] = { name: '', type: '', invested: 0, current: 0 };
    if (field === 'name' || field === 'type') {
      updated[index] = { ...updated[index], name: value, type: value };
    } else {
      updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    }
    setFormData({
      ...formData,
      equity: { ...formData.equity, mutualFunds: updated }
    });
  };

  const addMutualFund = () => {
    setFormData({
      ...formData,
      equity: {
        ...formData.equity,
        mutualFunds: [...(formData.equity.mutualFunds || []), { name: '', type: '', invested: 0, current: 0 }]
      }
    });
  };

  const removeMutualFund = (index) => {
    const newMF = (formData.equity.mutualFunds || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      equity: { ...formData.equity, mutualFunds: newMF }
    });
  };

  const updateFixedIncome = (index, field, value) => {
    const updated = [...(formData.nonEquity.fixedIncomeAssets || [])];
    if (!updated[index]) updated[index] = { name: '', invested: 0, current: 0 };
    updated[index] = { ...updated[index], [field]: field === 'name' ? value : (parseFloat(value) || 0) };
    setFormData({
      ...formData,
      nonEquity: { ...formData.nonEquity, fixedIncomeAssets: updated }
    });
  };

  const addFixedIncome = () => {
    setFormData({
      ...formData,
      nonEquity: {
        ...formData.nonEquity,
        fixedIncomeAssets: [...(formData.nonEquity.fixedIncomeAssets || []), { name: '', invested: 0, current: 0 }]
      }
    });
  };

  const removeFixedIncome = (index) => {
    const newFixed = (formData.nonEquity.fixedIncomeAssets || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      nonEquity: { ...formData.nonEquity, fixedIncomeAssets: newFixed }
    });
  };

  const clearNonEquityRow = (row) => {
    if (row === 'cash') {
      setFormData({ ...formData, nonEquity: { ...formData.nonEquity, cash: { invested: 0, current: 0 } } });
    } else if (row === 'gold') {
      setFormData({
        ...formData,
        nonEquity: {
          ...formData.nonEquity,
          commodities: { ...formData.nonEquity.commodities, gold: { invested: 0, current: 0 } }
        }
      });
    } else if (row === 'silver') {
      setFormData({
        ...formData,
        nonEquity: {
          ...formData.nonEquity,
          commodities: { ...formData.nonEquity.commodities, silver: { invested: 0, current: 0 } }
        }
      });
    }
  };

  const clearEmergencyRow = (row) => {
    if (row === 'invested') {
      setFormData({
        ...formData,
        emergency: { ...formData.emergency, invested: { investedAmount: 0, currentAmount: 0 } }
      });
    } else {
      setFormData({
        ...formData,
        emergency: { ...formData.emergency, bankAccount: { investedAmount: 0, currentAmount: 0 } }
      });
    }
  };

  // Custom categories
  const addCustomCategory = () => {
    setFormData({
      ...formData,
      customCategories: [
        ...(formData.customCategories || []),
        { key: makeKey(), name: 'New Category', subcategories: [] }
      ]
    });
  };

  const removeCustomCategory = (catIndex) => {
    setFormData({
      ...formData,
      customCategories: (formData.customCategories || []).filter((_, i) => i !== catIndex)
    });
  };

  const updateCustomCategoryName = (catIndex, name) => {
    const list = [...(formData.customCategories || [])];
    if (!list[catIndex]) return;
    list[catIndex] = { ...list[catIndex], name };
    setFormData({ ...formData, customCategories: list });
  };

  const addCustomSubcategory = (catIndex, type = 'holdings') => {
    const list = [...(formData.customCategories || [])];
    if (!list[catIndex]) return;
    const sub = {
      key: makeKey(),
      name: type === 'amount' ? 'New amount' : 'New subcategory',
      type,
      holdings: type === 'holdings' ? [] : undefined,
      amount: type === 'amount' ? { invested: 0, current: 0 } : undefined
    };
    list[catIndex] = {
      ...list[catIndex],
      subcategories: [...(list[catIndex].subcategories || []), sub]
    };
    setFormData({ ...formData, customCategories: list });
  };

  const removeCustomSubcategory = (catIndex, subIndex) => {
    const list = [...(formData.customCategories || [])];
    if (!list[catIndex]) return;
    list[catIndex] = {
      ...list[catIndex],
      subcategories: (list[catIndex].subcategories || []).filter((_, i) => i !== subIndex)
    };
    setFormData({ ...formData, customCategories: list });
  };

  const updateCustomSubcategoryName = (catIndex, subIndex, name) => {
    const list = [...(formData.customCategories || [])];
    if (!list[catIndex]?.subcategories?.[subIndex]) return;
    const subs = [...list[catIndex].subcategories];
    subs[subIndex] = { ...subs[subIndex], name };
    list[catIndex] = { ...list[catIndex], subcategories: subs };
    setFormData({ ...formData, customCategories: list });
  };

  const updateCustomSubcategoryType = (catIndex, subIndex, type) => {
    const list = [...(formData.customCategories || [])];
    if (!list[catIndex]?.subcategories?.[subIndex]) return;
    const subs = [...list[catIndex].subcategories];
    subs[subIndex] = {
      ...subs[subIndex],
      type,
      holdings: type === 'holdings' ? (subs[subIndex].holdings || []) : undefined,
      amount: type === 'amount' ? (subs[subIndex].amount || { invested: 0, current: 0 }) : undefined
    };
    list[catIndex] = { ...list[catIndex], subcategories: subs };
    setFormData({ ...formData, customCategories: list });
  };

  const updateCustomSubcategoryAmount = (catIndex, subIndex, field, value) => {
    const list = [...(formData.customCategories || [])];
    if (!list[catIndex]?.subcategories?.[subIndex]) return;
    const subs = [...list[catIndex].subcategories];
    const num = parseFloat(value) || 0;
    subs[subIndex] = {
      ...subs[subIndex],
      amount: { ...(subs[subIndex].amount || { invested: 0, current: 0 }), [field]: num }
    };
    list[catIndex] = { ...list[catIndex], subcategories: subs };
    setFormData({ ...formData, customCategories: list });
  };

  const updateCustomHolding = (catIndex, subIndex, holdIndex, field, value) => {
    const list = [...(formData.customCategories || [])];
    if (!list[catIndex]?.subcategories?.[subIndex]) return;
    const subs = [...list[catIndex].subcategories];
    const holdings = [...(subs[subIndex].holdings || [])];
    if (!holdings[holdIndex]) holdings[holdIndex] = { name: '', invested: 0, current: 0 };
    holdings[holdIndex] = { ...holdings[holdIndex], [field]: field === 'name' ? value : (parseFloat(value) || 0) };
    subs[subIndex] = { ...subs[subIndex], holdings };
    list[catIndex] = { ...list[catIndex], subcategories: subs };
    setFormData({ ...formData, customCategories: list });
  };

  const addCustomHolding = (catIndex, subIndex) => {
    const list = [...(formData.customCategories || [])];
    if (!list[catIndex]?.subcategories?.[subIndex]) return;
    const subs = [...list[catIndex].subcategories];
    const holdings = [...(subs[subIndex].holdings || []), { name: '', invested: 0, current: 0 }];
    subs[subIndex] = { ...subs[subIndex], holdings };
    list[catIndex] = { ...list[catIndex], subcategories: subs };
    setFormData({ ...formData, customCategories: list });
  };

  const removeCustomHolding = (catIndex, subIndex, holdIndex) => {
    const list = [...(formData.customCategories || [])];
    if (!list[catIndex]?.subcategories?.[subIndex]) return;
    const subs = [...list[catIndex].subcategories];
    const holdings = (subs[subIndex].holdings || []).filter((_, i) => i !== holdIndex);
    subs[subIndex] = { ...subs[subIndex], holdings };
    list[catIndex] = { ...list[catIndex], subcategories: subs };
    setFormData({ ...formData, customCategories: list });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      equity: {
        ...formData.equity,
        directStocks: (formData.equity.directStocks || []).filter(
          (s) => (s.name || '').trim() !== '' && (s.invested || s.current)
        ),
        mutualFunds: (formData.equity.mutualFunds || []).filter(
          (m) => ((m.name || m.type) || '').trim() !== '' && (m.invested || m.current)
        ),
      },
      nonEquity: {
        ...formData.nonEquity,
        fixedIncomeAssets: (formData.nonEquity.fixedIncomeAssets || []).filter(
          (a) => (a.name || '').trim() !== '' && (a.invested || a.current)
        ),
      },
      customCategories: (formData.customCategories || []).map((cat) => ({
        key: cat.key,
        name: (cat.name || '').trim() || 'Unnamed Category',
        subcategories: (cat.subcategories || []).map((sub) => {
          if (sub.type === 'amount') {
            return { key: sub.key, name: (sub.name || '').trim() || 'Amount', type: 'amount', amount: sub.amount || { invested: 0, current: 0 } };
          }
          const holdings = (sub.holdings || []).filter(
            (h) => (h.name || '').trim() !== '' && (h.invested || h.current)
          );
          return { key: sub.key, name: (sub.name || '').trim() || 'Holdings', type: 'holdings', holdings };
        }).filter((sub) => sub.type === 'amount' ? (sub.amount?.invested || sub.amount?.current) : (sub.holdings?.length > 0))
      })).filter((cat) => (cat.subcategories || []).length > 0)
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Equity Section */}
      <div className="p-6 bg-bg">
        <h2 className="text-2xl font-bold mb-4 text-dark">Equity</h2>
        
        {/* Direct Stocks - Tailwind table */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3 text-dark">Direct Stocks</h3>
          <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030]">
            <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
              <thead>
                <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                  <th className="text-left font-semibold px-4 py-3 w-[30%]">Name</th>
                  <th className="text-left font-semibold px-4 py-3 w-[20%]">Invested Amount</th>
                  <th className="text-left font-semibold px-4 py-3 w-[20%]">Current Value</th>
                  <th className="text-left font-semibold px-4 py-3 w-[25%]">Returns</th>
                  <th className="text-center font-semibold px-2 py-3 w-[5%]"> </th>
                </tr>
              </thead>
              <tbody>
                {(formData.equity.directStocks || []).map((stock, index) => {
                  const gain = (stock.current || 0) - (stock.invested || 0);
                  const gainPct = calculateGainPercentage(stock.invested || 0, stock.current || 0);
                  return (
                    <tr key={index} className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                      <td className="px-4 py-2 w-[30%]">
                        <input
                          type="text"
                          placeholder="Stock Name"
                          value={stock.name || ''}
                          onChange={(e) => updateStock(index, 'name', e.target.value)}
                          className="w-full bg-transparent border-0 text-dark py-1.5 focus:outline-none focus:ring-0"
                        />
                      </td>
                      <td className="px-4 py-2 w-[20%]">
                        <input
                          type="number"
                          placeholder="Invested"
                          value={stock.invested === 0 ? '' : stock.invested}
                          onChange={(e) => updateStock(index, 'invested', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          step="any"
                          className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2 w-[20%]">
                        <input
                          type="number"
                          placeholder="Current"
                          step="any"
                          value={stock.current === 0 ? '' : stock.current}
                          onChange={(e) => updateStock(index, 'current', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2 w-[25%] text-dark text-sm whitespace-nowrap">
                        {formatReturns(gain, gainPct)}
                      </td>
                      <td className="px-2 py-2 w-[5%] text-center">
                        <button type="button" onClick={() => removeStock(index)} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:bg-dark/10 transition-colors hover:text-red-600 " title="Remove" aria-label="Remove row">
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addStock} className="mt-3 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl">Add</button>
        </div>

        {/* Mutual Funds - Tailwind table */}
        <div>
          <h3 className="text-xl font-semibold mb-3 text-dark">Mutual Funds</h3>
          <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030]">
            <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
              <thead>
                <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                  <th className="text-left font-semibold px-4 py-3 w-[30%]">Name</th>
                  <th className="text-left font-semibold px-4 py-3 w-[20%]">Invested Amount</th>
                  <th className="text-left font-semibold px-4 py-3 w-[20%]">Current Value</th>
                  <th className="text-left font-semibold px-4 py-3 w-[25%]">Returns</th>
                  <th className="text-center font-semibold px-2 py-3 w-[5%]"> </th>
                </tr>
              </thead>
              <tbody>
                {(formData.equity.mutualFunds || []).map((mf, index) => {
                  const gain = (mf.current || 0) - (mf.invested || 0);
                  const gainPct = calculateGainPercentage(mf.invested || 0, mf.current || 0);
                  return (
                    <tr key={index} className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                      <td className="px-4 py-2 w-[30%]">
                        <input
                          type="text"
                          placeholder="Name / Type"
                          value={mf.type || mf.name || ''}
                          onChange={(e) => updateMutualFund(index, 'type', e.target.value)}
                          className="w-full bg-transparent border-0 text-dark py-1.5 focus:outline-none focus:ring-0"
                        />
                      </td>
                      <td className="px-4 py-2 w-[20%]">
                        <input
                          type="number"
                          placeholder="Invested"
                          value={mf.invested === 0 ? '' : mf.invested}
                          onChange={(e) => updateMutualFund(index, 'invested', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2 w-[20%]">
                        <input
                          type="number"
                          placeholder="Current"
                          value={mf.current === 0 ? '' : mf.current}
                          onChange={(e) => updateMutualFund(index, 'current', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2 w-[25%] text-dark text-sm whitespace-nowrap">
                        {formatReturns(gain, gainPct)}
                      </td>
                      <td className="px-2 py-2 w-[5%] text-center">
                        <button type="button" onClick={() => removeMutualFund(index)} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors" title="Remove" aria-label="Remove row">
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addMutualFund} className="mt-3 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl">Add</button>
        </div>
      </div>

      {/* Non-Equity Section - Tailwind table */}
      <div className="p-6 bg-bg">
        <h2 className="text-2xl font-bold mb-4 text-dark">Non-Equity</h2>
        <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030] mb-4">
          <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
            <thead>
              <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                <th className="text-left font-semibold px-4 py-3 w-[30%]">Name</th>
                <th className="text-left font-semibold px-4 py-3 w-[20%]">Invested</th>
                <th className="text-left font-semibold px-4 py-3 w-[20%]">Current</th>
                <th className="text-left font-semibold px-4 py-3 w-[25%]">Returns</th>
                <th className="text-center font-semibold px-2 py-3 w-[5%]"> </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                <td className="px-4 py-2 font-medium">Cash</td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.nonEquity.cash.invested || ''} onChange={(e) => setFormData({ ...formData, nonEquity: { ...formData.nonEquity, cash: { ...formData.nonEquity.cash, invested: parseFloat(e.target.value) || 0 } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Invested" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.nonEquity.cash.current || ''} onChange={(e) => setFormData({ ...formData, nonEquity: { ...formData.nonEquity, cash: { ...formData.nonEquity.cash, current: parseFloat(e.target.value) || 0 } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Current" />
                </td>
                <td className="px-4 py-2 text-dark text-sm whitespace-nowrap">
                  {formatReturns((formData.nonEquity.cash.current || 0) - (formData.nonEquity.cash.invested || 0), calculateGainPercentage(formData.nonEquity.cash.invested || 0, formData.nonEquity.cash.current || 0))}
                </td>
                <td className="px-2 py-2 w-[5%] text-center">
                  <button type="button" onClick={() => clearNonEquityRow('cash')} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors" title="Clear row" aria-label="Clear row">
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
              <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                <td className="px-4 py-2 font-medium">Gold</td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.nonEquity.commodities.gold.invested || ''} onChange={(e) => setFormData({ ...formData, nonEquity: { ...formData.nonEquity, commodities: { ...formData.nonEquity.commodities, gold: { ...formData.nonEquity.commodities.gold, invested: parseFloat(e.target.value) || 0 } } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Invested" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.nonEquity.commodities.gold.current || ''} onChange={(e) => setFormData({ ...formData, nonEquity: { ...formData.nonEquity, commodities: { ...formData.nonEquity.commodities, gold: { ...formData.nonEquity.commodities.gold, current: parseFloat(e.target.value) || 0 } } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Current" />
                </td>
                <td className="px-4 py-2 text-dark text-sm whitespace-nowrap">
                  {formatReturns((formData.nonEquity.commodities.gold.current || 0) - (formData.nonEquity.commodities.gold.invested || 0), calculateGainPercentage(formData.nonEquity.commodities.gold.invested || 0, formData.nonEquity.commodities.gold.current || 0))}
                </td>
                <td className="px-2 py-2 w-[5%] text-center">
                  <button type="button" onClick={() => clearNonEquityRow('gold')} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors" title="Clear row" aria-label="Clear row">
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
              <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                <td className="px-4 py-2 font-medium">Silver</td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.nonEquity.commodities.silver.invested || ''} onChange={(e) => setFormData({ ...formData, nonEquity: { ...formData.nonEquity, commodities: { ...formData.nonEquity.commodities, silver: { ...formData.nonEquity.commodities.silver, invested: parseFloat(e.target.value) || 0 } } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Invested" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.nonEquity.commodities.silver.current || ''} onChange={(e) => setFormData({ ...formData, nonEquity: { ...formData.nonEquity, commodities: { ...formData.nonEquity.commodities, silver: { ...formData.nonEquity.commodities.silver, current: parseFloat(e.target.value) || 0 } } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Current" />
                </td>
                <td className="px-4 py-2 text-dark text-sm whitespace-nowrap">
                  {formatReturns((formData.nonEquity.commodities.silver.current || 0) - (formData.nonEquity.commodities.silver.invested || 0), calculateGainPercentage(formData.nonEquity.commodities.silver.invested || 0, formData.nonEquity.commodities.silver.current || 0))}
                </td>
                <td className="px-2 py-2 w-[5%] text-center">
                  <button type="button" onClick={() => clearNonEquityRow('silver')} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors" title="Clear row" aria-label="Clear row">
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-3 text-dark">Fixed Income Assets</h3>
          <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030]">
            <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
              <thead>
                <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                  <th className="text-left font-semibold px-4 py-3 w-[30%]">Name</th>
                  <th className="text-left font-semibold px-4 py-3 w-[20%]">Invested Amount</th>
                  <th className="text-left font-semibold px-4 py-3 w-[20%]">Current Value</th>
                  <th className="text-left font-semibold px-4 py-3 w-[25%]">Returns</th>
                  <th className="text-center font-semibold px-2 py-3 w-[5%]"> </th>
                </tr>
              </thead>
              <tbody>
                {(formData.nonEquity.fixedIncomeAssets || []).map((asset, index) => {
                  const gain = (asset.current || 0) - (asset.invested || 0);
                  const gainPct = calculateGainPercentage(asset.invested || 0, asset.current || 0);
                  return (
                    <tr key={index} className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                      <td className="px-4 py-2 w-[30%]">
                        <input type="text" placeholder="Asset Name" value={asset.name || ''} onChange={(e) => updateFixedIncome(index, 'name', e.target.value)} className="w-full bg-transparent border-0 text-dark py-1.5 focus:outline-none focus:ring-0" />
                      </td>
                      <td className="px-4 py-2 w-[20%]">
                        <input type="number" placeholder="Invested" value={asset.invested === 0 ? '' : asset.invested} onChange={(e) => updateFixedIncome(index, 'invested', e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" />
                      </td>
                      <td className="px-4 py-2 w-[20%]">
                        <input type="number" placeholder="Current" value={asset.current === 0 ? '' : asset.current} onChange={(e) => updateFixedIncome(index, 'current', e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" />
                      </td>
                      <td className="px-4 py-2 w-[25%] text-dark text-sm whitespace-nowrap">{formatReturns(gain, gainPct)}</td>
                      <td className="px-2 py-2 w-[5%] text-center">
                        <button type="button" onClick={() => removeFixedIncome(index)} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors" title="Remove" aria-label="Remove row">
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addFixedIncome} className="mt-3 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl">Add</button>
        </div>
      </div>

      {/* Emergency Section - Tailwind table */}
      <div className="p-6 bg-bg">
        <h2 className="text-2xl font-bold mb-4 text-dark">Emergency Fund</h2>
        <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030]">
          <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
            <thead>
              <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                <th className="text-left font-semibold px-4 py-3 w-[30%]">Name</th>
                <th className="text-left font-semibold px-4 py-3 w-[20%]">Invested</th>
                <th className="text-left font-semibold px-4 py-3 w-[20%]">Current</th>
                <th className="text-left font-semibold px-4 py-3 w-[25%]">Returns</th>
                <th className="text-center font-semibold px-2 py-3 w-[5%]"> </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                <td className="px-4 py-2 font-medium">Invested (Emergency)</td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.emergency.invested.investedAmount || ''} onChange={(e) => setFormData({ ...formData, emergency: { ...formData.emergency, invested: { ...formData.emergency.invested, investedAmount: parseFloat(e.target.value) || 0 } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Invested" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.emergency.invested.currentAmount || ''} onChange={(e) => setFormData({ ...formData, emergency: { ...formData.emergency, invested: { ...formData.emergency.invested, currentAmount: parseFloat(e.target.value) || 0 } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Current" />
                </td>
                <td className="px-4 py-2 text-dark text-sm whitespace-nowrap">
                  {formatReturns((formData.emergency.invested.currentAmount || 0) - (formData.emergency.invested.investedAmount || 0), calculateGainPercentage(formData.emergency.invested.investedAmount || 0, formData.emergency.invested.currentAmount || 0))}
                </td>
                <td className="px-2 py-2 w-[5%] text-center">
                  <button type="button" onClick={() => clearEmergencyRow('invested')} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors" title="Clear row" aria-label="Clear row">
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-dark/[0.02]">
                <td className="px-4 py-2 font-medium">Bank Account</td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.emergency.bankAccount.investedAmount || ''} onChange={(e) => setFormData({ ...formData, emergency: { ...formData.emergency, bankAccount: { ...formData.emergency.bankAccount, investedAmount: parseFloat(e.target.value) || 0 } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Invested" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" value={formData.emergency.bankAccount.currentAmount || ''} onChange={(e) => setFormData({ ...formData, emergency: { ...formData.emergency, bankAccount: { ...formData.emergency.bankAccount, currentAmount: parseFloat(e.target.value) || 0 } } })} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none  font-mono tabular-nums" placeholder="Current" />
                </td>
                <td className="px-4 py-2 text-dark text-sm whitespace-nowrap">
                  {formatReturns((formData.emergency.bankAccount.currentAmount || 0) - (formData.emergency.bankAccount.investedAmount || 0), calculateGainPercentage(formData.emergency.bankAccount.investedAmount || 0, formData.emergency.bankAccount.currentAmount || 0))}
                </td>
                <td className="px-2 py-2 w-[5%] text-center">
                  <button type="button" onClick={() => clearEmergencyRow('bankAccount')} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors" title="Clear row" aria-label="Clear row">
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Categories - Add your own categories and subcategories */}
      <div className="p-6 bg-bg">
        <h2 className="text-2xl font-bold mb-2 text-dark">Custom Categories</h2>
        <p className="text-dark/70 text-sm mb-4">Add your own categories and subcategories beyond the defaults (Equity, Non-Equity, Emergency).</p>
        {(formData.customCategories || []).map((cat, catIndex) => (
          <div key={cat.key} className="mb-8 p-4 rounded-xl border border-[#c6c6c6] dark:border-[#303030] bg-bg/50">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="text"
                value={cat.name || ''}
                onChange={(e) => updateCustomCategoryName(catIndex, e.target.value)}
                placeholder="Category name (e.g. Real Estate)"
                className="flex-1 min-w-[200px] px-3 py-2 border border-[#c6c6c6] dark:border-[#303030] rounded-xl text-dark font-semibold bg-bg"
              />
              <button type="button" onClick={() => removeCustomCategory(catIndex)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1] hover:bg-red-50 text-sm" title="Remove category">
                <Trash2 className="h-4 w-4" /> Remove category
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-dark/70 text-sm">Add subcategory:</span>
              <button type="button" onClick={() => addCustomSubcategory(catIndex, 'holdings')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1] rounded-xl text-sm font-medium hover:opacity-90">
                <Plus className="h-4 w-4" /> Holdings (multiple items)
              </button>
              <button type="button" onClick={() => addCustomSubcategory(catIndex, 'amount')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1] rounded-xl text-sm font-medium hover:opacity-90">
                <Plus className="h-4 w-4" /> Single amount
              </button>
            </div>
            {(cat.subcategories || []).map((sub, subIndex) => (
              <div key={sub.key} className="ml-4 mb-4 pl-4 border-l-2 border-[#c6c6c6] dark:border-[#303030]">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={sub.name || ''}
                    onChange={(e) => updateCustomSubcategoryName(catIndex, subIndex, e.target.value)}
                    placeholder="Subcategory name"
                    className="w-48 px-2 py-1.5 border border-[#c6c6c6] dark:border-[#303030] rounded text-dark text-sm bg-bg"
                  />
                  <select
                    value={sub.type || 'holdings'}
                    onChange={(e) => updateCustomSubcategoryType(catIndex, subIndex, e.target.value)}
                    className="px-2 py-1.5 rounded text-dark text-sm bg-[#f7f5f3] dark:bg-[#1d1f1f]"
                  >
                    <option value="holdings">Holdings (list)</option>
                    <option value="amount">Single amount</option>
                  </select>
                  <button type="button" onClick={() => removeCustomSubcategory(catIndex, subIndex)} className="p-1.5 text-dark/60 hover:text-red-600 rounded" title="Remove subcategory">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {sub.type === 'amount' ? (
                  <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030] inline-block">
                    <table className="min-w-[400px] border-collapse text-dark text-sm">
                      <thead>
                        <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                          <th className="text-left font-semibold px-4 py-2 w-[30%]">Name</th>
                          <th className="text-left font-semibold px-4 py-2 w-[25%]">Invested</th>
                          <th className="text-left font-semibold px-4 py-2 w-[25%]">Current</th>
                          <th className="w-[20%]"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#c6c6c6] dark:border-[#303030]">
                          <td className="px-4 py-2 font-medium">{sub.name || 'Amount'}</td>
                          <td className="px-4 py-2">
                            <input type="number" value={sub.amount?.invested || ''} onChange={(e) => updateCustomSubcategoryAmount(catIndex, subIndex, 'invested', e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark py-1 font-mono" placeholder="Invested" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={sub.amount?.current || ''} onChange={(e) => updateCustomSubcategoryAmount(catIndex, subIndex, 'current', e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark py-1 font-mono" placeholder="Current" />
                          </td>
                          <td className="px-2 py-2 text-dark text-sm whitespace-nowrap">
                            {formatReturns((sub.amount?.current || 0) - (sub.amount?.invested || 0), calculateGainPercentage(sub.amount?.invested || 0, sub.amount?.current || 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030]">
                    <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
                      <thead>
                        <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                          <th className="text-left font-semibold px-4 py-3 w-[30%]">Name</th>
                          <th className="text-left font-semibold px-4 py-3 w-[20%]">Invested</th>
                          <th className="text-left font-semibold px-4 py-3 w-[20%]">Current</th>
                          <th className="text-left font-semibold px-4 py-3 w-[25%]">Returns</th>
                          <th className="text-center font-semibold px-2 py-3 w-[5%]"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sub.holdings || []).map((h, holdIndex) => {
                          const gain = (h.current || 0) - (h.invested || 0);
                          const gainPct = calculateGainPercentage(h.invested || 0, h.current || 0);
                          return (
                            <tr key={holdIndex} className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                              <td className="px-4 py-2">
                                <input type="text" placeholder="Name" value={h.name || ''} onChange={(e) => updateCustomHolding(catIndex, subIndex, holdIndex, 'name', e.target.value)} className="w-full bg-transparent border-0 text-dark py-1.5 focus:outline-none" />
                              </td>
                              <td className="px-4 py-2">
                                <input type="number" placeholder="Invested" value={h.invested === 0 ? '' : h.invested} onChange={(e) => updateCustomHolding(catIndex, subIndex, holdIndex, 'invested', e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark py-1 font-mono" />
                              </td>
                              <td className="px-4 py-2">
                                <input type="number" placeholder="Current" value={h.current === 0 ? '' : h.current} onChange={(e) => updateCustomHolding(catIndex, subIndex, holdIndex, 'current', e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark py-1 font-mono" />
                              </td>
                              <td className="px-4 py-2 text-dark text-sm whitespace-nowrap">{formatReturns(gain, gainPct)}</td>
                              <td className="px-2 py-2 text-center">
                                <button type="button" onClick={() => removeCustomHolding(catIndex, subIndex, holdIndex)} className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600 " title="Remove row"><X className="h-4 w-4" /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <button type="button" onClick={() => addCustomHolding(catIndex, subIndex)} className="m-2 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-4 py-2 font-semibold hover:opacity-80 text-sm rounded-xl">Add row</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        <button type="button" onClick={addCustomCategory} className="inline-flex items-center gap-2 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2.5 font-semibold hover:opacity-80 transition-opacity rounded-xl">
          <Plus className="h-5 w-5" /> Add new category
        </button>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          type="submit"
          className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-12 py-4 text-xl font-bold hover:opacity-80 transition-opacity rounded-xl"
        >
          Save Portfolio
        </button>
      </div>
    </form>
  );
};

export default WealthForm;
