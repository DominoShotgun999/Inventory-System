const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'supervisor', 'personnel', 'employee'], default: 'employee' },
  department: { type: String },
  employeeId: { type: String, unique: true, sparse: true },
  name: { type: String },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for authentication & lookup performance
userSchema.index({ username: 1 }); // Fast login lookup
userSchema.index({ email: 1 }); // Email lookups
userSchema.index({ role: 1 }); // Filter by role
userSchema.index({ department: 1 }); // Filter by department
userSchema.index({ isActive: 1 }); // Find active users

module.exports = mongoose.model('User', userSchema);
