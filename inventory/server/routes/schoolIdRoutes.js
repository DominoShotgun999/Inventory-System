const express = require('express');
const router = express.Router();
const schoolIdController = require('../controllers/schoolIdController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware.verifyToken, authMiddleware.checkPersonnel, schoolIdController.getAllSchoolIDs);
router.get('/:id', authMiddleware.verifyToken, authMiddleware.checkPersonnel, schoolIdController.getSchoolIDById);
router.post('/', authMiddleware.verifyToken, authMiddleware.checkPersonnel, schoolIdController.createSchoolID);
router.put('/:id', authMiddleware.verifyToken, authMiddleware.checkPersonnel, schoolIdController.updateSchoolID);
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.checkPersonnel, schoolIdController.deleteSchoolID);
router.patch('/:id/print', authMiddleware.verifyToken, authMiddleware.checkPersonnel, schoolIdController.updatePrintStatus);
router.patch('/:id/release', authMiddleware.verifyToken, authMiddleware.checkPersonnel, schoolIdController.updateReleaseStatus);
router.patch('/:id/reprint', authMiddleware.verifyToken, authMiddleware.checkPersonnel, schoolIdController.updateReprintStatus);

module.exports = router;