const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/inventory/pdf', reportController.generateInventoryPDF);
router.get('/inventory/excel', reportController.generateInventoryExcel);
router.get('/borrowing/pdf', reportController.generateBorrowingPDF);
router.get('/borrowing/excel', reportController.generateBorrowingExcel);
router.get('/payment/excel', reportController.generatePaymentExcel);

module.exports = router;
