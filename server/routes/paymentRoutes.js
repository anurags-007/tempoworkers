const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

router.post('/create-order', protect, requireRole('employer'), paymentController.createOrder);
router.post('/verify', protect, requireRole('employer'), paymentController.verifyPayment);
router.post('/release/:applicationId', protect, requireRole('employer'), paymentController.releaseEscrow);

module.exports = router;
