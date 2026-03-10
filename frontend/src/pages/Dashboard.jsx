import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import WealthForm from "../components/WealthForm";
import { portfolioAPI } from "../services/api";
import { ArrowLeft, X } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { useTheme } from "../context/ThemeContext";

const Dashboard = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { categoryKey: customCategoryKeyFromUrl } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [noPortfolio, setNoPortfolio] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCustomCategoryKey, setSelectedCustomCategoryKey] =
    useState(null);
  // Local edit state for breakdown views
  const [equityEdit, setEquityEdit] = useState(null);
  const [nonEquityEdit, setNonEquityEdit] = useState(null);
  const [emergencyEdit, setEmergencyEdit] = useState(null);
  const [customCategoryEdit, setCustomCategoryEdit] = useState(null);
  // Save feedback: 'success' | 'error' | null, and message
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  // Refs for equity section smooth scroll
  const directStocksTableRef = useRef(null);
  const mutualFundsTableRef = useRef(null);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Sync view from URL
  useEffect(() => {
    const path = location.pathname;
    if (path === "/dashboard/edit") {
      setShowForm(true);
      setSelectedCategory(null);
      setSelectedCustomCategoryKey(null);
      setCustomCategoryEdit(null);
      setEquityEdit(null);
      setNonEquityEdit(null);
      setEmergencyEdit(null);
    } else if (path === "/dashboard/equity") {
      setShowForm(false);
      setSelectedCategory("equity");
      setSelectedCustomCategoryKey(null);
      setCustomCategoryEdit(null);
      if (portfolio?.equity) {
        setEquityEdit({
          directStocks: [
            ...(portfolio.equity.directStocks || []).map((s) => ({ ...s })),
          ],
          mutualFunds: [
            ...(portfolio.equity.mutualFunds || []).map((m) => ({ ...m })),
          ],
        });
      }
      setNonEquityEdit(null);
      setEmergencyEdit(null);
    } else if (path === "/dashboard/non-equity") {
      setShowForm(false);
      setSelectedCategory("nonEquity");
      setSelectedCustomCategoryKey(null);
      setCustomCategoryEdit(null);
      setEquityEdit(null);
      if (portfolio?.nonEquity) {
        setNonEquityEdit({
          cash: {
            ...(portfolio.nonEquity.cash || { invested: 0, current: 0 }),
          },
          commodities: {
            gold: {
              ...(portfolio.nonEquity.commodities?.gold || {
                invested: 0,
                current: 0,
              }),
            },
            silver: {
              ...(portfolio.nonEquity.commodities?.silver || {
                invested: 0,
                current: 0,
              }),
            },
          },
          fixedIncomeAssets: [
            ...(portfolio.nonEquity.fixedIncomeAssets || []).map((a) => ({
              ...a,
            })),
          ],
        });
      }
      setEmergencyEdit(null);
    } else if (path === "/dashboard/emergency") {
      setShowForm(false);
      setSelectedCategory("emergency");
      setEquityEdit(null);
      setNonEquityEdit(null);
      setSelectedCustomCategoryKey(null);
      setCustomCategoryEdit(null);
      if (portfolio?.emergency) {
        setEmergencyEdit({
          invested: {
            ...(portfolio.emergency.invested || {
              investedAmount: 0,
              currentAmount: 0,
            }),
          },
          bankAccount: {
            ...(portfolio.emergency.bankAccount || {
              investedAmount: 0,
              currentAmount: 0,
            }),
          },
        });
      }
    } else if (
      customCategoryKeyFromUrl &&
      path === `/dashboard/custom/${customCategoryKeyFromUrl}`
    ) {
      setShowForm(false);
      setSelectedCategory("custom");
      setSelectedCustomCategoryKey(customCategoryKeyFromUrl);
      setEquityEdit(null);
      setNonEquityEdit(null);
      setEmergencyEdit(null);
      const customCat = (portfolio?.customCategories || []).find(
        (c) => c.key === customCategoryKeyFromUrl,
      );
      if (customCat) {
        setCustomCategoryEdit(
          JSON.parse(
            JSON.stringify({
              key: customCat.key,
              name: customCat.name,
              subcategories: (customCat.subcategories || []).map((sub) => ({
                key: sub.key,
                name: sub.name,
                type: sub.type || "holdings",
                holdings: Array.isArray(sub.holdings)
                  ? sub.holdings.map((h) => ({ ...h }))
                  : [],
                amount: sub.amount
                  ? { ...sub.amount }
                  : { invested: 0, current: 0 },
              })),
            }),
          ),
        );
      } else {
        setCustomCategoryEdit(null);
      }
    } else if (path === "/dashboard") {
      setShowForm(false);
      setSelectedCategory(null);
      setSelectedCustomCategoryKey(null);
      setCustomCategoryEdit(null);
      setEquityEdit(null);
      setNonEquityEdit(null);
      setEmergencyEdit(null);
    }
  }, [location.pathname, portfolio, customCategoryKeyFromUrl]);

  const fetchPortfolio = async () => {
    try {
      const response = await portfolioAPI.getCurrent();
      setPortfolio(response.data);
      setLoading(false);
      setNoPortfolio(false);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      setLoading(false);
      if (error?.response?.status === 404) {
        setNoPortfolio(true);
      } else {
        setNoPortfolio(false);
      }
    }
  };

  const showSaveFeedback = (status, message) => {
    setSaveStatus(status);
    setSaveMessage(message);
    setTimeout(() => {
      setSaveStatus(null);
      setSaveMessage("");
    }, 3500);
  };

  const handleSubmit = async (formData) => {
    try {
      let response;
      if (portfolio && portfolio._id) {
        response = await portfolioAPI.update(portfolio._id, formData);
      } else {
        response = await portfolioAPI.create(formData);
      }
      setPortfolio(response.data);
      setShowForm(false);
      setNoPortfolio(false);
      showSaveFeedback("success", "Portfolio saved successfully.");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving portfolio:", error);
      showSaveFeedback("error", "Failed to save portfolio. Please try again.");
    }
  };

  const calculateTotal = (items, field = "current") => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item[field] || 0), 0);
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString("en-IN") || 0}`;
  };

  const calculateGainPercentage = (invested, current) => {
    if (!invested || invested === 0) return 0;
    return (((current - invested) / invested) * 100).toFixed(2);
  };

  const GainBadge = ({ invested, current }) => {
    const gain = current - invested;
    const gainPct = calculateGainPercentage(invested, current);

    return (
      <div className="inline-block px-2 py-1 font-bold text-dark text-sm">
        {gain >= 0 ? "+" : ""}
        {formatCurrency(gain)} ({gain >= 0 ? "+" : ""}
        {gainPct}%)
      </div>
    );
  };

  const handleCategoryClick = (category) => {
    if (category === "equity") navigate("/dashboard/equity");
    else if (category === "nonEquity") navigate("/dashboard/non-equity");
    else if (category === "emergency") navigate("/dashboard/emergency");
  };

  const handleBackClick = () => {
    navigate("/dashboard");
  };

  const updateEquityDirectStock = (index, field, value) => {
    if (!equityEdit) return;
    const updated = [...equityEdit.directStocks];
    if (!updated[index]) updated[index] = { name: "", invested: 0, current: 0 };
    updated[index] = {
      ...updated[index],
      [field]: field === "name" ? value : parseFloat(value) || 0,
    };
    setEquityEdit({ ...equityEdit, directStocks: updated });
  };

  const addEquityDirectStock = () => {
    if (!equityEdit) return;
    setEquityEdit({
      ...equityEdit,
      directStocks: [
        ...equityEdit.directStocks,
        { name: "", invested: 0, current: 0 },
      ],
    });
  };

  const removeEquityDirectStock = (index) => {
    if (!equityEdit) return;
    setEquityEdit({
      ...equityEdit,
      directStocks: equityEdit.directStocks.filter((_, i) => i !== index),
    });
  };

  const updateEquityMutualFund = (index, field, value) => {
    if (!equityEdit) return;
    const updated = [...equityEdit.mutualFunds];
    if (!updated[index])
      updated[index] = { name: "", type: "", invested: 0, current: 0 };
    const num = parseFloat(value) || 0;
    if (field === "name" || field === "type") {
      updated[index] = { ...updated[index], name: value, type: value };
    } else {
      updated[index] = { ...updated[index], [field]: num };
    }
    setEquityEdit({ ...equityEdit, mutualFunds: updated });
  };

  const addEquityMutualFund = () => {
    if (!equityEdit) return;
    setEquityEdit({
      ...equityEdit,
      mutualFunds: [
        ...equityEdit.mutualFunds,
        { name: "", type: "", invested: 0, current: 0 },
      ],
    });
  };

  const removeEquityMutualFund = (index) => {
    if (!equityEdit) return;
    setEquityEdit({
      ...equityEdit,
      mutualFunds: equityEdit.mutualFunds.filter((_, i) => i !== index),
    });
  };

  const saveEquityBreakdown = async () => {
    if (!portfolio?._id || !equityEdit) return;
    const filteredStocks = equityEdit.directStocks.filter(
      (s) => (s.name || "").trim() !== "" && (s.invested || s.current),
    );
    const filteredMF = equityEdit.mutualFunds.filter(
      (m) =>
        (m.name || m.type || "").trim() !== "" && (m.invested || m.current),
    );
    try {
      const payload = {
        ...portfolio,
        equity: {
          ...portfolio.equity,
          directStocks: filteredStocks,
          mutualFunds: filteredMF,
        },
      };
      const response = await portfolioAPI.update(portfolio._id, payload);
      setPortfolio(response.data);
      setEquityEdit({
        directStocks: [...(response.data.equity?.directStocks || [])],
        mutualFunds: [...(response.data.equity?.mutualFunds || [])],
      });
      showSaveFeedback("success", "Changes saved successfully.");
    } catch (err) {
      console.error("Error saving equity:", err);
      showSaveFeedback("error", "Failed to save. Please try again.");
    }
  };

  const setNonEquityField = (path, value, isNumber = false) => {
    if (!nonEquityEdit) return;
    const v = isNumber ? parseFloat(value) || 0 : value;
    const parts = path.split(".");
    if (parts[0] === "cash") {
      setNonEquityEdit({
        ...nonEquityEdit,
        cash: { ...nonEquityEdit.cash, [parts[1]]: v },
      });
    } else if (parts[0] === "commodities" && parts[1]) {
      const sub = parts[1];
      setNonEquityEdit({
        ...nonEquityEdit,
        commodities: {
          ...nonEquityEdit.commodities,
          [sub]: { ...nonEquityEdit.commodities[sub], [parts[2]]: v },
        },
      });
    }
  };

  const updateNonEquityFixedIncome = (index, field, value) => {
    if (!nonEquityEdit) return;
    const updated = [...nonEquityEdit.fixedIncomeAssets];
    if (!updated[index]) updated[index] = { name: "", invested: 0, current: 0 };
    updated[index] = {
      ...updated[index],
      [field]: field === "name" ? value : parseFloat(value) || 0,
    };
    setNonEquityEdit({ ...nonEquityEdit, fixedIncomeAssets: updated });
  };

  const addNonEquityFixedIncome = () => {
    if (!nonEquityEdit) return;
    setNonEquityEdit({
      ...nonEquityEdit,
      fixedIncomeAssets: [
        ...nonEquityEdit.fixedIncomeAssets,
        { name: "", invested: 0, current: 0 },
      ],
    });
  };

  const removeNonEquityFixedIncome = (index) => {
    if (!nonEquityEdit) return;
    setNonEquityEdit({
      ...nonEquityEdit,
      fixedIncomeAssets: nonEquityEdit.fixedIncomeAssets.filter(
        (_, i) => i !== index,
      ),
    });
  };

  const saveNonEquityBreakdown = async () => {
    if (!portfolio?._id || !nonEquityEdit) return;
    const filtered = (nonEquityEdit.fixedIncomeAssets || []).filter(
      (a) => (a.name || "").trim() !== "" && (a.invested || a.current),
    );
    try {
      const payload = {
        ...portfolio,
        nonEquity: {
          ...portfolio.nonEquity,
          ...nonEquityEdit,
          fixedIncomeAssets: filtered,
        },
      };
      const response = await portfolioAPI.update(portfolio._id, payload);
      setPortfolio(response.data);
      setNonEquityEdit({
        cash: { ...(response.data.nonEquity?.cash || {}) },
        commodities: { ...(response.data.nonEquity?.commodities || {}) },
        fixedIncomeAssets: [
          ...(response.data.nonEquity?.fixedIncomeAssets || []),
        ],
      });
      showSaveFeedback("success", "Changes saved successfully.");
    } catch (err) {
      console.error("Error saving non-equity:", err);
      showSaveFeedback("error", "Failed to save. Please try again.");
    }
  };

  const setEmergencyField = (section, field, value) => {
    if (!emergencyEdit) return;
    const num = parseFloat(value) || 0;
    if (section === "invested") {
      setEmergencyEdit({
        ...emergencyEdit,
        invested: { ...emergencyEdit.invested, [field]: num },
      });
    } else {
      setEmergencyEdit({
        ...emergencyEdit,
        bankAccount: { ...emergencyEdit.bankAccount, [field]: num },
      });
    }
  };

  const clearNonEquityRow = (row) => {
    if (!nonEquityEdit) return;
    if (row === "cash") {
      setNonEquityEdit({ ...nonEquityEdit, cash: { invested: 0, current: 0 } });
    } else if (row === "gold") {
      setNonEquityEdit({
        ...nonEquityEdit,
        commodities: {
          ...nonEquityEdit.commodities,
          gold: { invested: 0, current: 0 },
        },
      });
    } else if (row === "silver") {
      setNonEquityEdit({
        ...nonEquityEdit,
        commodities: {
          ...nonEquityEdit.commodities,
          silver: { invested: 0, current: 0 },
        },
      });
    }
  };

  const clearEmergencyRow = (row) => {
    if (!emergencyEdit) return;
    if (row === "invested") {
      setEmergencyEdit({
        ...emergencyEdit,
        invested: { investedAmount: 0, currentAmount: 0 },
      });
    } else {
      setEmergencyEdit({
        ...emergencyEdit,
        bankAccount: { investedAmount: 0, currentAmount: 0 },
      });
    }
  };

  const saveEmergencyBreakdown = async () => {
    if (!portfolio?._id || !emergencyEdit) return;
    try {
      const payload = {
        ...portfolio,
        emergency: { ...portfolio.emergency, ...emergencyEdit },
      };
      const response = await portfolioAPI.update(portfolio._id, payload);
      setPortfolio(response.data);
      setEmergencyEdit({
        invested: { ...(response.data.emergency?.invested || {}) },
        bankAccount: { ...(response.data.emergency?.bankAccount || {}) },
      });
      showSaveFeedback("success", "Changes saved successfully.");
    } catch (err) {
      console.error("Error saving emergency:", err);
      showSaveFeedback("error", "Failed to save. Please try again.");
    }
  };

  const updateCustomSubAmount = (subIndex, field, value) => {
    if (!customCategoryEdit) return;
    const subs = [...(customCategoryEdit.subcategories || [])];
    if (!subs[subIndex]) return;
    const num = parseFloat(value) || 0;
    subs[subIndex] = {
      ...subs[subIndex],
      amount: {
        ...(subs[subIndex].amount || { invested: 0, current: 0 }),
        [field]: num,
      },
    };
    setCustomCategoryEdit({ ...customCategoryEdit, subcategories: subs });
  };

  const updateCustomHolding = (subIndex, holdIndex, field, value) => {
    if (!customCategoryEdit) return;
    const subs = [...(customCategoryEdit.subcategories || [])];
    if (!subs[subIndex]?.holdings) return;
    const holdings = subs[subIndex].holdings.map((h, i) =>
      i === holdIndex
        ? { ...h, [field]: field === "name" ? value : parseFloat(value) || 0 }
        : h,
    );
    subs[subIndex] = { ...subs[subIndex], holdings };
    setCustomCategoryEdit({ ...customCategoryEdit, subcategories: subs });
  };

  const addCustomHolding = (subIndex) => {
    if (!customCategoryEdit) return;
    const subs = [...(customCategoryEdit.subcategories || [])];
    if (!subs[subIndex]) return;
    subs[subIndex] = {
      ...subs[subIndex],
      holdings: [
        ...(subs[subIndex].holdings || []),
        { name: "", invested: 0, current: 0 },
      ],
    };
    setCustomCategoryEdit({ ...customCategoryEdit, subcategories: subs });
  };

  const removeCustomHolding = (subIndex, holdIndex) => {
    if (!customCategoryEdit) return;
    const subs = [...(customCategoryEdit.subcategories || [])];
    if (!subs[subIndex]?.holdings) return;
    subs[subIndex] = {
      ...subs[subIndex],
      holdings: subs[subIndex].holdings.filter((_, i) => i !== holdIndex),
    };
    setCustomCategoryEdit({ ...customCategoryEdit, subcategories: subs });
  };

  const saveCustomCategoryBreakdown = async () => {
    if (!portfolio?._id || !customCategoryEdit) return;
    const updatedCustom = (portfolio.customCategories || []).map((cat) =>
      cat.key === customCategoryEdit.key
        ? {
            key: cat.key,
            name: customCategoryEdit.name,
            subcategories: (customCategoryEdit.subcategories || []).map(
              (sub) => {
                if (sub.type === "amount") {
                  return {
                    key: sub.key,
                    name: sub.name,
                    type: "amount",
                    amount: sub.amount || { invested: 0, current: 0 },
                  };
                }
                const holdings = (sub.holdings || []).filter(
                  (h) =>
                    (h.name || "").trim() !== "" && (h.invested || h.current),
                );
                return {
                  key: sub.key,
                  name: sub.name,
                  type: "holdings",
                  holdings,
                };
              },
            ),
          }
        : cat,
    );
    try {
      const payload = { ...portfolio, customCategories: updatedCustom };
      const response = await portfolioAPI.update(portfolio._id, payload);
      setPortfolio(response.data);
      const updated = response.data.customCategories?.find(
        (c) => c.key === customCategoryEdit.key,
      );
      if (updated) {
        setCustomCategoryEdit(
          JSON.parse(
            JSON.stringify({
              key: updated.key,
              name: updated.name,
              subcategories: (updated.subcategories || []).map((sub) => ({
                key: sub.key,
                name: sub.name,
                type: sub.type || "holdings",
                holdings: Array.isArray(sub.holdings)
                  ? sub.holdings.map((h) => ({ ...h }))
                  : [],
                amount: sub.amount
                  ? { ...sub.amount }
                  : { invested: 0, current: 0 },
              })),
            }),
          ),
        );
      }
      showSaveFeedback("success", "Changes saved successfully.");
    } catch (err) {
      console.error("Error saving custom category:", err);
      showSaveFeedback("error", "Failed to save. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-dark text-base">Loading...</div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 mb-5 text-dark font-semibold text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-primary mb-6 text-center">
            Wealth Portfolio Tracker
          </h1>
          <WealthForm onSubmit={handleSubmit} initialData={portfolio} />
        </div>
      </div>
    );
  }

  if (noPortfolio || !portfolio) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-dark mb-4">
            Wealth Portfolio
          </h1>
          <p className="text-dark mb-6">
            No portfolio saved yet for this account.
          </p>
          <button
            onClick={() => navigate("/dashboard/edit")}
            className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-6 py-3 font-semibold hover:opacity-80 transition-opacity rounded-xl"
          >
            Add Portfolio
          </button>
        </div>
      </div>
    );
  }

  // Compute totals from nested data so dashboard updates after in-place save (backend may not recalc on findByIdAndUpdate)
  const directStocksTotal = calculateTotal(portfolio.equity?.directStocks);
  const directStocksInvested = calculateTotal(
    portfolio.equity?.directStocks,
    "invested",
  );
  const mutualFundsTotal = calculateTotal(portfolio.equity?.mutualFunds);
  const mutualFundsInvested = calculateTotal(
    portfolio.equity?.mutualFunds,
    "invested",
  );
  const equityTotal = directStocksTotal + mutualFundsTotal;

  const fixedIncomeTotal = calculateTotal(
    portfolio.nonEquity?.fixedIncomeAssets,
  );
  const fixedIncomeInvested = calculateTotal(
    portfolio.nonEquity?.fixedIncomeAssets,
    "invested",
  );
  const goldCurrent = portfolio.nonEquity?.commodities?.gold?.current || 0;
  const goldInvested = portfolio.nonEquity?.commodities?.gold?.invested || 0;
  const silverCurrent = portfolio.nonEquity?.commodities?.silver?.current || 0;
  const silverInvested =
    portfolio.nonEquity?.commodities?.silver?.invested || 0;
  const cashCurrent = portfolio.nonEquity?.cash?.current || 0;
  const cashInvested = portfolio.nonEquity?.cash?.invested || 0;
  const nonEquityTotal =
    cashCurrent + goldCurrent + silverCurrent + fixedIncomeTotal;
  const nonEquityInvestedTotal =
    cashInvested + goldInvested + silverInvested + fixedIncomeInvested;

  const emergencyInvestedCurrent =
    portfolio.emergency?.invested?.currentAmount || 0;
  const emergencyInvestedAmount =
    portfolio.emergency?.invested?.investedAmount || 0;
  const emergencyBankCurrent =
    portfolio.emergency?.bankAccount?.currentAmount || 0;
  const emergencyBankAmount =
    portfolio.emergency?.bankAccount?.investedAmount || 0;
  const emergencyTotal = emergencyInvestedCurrent + emergencyBankCurrent;
  const emergencyInvestedTotal = emergencyInvestedAmount + emergencyBankAmount;

  // Custom categories totals
  const customCategoryColors = [
    "#6366f1",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#84cc16",
    "#a855f7",
    "#06b6d4",
  ];
  const customCategoriesList = portfolio.customCategories || [];
  const customTotalsAndInvested = customCategoriesList.map((cat) => {
    let current = 0,
      invested = 0;
    (cat.subcategories || []).forEach((sub) => {
      if (sub.type === "amount" && sub.amount) {
        current += sub.amount.current || 0;
        invested += sub.amount.invested || 0;
      } else if (sub.holdings && sub.holdings.length) {
        sub.holdings.forEach((h) => {
          current += h.current || 0;
          invested += h.invested || 0;
        });
      }
    });
    return { key: cat.key, name: cat.name || "Custom", current, invested };
  });
  const customTotal = customTotalsAndInvested.reduce(
    (s, c) => s + c.current,
    0,
  );
  const customInvestedTotal = customTotalsAndInvested.reduce(
    (s, c) => s + c.invested,
    0,
  );

  const grandTotal =
    equityTotal + nonEquityTotal + emergencyTotal + customTotal;
  const totalInvested =
    directStocksInvested +
    mutualFundsInvested +
    nonEquityInvestedTotal +
    emergencyInvestedTotal +
    customInvestedTotal;

  const calculatePercentage = (amount) => {
    if (!grandTotal) return "0.00";
    return ((amount / grandTotal) * 100).toFixed(2);
  };

  // Chart data for donut chart (default + custom categories)
  const chartData = [
    { name: "Equity", value: equityTotal, color: "#3b82f6" },
    { name: "Non-Equity", value: nonEquityTotal, color: "#10b981" },
    { name: "Emergency", value: emergencyTotal, color: "#f59e0b" },
    ...customTotalsAndInvested
      .filter((c) => c.current > 0)
      .map((c, i) => ({
        name: c.name,
        value: c.current,
        color: customCategoryColors[i % customCategoryColors.length],
      })),
  ].filter((d) => d.value > 0);

  const equityInvested = directStocksInvested + mutualFundsInvested;
  const nonEquityInvested = nonEquityInvestedTotal;
  const emergencyInvested = emergencyInvestedTotal;

  // Overview View - Show main categories
  if (!selectedCategory) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Save feedback banner */}
          {saveStatus && (
            <div
              className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
                saveStatus === "success"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
              role="alert"
            >
              {saveMessage}
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Section - Total and Categories */}
            <div className="space-y-6">
              {/* Total Value */}
              <div>
                <div className="text-dark text-base mb-2">Total Wealth</div>
                <div className="text-dark text-4xl font-bold mb-2">
                  {formatCurrency(grandTotal)}
                </div>
                <div className="text-dark text-xs mb-2">
                  Total Invested: {formatCurrency(totalInvested)}
                </div>
                <GainBadge invested={totalInvested} current={grandTotal} />
              </div>

              {/* Categories - Vertical Stack */}
              <div className="space-y-5">
                {/* Equity */}
                <div>
                  <div
                    onClick={() => handleCategoryClick("equity")}
                    className="cursor-pointer hover:scale-[1.01] transition-transform duration-200 flex justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="text-dark text-xl font-bold mb-1">
                        EQUITY
                      </div>
                      <div className="text-dark text-3xl font-bold mb-1">
                        {formatCurrency(equityTotal)}
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                      <div className="text-dark text-xs mb-1">
                        {calculatePercentage(equityTotal)}% of portfolio
                      </div>
                      <GainBadge
                        invested={equityInvested}
                        current={equityTotal}
                      />
                      <div className="text-dark text-xs mt-2">
                        Click to view details →
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex justify-center">
                  <div className="w-4/5 border-t border-dark opacity-10"></div>
                </div>

                {/* Non-Equity */}
                <div>
                  <div
                    onClick={() => handleCategoryClick("nonEquity")}
                    className="cursor-pointer hover:scale-[1.01] transition-transform duration-200 flex justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="text-dark text-xl font-bold mb-1">
                        NON-EQUITY
                      </div>
                      <div className="text-dark text-3xl font-bold mb-1">
                        {formatCurrency(nonEquityTotal)}
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                      <div className="text-dark text-xs mb-1">
                        {calculatePercentage(nonEquityTotal)}% of portfolio
                      </div>
                      <GainBadge
                        invested={nonEquityInvested}
                        current={nonEquityTotal}
                      />
                      <div className="text-dark text-xs mt-2">
                        Click to view details →
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex justify-center">
                  <div className="w-4/5 border-t border-dark opacity-10"></div>
                </div>

                {/* Emergency */}
                <div>
                  <div
                    onClick={() => handleCategoryClick("emergency")}
                    className="cursor-pointer hover:scale-[1.01] transition-transform duration-200 flex justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="text-dark text-xl font-bold mb-1">
                        EMERGENCY
                      </div>
                      <div className="text-dark text-3xl font-bold mb-1">
                        {formatCurrency(emergencyTotal)}
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                      <div className="text-dark text-xs mb-1">
                        {calculatePercentage(emergencyTotal)}% of portfolio
                      </div>
                      <GainBadge
                        invested={emergencyInvested}
                        current={emergencyTotal}
                      />
                      <div className="text-dark text-xs mt-2">
                        Click to view details →
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom categories */}
                {customTotalsAndInvested
                  .filter((c) => c.current > 0)
                  .map((customCat, idx) => (
                    <div key={customCat.key || customCat.name + idx}>
                      <div className="flex justify-center">
                        <div className="w-4/5 border-t border-dark opacity-10"></div>
                      </div>
                      <div
                        onClick={() =>
                          navigate(`/dashboard/custom/${customCat.key}`)
                        }
                        className="cursor-pointer hover:opacity-80 transition-all flex justify-between pt-5"
                      >
                        <div className="flex flex-col">
                          <div className="text-dark text-xl font-bold mb-1">
                            {customCat.name.toUpperCase()}
                          </div>
                          <div className="text-dark text-3xl font-bold mb-1">
                            {formatCurrency(customCat.current)}
                          </div>
                        </div>
                        <div className="text-right flex flex-col justify-center">
                          <div className="text-dark text-xs mb-1">
                            {calculatePercentage(customCat.current)}% of
                            portfolio
                          </div>
                          <GainBadge
                            invested={customCat.invested}
                            current={customCat.current}
                          />
                          <div className="text-dark text-xs mt-2">
                            Click to view details →
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right Section - Donut Chart and Edit button */}
            <div className="flex flex-col items-end">
              <button
                onClick={() => navigate("/dashboard/edit")}
                className="mb-3 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1] px-5 py-2 font-semibold text-sm rounded-xl"
              >
                Edit Portfolio
              </button>
              <div className="w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(1)}%`
                      }
                      outerRadius={120}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detailed View - Show selected category details
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Save feedback banner */}
        {saveStatus && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
              saveStatus === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
            role="alert"
          >
            {saveMessage}
          </div>
        )}
        {/* Back Button */}
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 mb-5 text-dark font-semibold text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </button>

        {/* Equity Details - editable */}
        {selectedCategory === "equity" && equityEdit && (
          <div className="p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-dark">Equity Breakdown</h2>
              <button
                type="button"
                onClick={saveEquityBreakdown}
                className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl"
              >
                Save changes
              </button>
            </div>

            {/* Equity donut charts */}
            {(() => {
              const dsTotal = equityEdit.directStocks.reduce(
                (s, i) => s + (i.current || 0),
                0,
              );
              const mfTotal = equityEdit.mutualFunds.reduce(
                (s, i) => s + (i.current || 0),
                0,
              );
              const equityChartColors = [
                "#0ea5e9",
                "#8b5cf6",
                "#ec4899",
                "#f59e0b",
                "#10b981",
                "#ef4444",
                "#6366f1",
                "#14b8a6",
              ];
              const distributionData = [
                { name: "Direct Stocks", value: dsTotal, color: "#3b82f6" },
                { name: "Mutual Funds", value: mfTotal, color: "#10b981" },
              ].filter((d) => d.value > 0);
              const directStocksData = equityEdit.directStocks
                .filter((s) => (s.current || 0) > 0)
                .map((s, i) => ({
                  name: s.name || "Unnamed",
                  value: s.current || 0,
                  color: equityChartColors[i % equityChartColors.length],
                }));
              const mutualFundsData = equityEdit.mutualFunds
                .filter((m) => (m.current || 0) > 0)
                .map((m, i) => ({
                  name: m.type || m.name || "Unnamed",
                  value: m.current || 0,
                  color: equityChartColors[i % equityChartColors.length],
                }));
              const renderDonut = (data, title, emptyMessage, onClick) => {
                const card = (
                  <div className="bg-white/80 dark:bg-[#161717] rounded-xl border border-[#c6c6c6] dark:border-[#303030] p-4 flex flex-col items-center min-w-0 h-full">
                    <h3 className="text-dark font-semibold text-sm mb-2">
                      {title}
                    </h3>
                    {data.length === 0 ? (
                      <div className="h-[220px] flex items-center justify-center text-dark/60 text-sm">
                        {emptyMessage}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={1}
                            dataKey="value"
                            labelLine={false}
                          >
                            {data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDarkMode
                                ? "#171717"
                                : "#ffffff",
                              // borderColor: 'rgba(0,0,0,0.1)',
                              borderColor: isDarkMode ? "#303030" : "#c6c6c6",
                              color: isDarkMode ? "#f5f5f5" : "#000000",
                            }}
                            itemStyle={{
                              color: isDarkMode ? "#f5f5f5" : "#000000",
                            }}
                            formatter={(value) => formatCurrency(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                );
                if (onClick) {
                  return (
                    <button
                      type="button"
                      onClick={onClick}
                      className="text-left w-full min-w-0 h-full rounded-xl transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-dark/20 focus:ring-offset-2 cursor-pointer"
                    >
                      {card}
                    </button>
                  );
                }
                return card;
              };
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="min-w-0">
                    {renderDonut(
                      distributionData,
                      "Direct Stocks vs Mutual Funds",
                      "No equity data",
                    )}
                  </div>
                  <div className="min-w-0">
                    {renderDonut(
                      directStocksData,
                      "Direct Stocks",
                      "No direct stocks",
                      () =>
                        directStocksTableRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        }),
                    )}
                  </div>
                  <div className="min-w-0">
                    {renderDonut(
                      mutualFundsData,
                      "Mutual Funds",
                      "No mutual funds",
                      () =>
                        mutualFundsTableRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        }),
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Direct Stocks - Tailwind table */}
            <div ref={directStocksTableRef} className="mb-6 scroll-mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold text-dark">
                  Direct Stocks
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-dark font-bold text-base">
                    {formatCurrency(
                      equityEdit.directStocks.reduce(
                        (s, i) => s + (i.current || 0),
                        0,
                      ),
                    )}
                  </span>
                  <GainBadge
                    invested={equityEdit.directStocks.reduce(
                      (s, i) => s + (i.invested || 0),
                      0,
                    )}
                    current={equityEdit.directStocks.reduce(
                      (s, i) => s + (i.current || 0),
                      0,
                    )}
                  />
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030]">
                <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
                  <thead>
                    <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                      <th className="text-left font-semibold px-4 py-3 w-[30%]">
                        Name
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-[20%]">
                        Invested Amount
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-[20%]">
                        Current Value
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-[25%]">
                        Returns
                      </th>
                      <th className="text-center font-semibold px-2 py-3 w-[5%]">
                        {" "}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {equityEdit.directStocks.map((stock, index) => {
                      const gain = (stock.current || 0) - (stock.invested || 0);
                      const gainPct = calculateGainPercentage(
                        stock.invested || 0,
                        stock.current || 0,
                      );
                      return (
                        <tr
                          key={index}
                          className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]"
                        >
                          <td className="px-4 py-2 w-[30%]">
                            <input
                              type="text"
                              placeholder="Stock Name"
                              value={stock.name || ""}
                              onChange={(e) =>
                                updateEquityDirectStock(
                                  index,
                                  "name",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-transparent border-0 text-dark py-1.5 focus:outline-none focus:ring-0"
                            />
                          </td>
                          <td className="px-4 py-2 w-[20%]">
                            <input
                              type="number"
                              placeholder="Invested"
                              value={stock.invested === 0 ? "" : stock.invested}
                              onChange={(e) =>
                                updateEquityDirectStock(
                                  index,
                                  "invested",
                                  e.target.value,
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-2 w-[20%]">
                            <input
                              type="number"
                              placeholder="Current"
                              value={stock.current === 0 ? "" : stock.current}
                              onChange={(e) =>
                                updateEquityDirectStock(
                                  index,
                                  "current",
                                  e.target.value,
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-2 w-[25%] text-dark text-sm whitespace-nowrap">
                            {gain !== 0 || (stock.invested && stock.current)
                              ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                              : "—"}
                          </td>
                          <td className="px-2 py-2 w-[5%] text-center">
                            <button
                              type="button"
                              onClick={() => removeEquityDirectStock(index)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors"
                              title="Remove row"
                              aria-label="Remove row"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addEquityDirectStock}
                className="mt-3 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl"
              >
                Add
              </button>
            </div>

            {/* Mutual Funds - Tailwind table */}
            <div ref={mutualFundsTableRef} className="scroll-mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold text-dark">
                  Mutual Funds
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-dark font-bold text-base">
                    {formatCurrency(
                      equityEdit.mutualFunds.reduce(
                        (s, i) => s + (i.current || 0),
                        0,
                      ),
                    )}
                  </span>
                  <GainBadge
                    invested={equityEdit.mutualFunds.reduce(
                      (s, i) => s + (i.invested || 0),
                      0,
                    )}
                    current={equityEdit.mutualFunds.reduce(
                      (s, i) => s + (i.current || 0),
                      0,
                    )}
                  />
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030]">
                <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
                  <thead>
                    <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                      <th className="text-left font-semibold px-4 py-3 w-[30%]">
                        Name
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-[20%]">
                        Invested Amount
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-[20%]">
                        Current Value
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-[25%]">
                        Returns
                      </th>
                      <th className="text-center font-semibold px-2 py-3 w-[5%]">
                        {" "}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {equityEdit.mutualFunds.map((mf, index) => {
                      const gain = (mf.current || 0) - (mf.invested || 0);
                      const gainPct = calculateGainPercentage(
                        mf.invested || 0,
                        mf.current || 0,
                      );
                      return (
                        <tr
                          key={index}
                          className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]"
                        >
                          <td className="px-4 py-2 w-[30%]">
                            <input
                              type="text"
                              placeholder="Name / Type"
                              value={mf.type || mf.name || ""}
                              onChange={(e) =>
                                updateEquityMutualFund(
                                  index,
                                  "type",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-transparent border-0 text-dark py-1.5 focus:outline-none focus:ring-0"
                            />
                          </td>
                          <td className="px-4 py-2 w-[20%]">
                            <input
                              type="number"
                              placeholder="Invested"
                              value={mf.invested === 0 ? "" : mf.invested}
                              onChange={(e) =>
                                updateEquityMutualFund(
                                  index,
                                  "invested",
                                  e.target.value,
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-2 w-[20%]">
                            <input
                              type="number"
                              placeholder="Current"
                              value={mf.current === 0 ? "" : mf.current}
                              onChange={(e) =>
                                updateEquityMutualFund(
                                  index,
                                  "current",
                                  e.target.value,
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-2 w-[25%] text-dark text-sm whitespace-nowrap">
                            {gain !== 0 || (mf.invested && mf.current)
                              ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                              : "—"}
                          </td>
                          <td className="px-2 py-2 w-[5%] text-center">
                            <button
                              type="button"
                              onClick={() => removeEquityMutualFund(index)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors"
                              title="Remove row"
                              aria-label="Remove row"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addEquityMutualFund}
                className="mt-3 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Non-Equity Details - editable */}
        {selectedCategory === "nonEquity" && nonEquityEdit && (
          <div className="p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-dark">
                Non-Equity Breakdown
              </h2>
              <button
                type="button"
                onClick={saveNonEquityBreakdown}
                className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl"
              >
                Save changes
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030] mb-4">
              <table className="w-full min-w-[400px] table-fixed border-collapse text-dark text-sm">
                <thead>
                  <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                    <th className="text-left font-semibold px-4 py-3 w-[30%]">
                      Name
                    </th>
                    <th className="text-left font-semibold px-4 py-3 w-[20%]">
                      Invested
                    </th>
                    <th className="text-left font-semibold px-4 py-3 w-[20%]">
                      Current
                    </th>
                    <th className="text-left font-normal px-4 py-3 w-[25%]">
                      Returns
                    </th>
                    <th className="text-center font-semibold px-2 py-3 w-[5%]">
                      {" "}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                    <td className="px-4 py-2 font-medium">Cash</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          nonEquityEdit.cash?.invested === 0
                            ? ""
                            : nonEquityEdit.cash?.invested
                        }
                        onChange={(e) =>
                          setNonEquityField(
                            "cash.invested",
                            e.target.value,
                            true,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Invested"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          nonEquityEdit.cash?.current === 0
                            ? ""
                            : nonEquityEdit.cash?.current
                        }
                        onChange={(e) =>
                          setNonEquityField(
                            "cash.current",
                            e.target.value,
                            true,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Current"
                      />
                    </td>
                    <td className="px-4 py-2 text-left text-dark text-sm font-normal whitespace-nowrap">
                      {(() => {
                        const inv = nonEquityEdit.cash?.invested || 0;
                        const cur = nonEquityEdit.cash?.current || 0;
                        const gain = cur - inv;
                        const gainPct = calculateGainPercentage(inv, cur);
                        return gain !== 0 || (inv && cur)
                          ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                          : "—";
                      })()}
                    </td>
                    <td className="px-2 py-2 w-[5%] text-center">
                      <button
                        type="button"
                        onClick={() => clearNonEquityRow("cash")}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors"
                        title="Clear row"
                        aria-label="Clear row"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                    <td className="px-4 py-2 font-medium">Gold</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          nonEquityEdit.commodities?.gold?.invested === 0
                            ? ""
                            : nonEquityEdit.commodities?.gold?.invested
                        }
                        onChange={(e) =>
                          setNonEquityField(
                            "commodities.gold.invested",
                            e.target.value,
                            true,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Invested"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          nonEquityEdit.commodities?.gold?.current === 0
                            ? ""
                            : nonEquityEdit.commodities?.gold?.current
                        }
                        onChange={(e) =>
                          setNonEquityField(
                            "commodities.gold.current",
                            e.target.value,
                            true,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Current"
                      />
                    </td>
                    <td className="px-4 py-2 text-left text-dark text-sm font-normal whitespace-nowrap">
                      {(() => {
                        const inv =
                          nonEquityEdit.commodities?.gold?.invested || 0;
                        const cur =
                          nonEquityEdit.commodities?.gold?.current || 0;
                        const gain = cur - inv;
                        const gainPct = calculateGainPercentage(inv, cur);
                        return gain !== 0 || (inv && cur)
                          ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                          : "—";
                      })()}
                    </td>
                    <td className="px-2 py-2 w-[5%] text-center">
                      <button
                        type="button"
                        onClick={() => clearNonEquityRow("gold")}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors"
                        title="Clear row"
                        aria-label="Clear row"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                    <td className="px-4 py-2 font-medium">Silver</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          nonEquityEdit.commodities?.silver?.invested === 0
                            ? ""
                            : nonEquityEdit.commodities?.silver?.invested
                        }
                        onChange={(e) =>
                          setNonEquityField(
                            "commodities.silver.invested",
                            e.target.value,
                            true,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Invested"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          nonEquityEdit.commodities?.silver?.current === 0
                            ? ""
                            : nonEquityEdit.commodities?.silver?.current
                        }
                        onChange={(e) =>
                          setNonEquityField(
                            "commodities.silver.current",
                            e.target.value,
                            true,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Current"
                      />
                    </td>
                    <td className="px-4 py-2 text-left text-dark text-sm font-normal whitespace-nowrap">
                      {(() => {
                        const inv =
                          nonEquityEdit.commodities?.silver?.invested || 0;
                        const cur =
                          nonEquityEdit.commodities?.silver?.current || 0;
                        const gain = cur - inv;
                        const gainPct = calculateGainPercentage(inv, cur);
                        return gain !== 0 || (inv && cur)
                          ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                          : "—";
                      })()}
                    </td>
                    <td className="px-2 py-2 w-[5%] text-center">
                      <button
                        type="button"
                        onClick={() => clearNonEquityRow("silver")}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors"
                        title="Clear row"
                        aria-label="Clear row"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-dark mb-3">
                Fixed Income Assets
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030]">
                <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
                  <thead>
                    <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                      <th className="text-left font-semibold px-4 py-3 w-[30%]">
                        Name
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-[20%]">
                        Invested Amount
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-[20%]">
                        Current Value
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-[25%]">
                        Returns
                      </th>
                      <th className="text-center font-semibold px-2 py-3 w-[5%]">
                        {" "}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonEquityEdit.fixedIncomeAssets?.map((asset, index) => {
                      const gain = (asset.current || 0) - (asset.invested || 0);
                      const gainPct = calculateGainPercentage(
                        asset.invested || 0,
                        asset.current || 0,
                      );
                      return (
                        <tr
                          key={index}
                          className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]"
                        >
                          <td className="px-4 py-2 w-[30%]">
                            <input
                              type="text"
                              placeholder="Name"
                              value={asset.name || ""}
                              onChange={(e) =>
                                updateNonEquityFixedIncome(
                                  index,
                                  "name",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-transparent border-0 text-dark py-1.5 focus:outline-none focus:ring-0"
                            />
                          </td>
                          <td className="px-4 py-2 w-[20%]">
                            <input
                              type="number"
                              placeholder="Invested"
                              value={asset.invested === 0 ? "" : asset.invested}
                              onChange={(e) =>
                                updateNonEquityFixedIncome(
                                  index,
                                  "invested",
                                  e.target.value,
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-2 w-[20%]">
                            <input
                              type="number"
                              placeholder="Current"
                              value={asset.current === 0 ? "" : asset.current}
                              onChange={(e) =>
                                updateNonEquityFixedIncome(
                                  index,
                                  "current",
                                  e.target.value,
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-2 w-[25%] text-dark text-sm whitespace-nowrap">
                            {gain !== 0 || (asset.invested && asset.current)
                              ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                              : "—"}
                          </td>
                          <td className="px-2 py-2 w-[5%] text-center">
                            <button
                              type="button"
                              onClick={() => removeNonEquityFixedIncome(index)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors"
                              title="Remove row"
                              aria-label="Remove row"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addNonEquityFixedIncome}
                className="mt-3 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Emergency Fund Details - editable */}
        {selectedCategory === "emergency" && emergencyEdit && (
          <div className="p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-dark">
                Emergency Fund Breakdown
              </h2>
              <button
                type="button"
                onClick={saveEmergencyBreakdown}
                className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl"
              >
                Save changes
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#c6c6c6] dark:border-[#303030]">
              <table className="w-full min-w-[400px] table-fixed border-collapse text-dark text-sm">
                <thead>
                  <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                    <th className="text-left font-semibold px-4 py-3 w-[30%]">
                      Name
                    </th>
                    <th className="text-left font-semibold px-4 py-3 w-[20%]">
                      Invested
                    </th>
                    <th className="text-left font-semibold px-4 py-3 w-[20%]">
                      Current
                    </th>
                    <th className="text-left font-normal px-4 py-3 w-[25%]">
                      Returns
                    </th>
                    <th className="text-center font-semibold px-2 py-3 w-[5%]">
                      {" "}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                    <td className="px-4 py-2 font-medium">
                      Invested (Emergency)
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          emergencyEdit.invested?.investedAmount === 0
                            ? ""
                            : emergencyEdit.invested?.investedAmount
                        }
                        onChange={(e) =>
                          setEmergencyField(
                            "invested",
                            "investedAmount",
                            e.target.value,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Invested"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          emergencyEdit.invested?.currentAmount === 0
                            ? ""
                            : emergencyEdit.invested?.currentAmount
                        }
                        onChange={(e) =>
                          setEmergencyField(
                            "invested",
                            "currentAmount",
                            e.target.value,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Current"
                      />
                    </td>
                    <td className="px-4 py-2 text-left text-dark text-sm font-normal whitespace-nowrap">
                      {(() => {
                        const inv = emergencyEdit.invested?.investedAmount || 0;
                        const cur = emergencyEdit.invested?.currentAmount || 0;
                        const gain = cur - inv;
                        const gainPct = calculateGainPercentage(inv, cur);
                        return gain !== 0 || (inv && cur)
                          ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                          : "—";
                      })()}
                    </td>
                    <td className="px-2 py-2 w-[5%] text-center">
                      <button
                        type="button"
                        onClick={() => clearEmergencyRow("invested")}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors"
                        title="Clear row"
                        aria-label="Clear row"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                    <td className="px-4 py-2 font-medium">Bank Account</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          emergencyEdit.bankAccount?.investedAmount === 0
                            ? ""
                            : emergencyEdit.bankAccount?.investedAmount
                        }
                        onChange={(e) =>
                          setEmergencyField(
                            "bankAccount",
                            "investedAmount",
                            e.target.value,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Invested"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={
                          emergencyEdit.bankAccount?.currentAmount === 0
                            ? ""
                            : emergencyEdit.bankAccount?.currentAmount
                        }
                        onChange={(e) =>
                          setEmergencyField(
                            "bankAccount",
                            "currentAmount",
                            e.target.value,
                          )
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark text-left py-1.5 focus:outline-none focus:border-dark/50 font-mono tabular-nums"
                        placeholder="Current"
                      />
                    </td>
                    <td className="px-4 py-2 text-left text-dark text-sm font-normal whitespace-nowrap">
                      {(() => {
                        const inv =
                          emergencyEdit.bankAccount?.investedAmount || 0;
                        const cur =
                          emergencyEdit.bankAccount?.currentAmount || 0;
                        const gain = cur - inv;
                        const gainPct = calculateGainPercentage(inv, cur);
                        return gain !== 0 || (inv && cur)
                          ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                          : "—";
                      })()}
                    </td>
                    <td className="px-2 py-2 w-[5%] text-center">
                      <button
                        type="button"
                        onClick={() => clearEmergencyRow("bankAccount")}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10 transition-colors"
                        title="Clear row"
                        aria-label="Clear row"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Custom category details - editable */}
        {selectedCategory === "custom" && !customCategoryEdit && (
          <div className="p-5 text-dark">
            <p>
              This category was not found or has been removed. Click Back to
              Overview to return.
            </p>
          </div>
        )}
        {selectedCategory === "custom" && customCategoryEdit && (
          <div className="p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-dark">
                {customCategoryEdit.name} Breakdown
              </h2>
              <button
                type="button"
                onClick={saveCustomCategoryBreakdown}
                className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-5 py-2 font-semibold hover:opacity-80 transition-opacity text-sm rounded-xl"
              >
                Save changes
              </button>
            </div>
            <div className="space-y-8">
              {(customCategoryEdit.subcategories || []).map((sub, subIndex) => (
                <div
                  key={sub.key}
                  className="rounded-xl border border-[#c6c6c6] dark:border-[#303030] overflow-hidden bg-white/5 dark:bg-[#161717]"
                >
                  <h3 className="text-lg font-semibold text-dark px-4 py-3 bg-dark/5 border-b border-[#c6c6c6] dark:border-[#303030]">
                    {sub.name}
                  </h3>
                  {sub.type === "amount" ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px] border-collapse text-dark text-sm">
                        <thead>
                          <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                            <th className="text-left font-semibold px-4 py-3 w-[30%]">
                              Name
                            </th>
                            <th className="text-left font-semibold px-4 py-3 w-[25%]">
                              Invested
                            </th>
                            <th className="text-left font-semibold px-4 py-3 w-[25%]">
                              Current
                            </th>
                            <th className="text-left font-normal px-4 py-3 w-[20%]">
                              Returns
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]">
                            <td className="px-4 py-2 font-medium">
                              {sub.name}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={
                                  sub.amount?.invested === 0
                                    ? ""
                                    : sub.amount?.invested
                                }
                                onChange={(e) =>
                                  updateCustomSubAmount(
                                    subIndex,
                                    "invested",
                                    e.target.value,
                                  )
                                }
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark py-1.5 font-mono"
                                placeholder="Invested"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                value={
                                  sub.amount?.current === 0
                                    ? ""
                                    : sub.amount?.current
                                }
                                onChange={(e) =>
                                  updateCustomSubAmount(
                                    subIndex,
                                    "current",
                                    e.target.value,
                                  )
                                }
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark py-1.5 font-mono"
                                placeholder="Current"
                              />
                            </td>
                            <td className="px-4 py-2 text-dark text-sm whitespace-nowrap">
                              {(() => {
                                const inv = sub.amount?.invested || 0;
                                const cur = sub.amount?.current || 0;
                                const gain = cur - inv;
                                const gainPct = calculateGainPercentage(
                                  inv,
                                  cur,
                                );
                                return gain !== 0 || (inv && cur)
                                  ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                                  : "—";
                              })()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px] table-fixed border-collapse text-dark text-sm">
                        <thead>
                          <tr className="border-b border-[#c6c6c6] dark:border-[#303030] bg-dark/5">
                            <th className="text-left font-semibold px-4 py-3 w-[30%]">
                              Name
                            </th>
                            <th className="text-left font-semibold px-4 py-3 w-[20%]">
                              Invested
                            </th>
                            <th className="text-left font-semibold px-4 py-3 w-[20%]">
                              Current
                            </th>
                            <th className="text-left font-semibold px-4 py-3 w-[25%]">
                              Returns
                            </th>
                            <th className="text-center font-semibold px-2 py-3 w-[5%]">
                              {" "}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(sub.holdings || []).map((h, holdIndex) => {
                            const gain = (h.current || 0) - (h.invested || 0);
                            const gainPct = calculateGainPercentage(
                              h.invested || 0,
                              h.current || 0,
                            );
                            return (
                              <tr
                                key={holdIndex}
                                className="border-b border-[#c6c6c6] dark:border-[#303030] hover:bg-dark/[0.02]"
                              >
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    placeholder="Name"
                                    value={h.name || ""}
                                    onChange={(e) =>
                                      updateCustomHolding(
                                        subIndex,
                                        holdIndex,
                                        "name",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-transparent border-0 text-dark py-1.5 focus:outline-none"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    placeholder="Invested"
                                    value={h.invested === 0 ? "" : h.invested}
                                    onChange={(e) =>
                                      updateCustomHolding(
                                        subIndex,
                                        holdIndex,
                                        "invested",
                                        e.target.value,
                                      )
                                    }
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark py-1.5 font-mono"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    placeholder="Current"
                                    value={h.current === 0 ? "" : h.current}
                                    onChange={(e) =>
                                      updateCustomHolding(
                                        subIndex,
                                        holdIndex,
                                        "current",
                                        e.target.value,
                                      )
                                    }
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="w-full bg-transparent border-0 border-b border-[#c6c6c6] dark:border-[#303030] text-dark py-1.5 font-mono"
                                  />
                                </td>
                                <td className="px-4 py-2 text-dark text-sm whitespace-nowrap">
                                  {gain !== 0 || (h.invested && h.current)
                                    ? `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${gain >= 0 ? "+" : ""}${gainPct}%)`
                                    : "—"}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeCustomHolding(subIndex, holdIndex)
                                    }
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-dark/70 hover:text-red-600  hover:bg-dark/10"
                                    title="Remove row"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <button
                        type="button"
                        onClick={() => addCustomHolding(subIndex)}
                        className="mt-3 ml-4 bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-4 py-2 font-semibold hover:opacity-80 text-sm rounded-xl"
                      >
                        Add row
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
