const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/logout', authMiddleware.verifyToken, authController.logout);
router.get('/verify', authMiddleware.verifyToken, authController.verifyToken);
router.get('/me', authMiddleware.verifyToken, authController.getProfile);
router.put('/me', authMiddleware.verifyToken, authController.updateProfile);
router.post('/create-admin', authController.createAdmin);
router.patch('/users/email', authMiddleware.verifyToken, authMiddleware.checkAdmin, authController.updateUserEmail);
module.exports = router;
