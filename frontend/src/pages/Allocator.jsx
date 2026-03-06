import { useEffect, useMemo, useState, useRef } from "react";
import { allocatorAPI, portfolioAPI } from "../services/api";
import { ChevronDown, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../context/ThemeContext";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const INVESTMENT_CATEGORIES = [
  { value: "equity", label: "Equity" },
  { value: "nonEquity", label: "Non-Equity" },
];

const INVESTMENT_SUBCATEGORIES = {
  equity: [
    {
      value: "directStocks",
      label: "Direct Stocks",
      portfolioCategory: "equity.directStocks",
      tag: "Direct Stocks",
    },
    {
      value: "mutualFunds",
      label: "Mutual Funds",
      portfolioCategory: "equity.mutualFunds",
      tag: "Mutual Funds",
    },
  ],
  nonEquity: [
    {
      value: "cash",
      label: "Cash",
      portfolioCategory: "nonEquity.cash",
      tag: "Cash",
    },
    {
      value: "gold",
      label: "Gold",
      portfolioCategory: "nonEquity.gold",
      tag: "Gold",
    },
    {
      value: "silver",
      label: "Silver",
      portfolioCategory: "nonEquity.silver",
      tag: "Silver",
    },
    {
      value: "fixedIncomeAssets",
      label: "Fixed Income",
      portfolioCategory: "nonEquity.fixedIncomeAssets",
      tag: "Fixed Income",
    },
  ],
};

function getCurrentYear() {
  return new Date().getFullYear();
}

function getCurrentMonth() {
  return new Date().getMonth() + 1; // 1-12
}

function preventNumberInputScrollChange(e) {
  e.preventDefault();
  e.currentTarget.blur();
}

const emptyGroupRow = () => ({
  label: "",
  amount: "",
  portfolioCategory: "",
  portfolioName: "",
});

