const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, updateProfile, register, loginWithPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/send-otp', sendOtp);
router.post('/login', verifyOtp);
router.post('/register', register);
router.post('/login-password', loginWithPassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
