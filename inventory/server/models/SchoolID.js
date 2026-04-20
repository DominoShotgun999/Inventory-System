const mongoose = require('mongoose');

const schoolIdSchema = new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, required: true, unique: true },
  printed: { type: Boolean, default: false },
  released: { type: Boolean, default: false },
  reprinted: { type: Boolean, default: false },
  datePrinted: { type: Date },
  dateReleased: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SchoolID', schoolIdSchema);