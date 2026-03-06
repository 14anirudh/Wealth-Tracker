import mongoose from 'mongoose';

const holdingSchema = new mongoose.Schema({
  name: { type: String, required: true }, 
  invested: { type: Number, required: true },
  current: { type: Number, required: true },
  gain: { type: Number, default: 0 },
  gainPercentage: { type: Number, default: 0 },
  type: { type: String }, // For mutual funds type (midcap, smallcap, etc.)
  subType: { type: String } // Additional classification
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true }, // Stocks, Mutual Funds, Cash, etc.
  holdings: [holdingSchema],
  totalAmount: { type: Number, default: 0 }
});

// Custom category subcategory: either a list of holdings or a single amount
const customSubcategorySchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['holdings', 'amount'], default: 'holdings' },
  holdings: [holdingSchema],
  amount: {
    invested: { type: Number, default: 0 },
    current: { type: Number, default: 0 }
  }
}, { _id: false });

const customCategorySchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  subcategories: [customSubcategorySchema]
}, { _id: false });

const portfolioSchema = new mongoose.Schema({
  userId: { type: String, default: 'default' },
  date: { type: Date, default: Date.now },
  
  // User-defined custom categories and subcategories
  customCategories: [customCategorySchema],
  
  // Equity
  equity: {
    directStocks: [holdingSchema], // Stock name
    mutualFunds: [holdingSchema], // Type: midcap, smallcap, flexicap, etc.
    total: { type: Number, default: 0 }
  },
  
  // Non-Equity
  nonEquity: {
    cash: {
      invested: { type: Number, default: 0 },
      current: { type: Number, default: 0 }
    },
    commodities: {
      gold: {
        invested: { type: Number, default: 0 },
        current: { type: Number, default: 0 }
      },
      silver: {
        invested: { type: Number, default: 0 },
        current: { type: Number, default: 0 }
      }
    },
    fixedIncomeAssets: [holdingSchema],
    total: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 }
  },
  
  // Emergency Fund
  emergency: {
    invested: {
      investedAmount: { type: Number, default: 0 },
      currentAmount: { type: Number, default: 0 }
    },
    bankAccount: {
      investedAmount: { type: Number, default: 0 },
      currentAmount: { type: Number, default: 0 }
    },
    total: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 }
  },
  
  // Totals
  grandTotal: { type: Number, default: 0 },
  
  // Returns calculation
  invested: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Calculate totals and gains before saving
portfolioSchema.pre('save', function(next) {
  // Calculate gains for each holding
  this.equity.directStocks.forEach(stock => {
    stock.gain = stock.current - stock.invested;
    stock.gainPercentage = stock.invested > 0 ? ((stock.gain / stock.invested) * 100) : 0;
  });
  
  this.equity.mutualFunds.forEach(mf => {
    mf.gain = mf.current - mf.invested;
    mf.gainPercentage = mf.invested > 0 ? ((mf.gain / mf.invested) * 100) : 0;
  });
  
  this.nonEquity.fixedIncomeAssets.forEach(asset => {
    asset.gain = asset.current - asset.invested;
    asset.gainPercentage = asset.invested > 0 ? ((asset.gain / asset.invested) * 100) : 0;
  });
  
  // Calculate equity total (current values)
  const stocksTotal = this.equity.directStocks.reduce((sum, s) => sum + s.current, 0);
  const mfTotal = this.equity.mutualFunds.reduce((sum, mf) => sum + mf.current, 0);
  this.equity.total = stocksTotal + mfTotal;
  
  // Calculate non-equity total (current values)
  const fixedIncomeTotal = this.nonEquity.fixedIncomeAssets.reduce((sum, f) => sum + f.current, 0);
  const cashTotal = this.nonEquity.cash.current || 0;
  const goldTotal = this.nonEquity.commodities.gold.current || 0;
  const silverTotal = this.nonEquity.commodities.silver.current || 0;
  this.nonEquity.total = cashTotal + goldTotal + silverTotal + fixedIncomeTotal;
  
  // Calculate non-equity invested
  const fixedIncomeInvested = this.nonEquity.fixedIncomeAssets.reduce((sum, f) => sum + f.invested, 0);
  const cashInvested = this.nonEquity.cash.invested || 0;
  const goldInvested = this.nonEquity.commodities.gold.invested || 0;
  const silverInvested = this.nonEquity.commodities.silver.invested || 0;
  this.nonEquity.totalInvested = cashInvested + goldInvested + silverInvested + fixedIncomeInvested;
  
  // Calculate emergency total (current values)
  const emergencyInvestedCurrent = this.emergency.invested.currentAmount || 0;
  const emergencyBankCurrent = this.emergency.bankAccount.currentAmount || 0;
  this.emergency.total = emergencyInvestedCurrent + emergencyBankCurrent;
  
  // Calculate emergency invested
  const emergencyInvestedAmount = this.emergency.invested.investedAmount || 0;
  const emergencyBankAmount = this.emergency.bankAccount.investedAmount || 0;
  this.emergency.totalInvested = emergencyInvestedAmount + emergencyBankAmount;
  
  // Calculate custom categories totals
  let customTotal = 0;
  let customInvested = 0;
  if (this.customCategories && Array.isArray(this.customCategories)) {
    this.customCategories.forEach((cat) => {
      (cat.subcategories || []).forEach((sub) => {
        if (sub.type === 'amount' && sub.amount) {
          customTotal += sub.amount.current || 0;
          customInvested += sub.amount.invested || 0;
        } else if (sub.type === 'holdings' && sub.holdings && sub.holdings.length) {
          sub.holdings.forEach((h) => {
            h.gain = (h.current || 0) - (h.invested || 0);
            h.gainPercentage = (h.invested && h.invested > 0) ? ((h.gain / h.invested) * 100) : 0;
            customTotal += h.current || 0;
            customInvested += h.invested || 0;
          });
        }
      });
    });
  }

  // Calculate grand total (current value)
  this.grandTotal = this.equity.total + this.nonEquity.total + this.emergency.total + customTotal;
  
  // Calculate total invested
  const stocksInvested = this.equity.directStocks.reduce((sum, s) => sum + s.invested, 0);
  const mfInvested = this.equity.mutualFunds.reduce((sum, mf) => sum + mf.invested, 0);
  this.invested = stocksInvested + mfInvested + this.nonEquity.totalInvested + this.emergency.totalInvested + customInvested;
  
  // Set current value
  this.currentValue = this.grandTotal;
  
  next();
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

export default Portfolio;


