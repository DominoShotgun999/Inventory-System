const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');

router.post('/generate', qrController.generateQRCode);
router.post('/scan', qrController.scanQRCode);
router.get('/:id', qrController.getItemQRCode);
router.get('/item/:id', qrController.getItemPublic);

module.exports = router;
