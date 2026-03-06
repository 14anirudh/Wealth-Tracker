import mongoose from 'mongoose';

const allocationItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true },
    // Optional link back to a portfolio holding so we can update it
    portfolioCategory: { type: String }, // e.g. 'equity.directStocks'
    portfolioName: { type: String }, // holding name to match on
  },
  { _id: false }
);

const monthAllocationSchema = new mongoose.Schema(
  {
    month: { type: Number, required: true }, // 1-12
    salary: { type: Number, required: true },
    investments: [allocationItemSchema],
    savings: [allocationItemSchema],
    personalExpenses: [allocationItemSchema],
    monthlyNeeds: [allocationItemSchema],
  },
  { _id: false }
);

const allocationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // email from auth middleware
    year: { type: Number, required: true },
    months: [monthAllocationSchema],
  },
  {
    timestamps: true,
  }
);

allocationSchema.index({ userId: 1, year: 1 }, { unique: true });

const Allocation = mongoose.model('Allocation', allocationSchema);

export default Allocation;

