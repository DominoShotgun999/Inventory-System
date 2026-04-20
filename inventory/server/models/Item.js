const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: {
    main: { type: String, required: true }, // e.g., "Electronics", "Tools", "Furniture"
    type: { type: String, required: true }, // e.g., "Computer", "Laptop", "Monitor"
    brandModel: { type: String } // e.g., "Dell XPS 13", "HP LaserJet Pro"
  },
  quantity: { type: Number, default: 0 },
  totalQuantity: { type: Number, required: true },
  condition: { type: String, enum: ['good', 'fair', 'poor'], default: 'good' },
  serialNumber: { type: String, unique: true, sparse: true },
  qrCode: { type: String }, // Base64 encoded QR code
  purchaseDate: { type: Date },
  purchasePrice: { type: Number },
  location: { type: String }, // Office location/shelf
  image: { type: String }, // Base64 encoded image
  status: { type: String, enum: ['available', 'borrowed', 'maintenance', 'damaged'], default: 'available' },
  requiresSupervisorApproval: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);
