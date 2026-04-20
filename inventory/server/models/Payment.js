const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  borrowingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Borrowing', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  employeeName: { type: String, required: true },
  damageType: { type: String, enum: ['broken', 'lost', 'damaged', 'other'], required: true },
  repairCost: { type: Number, required: true },
  description: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'check', 'transfer', 'other'], default: null },
  paidDate: { type: Date, default: null },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
