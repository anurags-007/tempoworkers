const express = require('express');
const router = express.Router();
const {
    createJob, getJobs, getMyJobs,
    applyForJob, getJobApplicants,
    toggleJobStatus, toggleBookmark, getBookmarkedJobs
} = require('../controllers/jobController');
const { protect, optionalProtect, requireRole } = require('../middleware/auth');

router.post('/', protect, requireRole('employer'), createJob);
router.get('/', optionalProtect, getJobs);                                        // Public — optionally enriched if JWT provided
router.get('/bookmarked', protect, requireRole('worker'), getBookmarkedJobs);      // Worker's saved jobs

router.get('/employer/:employerId', protect, requireRole('employer'), getMyJobs); // Employer: own jobs only
router.post('/apply', protect, requireRole('worker'), applyForJob);
router.get('/:jobId/applicants', protect, requireRole('employer'), getJobApplicants);
router.patch('/:jobId/status', protect, requireRole('employer'), toggleJobStatus); // Employer: open/close
router.post('/:jobId/bookmark', protect, requireRole('worker'), toggleBookmark);   // Worker: save/unsave

module.exports = router;

