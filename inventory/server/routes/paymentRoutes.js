const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/', paymentController.createPayment);
router.get('/', paymentController.getAllPayments);
router.get('/stats', paymentController.getPaymentStats);
router.get('/pending', paymentController.getPendingPayments);
router.get('/:id', paymentController.getPaymentById);
router.patch('/:id/status', paymentController.updatePaymentStatus);

module.exports = router;
