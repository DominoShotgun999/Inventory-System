const QRCode = require('qrcode');
const Item = require('../models/Item');

// Generate QR code for item
exports.generateQRCode = async (req, res) => {
  try {
    const { itemId, serialNumber } = req.body;

    const qrData = {
      itemId,
      serialNumber,
      timestamp: new Date().toISOString()
    };

    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
    res.json({ qrCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Scan QR code
exports.scanQRCode = async (req, res) => {
  try {
    const { qrData } = req.body;

    // Parse QR data
    let data;
    try {
      data = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    // Find item by ID or serial number
    const item = data.itemId 
      ? await Item.findById(data.itemId)
      : await Item.findOne({ serialNumber: data.serialNumber });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      item,
      scannedAt: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get QR code for item
exports.getItemQRCode = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    res.json({
      itemId: item._id,
      name: item.name,
      serialNumber: item.serialNumber,
      qrCode: item.qrCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Public: Get full item details (used by borrow UI without auth)
exports.getItemPublic = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Return full item document (avoid sending any sensitive admin-only fields)
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
