const mongoose = require('mongoose');

const borrowingSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String },
  borrowDate: { type: Date, default: Date.now },
  expectedReturnDate: { type: Date, required: true },
  actualReturnDate: { type: Date, default: null },
  quantity: { type: Number, required: true },
  status: { type: String, enum: ['borrowed', 'returned', 'overdue', 'damaged'], default: 'borrowed' },
  supervisorApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  purpose: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Borrowing', borrowingSchema);
