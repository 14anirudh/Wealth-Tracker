import mongoose from 'mongoose';

const monthlyReturnSchema = new mongoose.Schema({
  userId: { type: String, default: 'default' },
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1-12
  
  // Returns by category
  returns: {
    stocks: { type: Number, default: 0 },
    mutualFunds: { type: Number, default: 0 },
    commodities: { type: Number, default: 0 },
    bonds: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // Portfolio values
  invested: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 },
  totalReturns: { type: Number, default: 0 },
  returnsPercentage: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Ensure unique month/year combination per user
monthlyReturnSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

const MonthlyReturn = mongoose.model('MonthlyReturn', monthlyReturnSchema);

export default MonthlyReturn;


