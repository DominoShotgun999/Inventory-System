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

// Indexes for performance optimization
borrowingSchema.index({ itemId: 1 }); // Lookup by item
borrowingSchema.index({ employeeId: 1 }); // Search by employee
borrowingSchema.index({ employeeName: 1 }); // Search/filter by name
borrowingSchema.index({ status: 1 }); // Filter by status (borrowed, returned, etc.)
borrowingSchema.index({ borrowDate: -1 }); // Sort by borrow date
borrowingSchema.index({ expectedReturnDate: 1 }); // Find overdue items
borrowingSchema.index({ itemId: 1, status: 1 }); // Compound index for item availability

module.exports = mongoose.model('Borrowing', borrowingSchema);
