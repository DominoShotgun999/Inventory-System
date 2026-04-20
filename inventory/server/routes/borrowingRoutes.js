const express = require('express');
const router = express.Router();
const borrowingController = require('../controllers/borrowingController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', borrowingController.borrowItem);
router.put('/:id/return', borrowingController.returnItem);
router.get('/', borrowingController.getAllBorrowings);
router.get('/stats', borrowingController.getBorrowingStats);
router.get('/maintenance/:type', borrowingController.performMaintenance);
router.get('/active', borrowingController.getActiveBorrowings);
router.get('/overdue', borrowingController.getOverdueItems);
router.get('/:id', borrowingController.getBorrowingById);
router.patch('/:id', borrowingController.updateBorrowing);
router.patch('/:id/notes', borrowingController.updateBorrowingNotes);
router.patch('/:id/approve', authMiddleware.verifyToken, authMiddleware.checkPersonnel, borrowingController.approveBorrowing);
router.get('/:id/download-docx', borrowingController.downloadBorrowingDocx);

module.exports = router;