const Allocator = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [portfolio, setPortfolio] = useState(null);

  const [year, setYear] = useState(getCurrentYear());
  const [month, setMonth] = useState(getCurrentMonth());

  const [salary, setSalary] = useState("");
  const [investments, setInvestments] = useState([emptyGroupRow()]);
  const [savings, setSavings] = useState([emptyGroupRow()]);
  const [personalExpenses, setPersonalExpenses] = useState([emptyGroupRow()]);
  const [monthlyNeeds, setMonthlyNeeds] = useState([emptyGroupRow()]);

  const [yearData, setYearData] = useState(null);
  const [chartYear, setChartYear] = useState(getCurrentYear());
  const [chartYearData, setChartYearData] = useState(null);

  const [investmentOptions, setInvestmentOptions] = useState([]);
  const [openInvestmentIndex, setOpenInvestmentIndex] = useState(null);
  const [showNewInvestment, setShowNewInvestment] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    name: "",
    category: "equity",
    subcategory: "directStocks",
  });
  const hasLoadedInitialYear = useRef(false);

  const [openMonth, setOpenMonth] = useState(false);
  const [openChartYear, setOpenChartYear] = useState(false);
  const dropdownRef = useRef(null);
  const chartYearDropdownRef = useRef(null);

  const buildInvestmentOptions = (p) => {
    if (!p) return [];
    const options = [];
    (p.equity?.directStocks || []).forEach((h) => {
      options.push({
        label: h.name,
        tag: "Direct Stocks",
        portfolioCategory: "equity.directStocks",
        portfolioName: h.name,
      });
    });
    (p.equity?.mutualFunds || []).forEach((h) => {
      const display = h.type || h.name;
      options.push({
        label: display,
        tag: "Mutual Funds",
        portfolioCategory: "equity.mutualFunds",
        portfolioName: display,
      });
    });
    (p.nonEquity?.fixedIncomeAssets || []).forEach((h) => {
      options.push({
        label: h.name,
        tag: "Fixed Income",
        portfolioCategory: "nonEquity.fixedIncomeAssets",
        portfolioName: h.name,
      });
    });
    options.push(
      {
        label: "Cash",
        tag: "Cash",
        portfolioCategory: "nonEquity.cash",
        portfolioName: "Cash",
      },
      {
        label: "Gold",
        tag: "Gold",
        portfolioCategory: "nonEquity.gold",
        portfolioName: "Gold",
      },
      {
        label: "Silver",
        tag: "Silver",
        portfolioCategory: "nonEquity.silver",
        portfolioName: "Silver",
      },
    );
    return options;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenMonth(false);
      }
      if (
        chartYearDropdownRef.current &&
        !chartYearDropdownRef.current.contains(event.target)
      ) {
        setOpenChartYear(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const currentYear = getCurrentYear();
      try {
        setLoading(true);
        const [portfolioRes, allocRes] = await Promise.all([
          portfolioAPI.getCurrent().catch(() => ({ data: null })),
          allocatorAPI
            .getYear(currentYear)
            .catch(() => ({ data: { months: [] } })),
        ]);
        setPortfolio(portfolioRes.data);
        setInvestmentOptions(buildInvestmentOptions(portfolioRes.data));
        setYearData(allocRes.data || { year: currentYear, months: [] });
        setChartYearData(allocRes.data || { year: currentYear, months: [] });
        hasLoadedInitialYear.current = true;
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    // Initial page load fetches portfolio + current selected year allocations.
    load();
  }, []);

  useEffect(() => {
    if (!hasLoadedInitialYear.current) return;
    let cancelled = false;

    const loadYearAllocations = async () => {
      try {
        const allocRes = await allocatorAPI
          .getYear(year)
          .catch(() => ({ data: { year, months: [] } }));
        if (!cancelled) {
          setYearData(allocRes.data || { year, months: [] });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setYearData({ year, months: [] });
        }
      }
    };

    loadYearAllocations();
    return () => {
      cancelled = true;
    };
  }, [year]);

  useEffect(() => {
    if (!hasLoadedInitialYear.current) return;
    let cancelled = false;

    const loadChartYearAllocations = async () => {
      if (chartYear === year && yearData) {
        setChartYearData(yearData);
        return;
      }

      try {
        const allocRes = await allocatorAPI
          .getYear(chartYear)
          .catch(() => ({ data: { year: chartYear, months: [] } }));
        if (!cancelled) {
          setChartYearData(allocRes.data || { year: chartYear, months: [] });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setChartYearData({ year: chartYear, months: [] });
        }
      }
    };

    loadChartYearAllocations();
    return () => {
      cancelled = true;
    };
  }, [chartYear, year, yearData]);

  useEffect(() => {
    if (!yearData || !Array.isArray(yearData.months)) return;
    const existing = yearData.months.find((m) => m.month === month);
    if (!existing) {
      const prevWithSalary = [...yearData.months]
        .filter((m) => m.month < month && m.salary)
        .sort((a, b) => b.month - a.month)[0];
      setSalary(prevWithSalary?.salary ?? "");
      setInvestments([emptyGroupRow()]);
      setSavings([emptyGroupRow()]);
      setPersonalExpenses([emptyGroupRow()]);
      setMonthlyNeeds([emptyGroupRow()]);
      return;
    }
    setSalary(existing.salary ?? "");
    const mapGroup = (arr) =>
      arr && arr.length
        ? arr.map((x) => ({
            label: x.label || "",
            amount: x.amount ?? "",
            portfolioCategory: x.portfolioCategory || "",
            portfolioName: x.portfolioName || "",
          }))
        : [emptyGroupRow()];
    setInvestments(mapGroup(existing.investments));
    setSavings(mapGroup(existing.savings));
    setPersonalExpenses(mapGroup(existing.personalExpenses));
    setMonthlyNeeds(mapGroup(existing.monthlyNeeds));
  }, [month, yearData]);

  const sumGroup = (items) =>
    (items || []).reduce((sum, x) => sum + (parseFloat(x.amount) || 0), 0);

  const totalInvestments = sumGroup(investments);
  const totalSavings = sumGroup(savings);
  const totalPersonal = sumGroup(personalExpenses);
  const totalNeeds = sumGroup(monthlyNeeds);
  const totalAllocated =
    totalInvestments + totalSavings + totalPersonal + totalNeeds;
  const salaryNumber = parseFloat(salary) || 0;

  const chartYearOptions = useMemo(() => {
    const currentYear = getCurrentYear();
    const list = [];
    for (let y = currentYear + 1; y >= currentYear - 10; y -= 1) {
      list.push(y);
    }
    if (!list.includes(year)) list.push(year);
    if (!list.includes(chartYear)) list.push(chartYear);
    return [...new Set(list)].sort((a, b) => b - a);
  }, [year, chartYear]);

  const chartData = useMemo(() => {
    if (!chartYearData || !Array.isArray(chartYearData.months)) return [];
    const byMonth = {};
    chartYearData.months.forEach((m) => {
      const key = m.month;
      const makeSum = (arr) =>
        (arr || []).reduce((s, x) => s + (x.amount || 0), 0);
      byMonth[key] = {
        month: MONTH_LABELS[key - 1] || `M${key}`,
        Investments: makeSum(m.investments),
        Savings: makeSum(m.savings),
        "Personal Expenses": makeSum(m.personalExpenses),
        "Monthly Needs": makeSum(m.monthlyNeeds),
      };
    });
    return Object.keys(byMonth)
      .map((k) => ({ monthIndex: Number(k), ...byMonth[k] }))
      .sort((a, b) => a.monthIndex - b.monthIndex);
  }, [chartYearData]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangeGroup = (setter, index, field, value) => {
    setter((rows) => {
      const copy = [...rows];
      const row = { ...(copy[index] || emptyGroupRow()) };
      if (field === "amount") {
        row.amount = value;
      } else {
        row[field] = value;
      }
      copy[index] = row;
      return copy;
    });
  };

  const handleSelectInvestmentOption = (index, opt) => {
    setInvestments((rows) => {
      const copy = [...rows];
      const row = { ...(copy[index] || emptyGroupRow()) };
      if (opt) {
        row.label = opt.label;
        row.portfolioCategory = opt.portfolioCategory;
        row.portfolioName = opt.portfolioName;
      }
      copy[index] = row;
      return copy;
    });
    setOpenInvestmentIndex(null);
  };

  const addRow = (setter) => {
    setter((rows) => [...rows, emptyGroupRow()]);
  };

  const removeRow = (setter, index) => {
    setter((rows) => {
      if (rows.length === 1) return [emptyGroupRow()];
      return rows.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    const s = parseFloat(salary);
    if (!s || s <= 0) {
      showMessage("error", "Enter a valid monthly salary.");
      return;
    }
    if (totalAllocated > s + 0.01) {
      showMessage("error", "Allocated amount cannot exceed salary.");
      return;
    }

    const cleanGroup = (rows) =>
      rows
        .map((r) => ({
          label: (r.label || "").trim(),
          amount: parseFloat(r.amount) || 0,
          portfolioCategory: r.portfolioCategory || null,
          portfolioName: r.portfolioName || null,
        }))
        .filter((r) => r.label && r.amount > 0);

    const payload = {
      salary: s,
      investments: cleanGroup(investments),
      savings: cleanGroup(savings),
      personalExpenses: cleanGroup(personalExpenses),
      monthlyNeeds: cleanGroup(monthlyNeeds),
    };

    try {
      setSaving(true);
      const res = await allocatorAPI.saveMonth(year, month, payload);
      setYearData(res.data);
      if (chartYear === year) {
        setChartYearData(res.data);
      }
      showMessage("success", "Allocator saved and portfolio updated.");
    } catch (e) {
      console.error(e);
      showMessage("error", e.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewInvestment = () => {
    const name = (newInvestment.name || "").trim();
    if (!name) {
      showMessage("error", "Enter a name for the new investment.");
      return;
    }
    const subs = INVESTMENT_SUBCATEGORIES[newInvestment.category] || [];
    const sub =
      subs.find((s) => s.value === newInvestment.subcategory) || subs[0];
    if (!sub) {
      showMessage("error", "Select a valid category and subcategory.");
      return;
    }
    const option = {
      label: name,
      tag: sub.tag,
      portfolioCategory: sub.portfolioCategory,
      portfolioName: name,
    };
    setInvestmentOptions((prev) => [...prev, option]);
    setInvestments((rows) => {
      if (!rows.length) return [{ ...emptyGroupRow(), ...option }];
      const copy = [...rows];
      const lastIndex = copy.length - 1;
      copy[lastIndex] = { ...(copy[lastIndex] || emptyGroupRow()), ...option };
      return copy;
    });
    setShowNewInvestment(false);
    setNewInvestment({
      name: "",
      category: "equity",
      subcategory: "directStocks",
    });
    showMessage(
      "success",
      "New investment added. It will be updated when you save this month.",
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-dark">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-dark mb-2">Allocator</h1>
        <p className="text-dark/80 text-sm mb-6">
          Plan how your monthly salary is split between portfolio investments,
          savings goals, personal expenses, and essential monthly needs.
          Investment allocations automatically update your portfolio.
        </p>

        {message && (
          <div
            className={`mb-4 px-4 py-2 rounded-xl text-sm font-medium ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-end">
          <div className="space-y-3 lg:col-span-1">
            <div>
              <label className="block text-md font-semibold text-dark/80 mb-1">
                Monthly salary
              </label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                onWheel={preventNumberInputScrollChange}
                placeholder="Enter your monthly salary"
                className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-transparent text-dark px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dark/20"
              />
            </div>
            <div className="flex flex-row items-end gap-3">
              <div className="flex-1">
                <label className="block text-md font-semibold text-dark/80 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) =>
                    setYear(parseInt(e.target.value || getCurrentYear(), 10))
                  }
                  onWheel={preventNumberInputScrollChange}
                  className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-transparent text-dark px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dark/20"
                />
              </div>

              <div ref={dropdownRef} className="flex-1 min-w-[200px] relative">
                <label className="block text-md font-semibold text-dark/80 mb-1">
                  Month
                </label>
                

                {/* Input field */}
                <div className="relative">
                  <input
                    type="text"
                    value={MONTH_LABELS[month - 1]}
                    readOnly
                    onClick={() => setOpenMonth((prev) => !prev)}
                    className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-bg text-dark pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dark/20 cursor-pointer"
                  />
                  <button
                    type="button"
                    aria-label={openMonth ? "Close month dropdown" : "Open month dropdown"}
                    onClick={() => setOpenMonth((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-2 flex items-center text-dark/60 hover:text-dark"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${openMonth ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {/* Dropdown */}
                {openMonth && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl bg-[#f7f5f3] dark:bg-[#1d1f1f] shadow-lg">
                    {MONTH_LABELS.map((label, idx) => (
                      <button
                        key={label}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setMonth(idx + 1);
                          setOpenMonth(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-dark/5 text-sm"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#161717] rounded-xl border border-[#c6c6c6] dark:border-[#303030] p-5 flex flex-col justify-center">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="text-xs text-dark/70">Total allocated</div>
                <div className="text-lg font-semibold text-dark">
                  ₹{totalAllocated.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-dark/70">Salary</div>
                <div className="text-sm font-medium text-dark">
                  ₹{salaryNumber.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
            <div className="h-2 rounded-xl bg-dark/5 dark:bg-[#161717] overflow-hidden mb-1">
              <div
                className={`h-full rounded-xl ${
                  totalAllocated <= salaryNumber ? "bg-blue-500" : "bg-red-500"
                }`}
                style={{
                  width: `${salaryNumber > 0 ? Math.min(100, (totalAllocated / salaryNumber) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-dark/70">
              {salaryNumber === 0
                ? "Enter salary to see allocation progress."
                : totalAllocated > salaryNumber
                  ? "You have allocated more than your salary."
                  : `You still have ₹${(salaryNumber - totalAllocated).toLocaleString("en-IN")} unallocated.`}
            </div>
          </div>
        </div>

        <div className="space-y-8 mb-8">
          {showNewInvestment && (
            <div className="bg-white/80 dark:bg-[#161717] rounded-xl border border-dark/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-dark">
                  Add new investment
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewInvestment(false)}
                  className="text-xs text-dark/60 hover:text-dark"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark/80 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newInvestment.name}
                    onChange={(e) =>
                      setNewInvestment((ni) => ({
                        ...ni,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g. ICICI AMC"
                    className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-white text-dark px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-dark/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark/80 mb-1">
                    Category
                  </label>
                  <select
                    value={newInvestment.category}
                    onChange={(e) => {
                      const value = e.target.value;
                      const subs = INVESTMENT_SUBCATEGORIES[value] || [];
                      setNewInvestment((ni) => ({
                        ...ni,
                        category: value,
                        subcategory: subs[0]?.value || ni.subcategory,
                      }));
                    }}
                    className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-white text-dark px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-dark/20"
                  >
                    {INVESTMENT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark/80 mb-1">
                    Subcategory
                  </label>
                  <select
                    value={newInvestment.subcategory}
                    onChange={(e) =>
                      setNewInvestment((ni) => ({
                        ...ni,
                        subcategory: e.target.value,
                      }))
                    }
                    className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-white text-dark px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-dark/20"
                  >
                    {(
                      INVESTMENT_SUBCATEGORIES[newInvestment.category] || []
                    ).map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCreateNewInvestment}
                  className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  px-4 py-2 text-xs font-semibold rounded-xl hover:opacity-90"
                >
                  Add investment
                </button>
              </div>
            </div>
          )}

          <InvestmentSection
            title="Investments (existing portfolio assets)"
            helper="Allocate part of your salary directly into assets you already track in your portfolio."
            rows={investments}
            onChange={handleChangeGroup}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            setter={setInvestments}
            options={investmentOptions}
            openIndex={openInvestmentIndex}
            setOpenIndex={setOpenInvestmentIndex}
            onSelectOption={handleSelectInvestmentOption}
            onOpenNewInvestment={() => setShowNewInvestment(true)}
          />
          <Section
            title="Savings goals / milestones"
            helper="Future goals such as travel, house down-payment, education, etc."
            rows={savings}
            onChange={handleChangeGroup}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            setter={setSavings}
          />
          <Section
            title="Personal expenses"
            helper="Discretionary spending like dining out, shopping, entertainment."
            rows={personalExpenses}
            onChange={handleChangeGroup}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            setter={setPersonalExpenses}
          />
          <Section
            title="Monthly needs"
            helper="Fixed essentials like rent, groceries, utilities, EMIs."
            rows={monthlyNeeds}
            onChange={handleChangeGroup}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            setter={setMonthlyNeeds}
          />
        </div>

        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1] px-6 py-2.5 text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? "Saving..." : "Save allocation"}
          </button>
        </div>

        <div className="bg-white/5 dark:bg-[#161717] mt-16">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-lg font-semibold text-dark">
              Yearly allocation breakdown
            </h2>
            <div
              ref={chartYearDropdownRef}
              className="flex items-center gap-2 relative"
            >
              <label className="text-xs text-dark/70">Year</label>
              <div className="relative min-w-[90px]">
                <input
                  type="text"
                  value={chartYear}
                  readOnly
                  onClick={() => setOpenChartYear((prev) => !prev)}
                  className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-bg text-dark pl-2 pr-8 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-dark/20 cursor-pointer"
                />
                <button
                  type="button"
                  aria-label={
                    openChartYear
                      ? "Close chart year dropdown"
                      : "Open chart year dropdown"
                  }
                  onClick={() => setOpenChartYear((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-2 flex items-center text-dark/60 hover:text-dark"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${openChartYear ? "rotate-180" : ""}`}
                  />
                </button>
                {openChartYear && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl bg-[#f7f5f3] dark:bg-[#1d1f1f] shadow-lg">
                    {chartYearOptions.map((optionYear) => (
                      <button
                        key={optionYear}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setChartYear(optionYear);
                          setOpenChartYear(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-dark/5 text-xs"
                      >
                        {optionYear}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-dark/70 mb-10">
            Stacked monthly view of how your salary is divided across categories
            in {chartYear}.
          </p>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-start text-dark/60 text-sm">
              No allocations saved yet for this year.
            </div>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDarkMode ? "#333" : "#e5e5e5"}
                  />
                  <XAxis
                    dataKey="month"
                    stroke={isDarkMode ? "#888" : "#333"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={isDarkMode ? "#888" : "#333"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      `₹${value >= 1000 ? value / 1000 + "k" : value}`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#171717" : "#ffffff",
                      borderColor: "rgba(0,0,0,0.1)",
                      color: isDarkMode ? "#f5f5f5" : "#000000",
                    }}
                    itemStyle={{
                      color: isDarkMode ? "#f5f5f5" : "#000000",
                    }}
                    formatter={(value) =>
                      `₹${(value || 0).toLocaleString("en-IN")}`
                    }
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-dark/80 text-xs">{value}</span>
                    )}
                  />
                  <Bar dataKey="Investments" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Savings" stackId="a" fill="#10b981" />
                  <Bar dataKey="Personal Expenses" stackId="a" fill="#f97316" />
                  <Bar dataKey="Monthly Needs" stackId="a" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Section = ({
  title,
  helper,
  rows,
  onChange,
  onAddRow,
  onRemoveRow,
  setter,
  showPortfolioSelect = false,
  portfolioOptions = [],
  onSelectPortfolio,
}) => {
  const total = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-dark">{title}</h2>
          {helper && (
            <p className="text-[11px] text-dark/70 mt-0.5">{helper}</p>
          )}
        </div>
        <div className="text-xs text-dark/80">
          Total:{" "}
          <span className="font-semibold">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
          >
            <div className="flex-1 min-w-[160px]">
              <input
                type="text"
                value={row.label}
                onChange={(e) =>
                  onChange(setter, index, "label", e.target.value)
                }
                placeholder={
                  showPortfolioSelect ? "Select or type asset / label" : "Label"
                }
                list={
                  showPortfolioSelect
                    ? "allocator-portfolio-options"
                    : undefined
                }
                onBlur={
                  showPortfolioSelect
                    ? (e) => onSelectPortfolio(index, e.target.value)
                    : undefined
                }
                className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-bg text-dark px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-dark/20"
              />
            </div>
            <div className="w-32">
              <input
                type="number"
                value={row.amount}
                onChange={(e) =>
                  onChange(setter, index, "amount", e.target.value)
                }
                onWheel={preventNumberInputScrollChange}
                placeholder="Amount"
                className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-bg text-dark px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-dark/20"
              />
            </div>
            <button
              type="button"
              onClick={() => onRemoveRow(setter, index)}
              className="text-xs text-dark/60 hover:text-red-600 px-2 py-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onAddRow(setter)}
        className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        + Add row
      </button>
      {showPortfolioSelect && portfolioOptions.length > 0 && (
        <datalist id="allocator-portfolio-options">
          {portfolioOptions.map((opt) => (
            <option key={opt.label} value={opt.label} />
          ))}
        </datalist>
      )}
      {/* <div className="mt-8 flex justify-center">
        <div className="w-[80%] border-b border-dark/10"></div>
      </div> */}
    </div>
  );
};

const InvestmentSection = ({
  title,
  helper,
  rows,
  onChange,
  onAddRow,
  onRemoveRow,
  setter,
  options,
  openIndex,
  setOpenIndex,
  onSelectOption,
  onOpenNewInvestment,
}) => {
  const dropdownRefs = useRef({});
  console.log("dropdownRefs", dropdownRefs);
  useEffect(() => {
    function handleClickOutside(event) {
      if (openIndex === null) return;

      const currentRef = dropdownRefs.current[openIndex];

      if (currentRef && !currentRef.contains(event.target)) {
        setOpenIndex(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openIndex, setOpenIndex]);

  const total = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const getFilteredOptions = (input) => {
    const term = (input || "").toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        (o.tag || "").toLowerCase().includes(term),
    );
  };

  return (
    <div className="pt-8">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-dark">{title}</h2>
          {helper && (
            <p className="text-[11px] text-dark/70 mt-0.5">{helper}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenNewInvestment}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            + New investment
          </button>
          <div className="text-xs text-dark/80">
            Total:{" "}
            <span className="font-semibold">
              ₹{total.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => {
          const filtered = getFilteredOptions(row.label);
          return (
            <div
              key={index}
              className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
            >
              <div
                ref={(el) => (dropdownRefs.current[index] = el)}
                className="flex-1 min-w-[200px] relative"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => {
                      onChange(setter, index, "label", e.target.value);
                      setOpenIndex(index);
                    }}
                    onClick={() =>
                      setOpenIndex((prev) => (prev === index ? null : index))
                    }
                    placeholder="Select or type investment"
                    className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-bg text-dark pl-3 pr-10 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-dark/20"
                  />
                  <button
                    type="button"
                    aria-label={openIndex === index ? "Close investment dropdown" : "Open investment dropdown"}
                    onClick={() =>
                      setOpenIndex((prev) => (prev === index ? null : index))
                    }
                    className="absolute inset-y-0 right-0 px-2 flex items-center text-dark/60 hover:text-dark"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                {openIndex === index && filtered.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl bg-[#f7f5f3] dark:bg-[#1d1f1f]">
                    {filtered.map((opt) => (
                      <button
                        key={`${opt.label}-${opt.portfolioCategory}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onSelectOption(index, opt)}
                        className="w-full text-left px-3 py-2 hover:bg-dark/5 text-xs"
                      >
                        <div className="text-dark">{opt.label}</div>
                        {opt.tag && (
                          <div className="text-[11px] text-dark/60">
                            ({opt.tag})
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-32">
                <input
                  type="number"
                  value={row.amount}
                  onChange={(e) =>
                    onChange(setter, index, "amount", e.target.value)
                  }
                  onWheel={preventNumberInputScrollChange}
                  placeholder="Amount"
                  className="w-full border-b border-[#c6c6c6] dark:border-[#303030] bg-bg text-dark px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-dark/20"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemoveRow(setter, index)}
                className="text-xs text-dark/60 font-extrabold hover:text-red-600 px-2 py-1"
              >
               <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onAddRow(setter)}
        className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        + Add row
      </button>
      {/* <div className="mt-8 flex justify-center">
        <div className="w-[80%] border-b border-dark/10"></div>
      </div> */}
    </div>
  );
};

export default Allocator;
