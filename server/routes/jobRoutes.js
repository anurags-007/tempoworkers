const express = require('express');
const router = express.Router();
const {
    createJob, getJobs, getMyJobs,
    applyForJob, getJobApplicants,
    toggleJobStatus, toggleBookmark, getBookmarkedJobs
} = require('../controllers/jobController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createJob);
router.get('/', getJobs);                                        // Public — optionally enriched if JWT provided
router.get('/bookmarked', protect, getBookmarkedJobs);           // Worker's saved jobs
router.get('/employer/:employerId', protect, getMyJobs);   // Employer: own jobs only
router.post('/apply', protect, applyForJob);
router.get('/:jobId/applicants', protect, getJobApplicants);
router.patch('/:jobId/status', protect, toggleJobStatus);        // Employer: open/close
router.post('/:jobId/bookmark', protect, toggleBookmark);        // Worker: save/unsave

module.exports = router;

