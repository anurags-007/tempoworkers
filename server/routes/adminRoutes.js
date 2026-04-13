const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { isAdmin } = adminController;

// All routes here require being logged in AND being an admin
router.use(protect);
router.use(isAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/jobs', adminController.getAllJobs);
router.delete('/jobs/:jobId', adminController.deleteJob);

module.exports = router;
