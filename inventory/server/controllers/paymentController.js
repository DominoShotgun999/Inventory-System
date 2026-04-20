const Payment = require('../models/Payment');
const Borrowing = require('../models/Borrowing');
const Item = require('../models/Item');
const Notification = require('../models/Notification');

// Create payment for damaged item
exports.createPayment = async (req, res) => {
  try {
    const { borrowingId, itemId, employeeName, damageType, repairCost, description, notes } = req.body;

    const payment = new Payment({
      borrowingId,
      itemId,
      employeeName,
      damageType,
      repairCost,
      description,
      notes
    });

    await payment.save();

    // Create notification
    const notification = new Notification({
      type: 'payment-pending',
      title: 'New payment pending',
      message: `Payment of $${repairCost} is pending for item damage`,
      relatedId: payment._id,
      priority: 'high'
    });
    await notification.save();

    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('borrowingId')
      .populate('itemId')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('borrowingId')
      .populate('itemId');
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status, paymentMethod, paidDate } = req.body;

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status, paymentMethod, paidDate: status === 'paid' ? paidDate || new Date() : null },
      { new: true }
    );

    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Emit notification update
    req.app.locals.io.emit('payment-updated', payment);

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get pending payments
exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'pending' })
      .populate('borrowingId')
      .populate('itemId');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get payment statistics
exports.getPaymentStats = async (req, res) => {
  try {
    const totalAmount = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$repairCost' } } }
    ]);

    const byStatus = await Payment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$repairCost' } } }
    ]);

    res.json({
      totalAmount: totalAmount[0]?.total || 0,
      byStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
