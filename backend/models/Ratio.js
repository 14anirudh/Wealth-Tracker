import mongoose from 'mongoose';

const partSchema = new mongoose.Schema({
  category: { type: String, required: true }, // 'equity' | 'nonEquity' | 'emergency' | 'total'
  subcategory: { type: String, default: null }, // null when category is 'total'
}, { _id: false });

const ratioItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  part1: { type: partSchema, required: true },
  part2: { type: partSchema, required: true },
  alert: {
    enabled: { type: Boolean, default: false },
    email: { type: String, default: '' },
    targetPart: { type: String, enum: ['part1', 'part2'], default: 'part1' },
    condition: { type: String, enum: ['above', 'below'], default: 'above' },
    thresholdPercent: { type: Number, default: 50, min: 0, max: 100 },
    lastSentAt: { type: Date, default: null },
  },
}, { _id: true });

const ratioSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // user email
  ratios: [ratioItemSchema],
}, { timestamps: true });

const Ratio = mongoose.model('Ratio', ratioSchema);

export default Ratio;
