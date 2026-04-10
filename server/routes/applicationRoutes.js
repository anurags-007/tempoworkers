const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getJobApplicants,
    getWorkerApplications,
    getWorkerHistory,
    getEmployerHistory,
    updateApplicationStatus,
    completeApplication,
    rateWorker
} = require('../controllers/applicationController');

// ─── GET /job/:jobId — Employer: view applicants for their job ─
router.get('/job/:jobId', protect, getJobApplicants);

// ─── GET /worker/:workerId — Worker: view their own applications ─
router.get('/worker/:workerId', protect, getWorkerApplications);

// ─── GET /worker/:workerId/history — Worker: completed job history ─
router.get('/worker/:workerId/history', protect, getWorkerHistory);

// ─── GET /employer/:employerId/history — Employer: completed job history ─
router.get('/employer/:employerId/history', protect, getEmployerHistory);

// ─── PATCH /:id/status — Employer: accept/reject an application ─
router.patch('/:id/status', protect, updateApplicationStatus);

// ─── PATCH /:id/complete — Employer: mark job as complete ─
router.patch('/:id/complete', protect, completeApplication);

// ─── POST /:id/rate — Employer: rate a worker after job completion ─
router.post('/:id/rate', protect, rateWorker);

module.exports = router;


module.exports = router;
