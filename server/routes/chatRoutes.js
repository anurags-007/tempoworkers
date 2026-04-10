const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMessages, sendMessage } = require('../controllers/chatController');

// ─── GET /:applicationId — Get messages for an application ─
router.get('/:applicationId', protect, getMessages);

// ─── POST /:applicationId — Send a message in an application ─
router.post('/:applicationId', protect, sendMessage);

module.exports = router;
