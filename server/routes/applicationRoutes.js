const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
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
router.get('/job/:jobId', protect, requireRole('employer'), getJobApplicants);

// ─── GET /worker/:workerId — Worker: view their own applications ─
router.get('/worker/:workerId', protect, requireRole('worker'), getWorkerApplications);

// ─── GET /worker/:workerId/history — Worker: completed job history ─
router.get('/worker/:workerId/history', protect, requireRole('worker'), getWorkerHistory);

// ─── GET /employer/:employerId/history — Employer: completed job history ─
router.get('/employer/:employerId/history', protect, requireRole('employer'), getEmployerHistory);

// ─── PATCH /:id/status — Employer: accept/reject an application ─
router.patch('/:id/status', protect, requireRole('employer'), updateApplicationStatus);

// ─── PATCH /:id/complete — Employer: mark job as complete ─
router.patch('/:id/complete', protect, requireRole('employer'), completeApplication);

// ─── POST /:id/rate — Employer: rate a worker after job completion ─
router.post('/:id/rate', protect, requireRole('employer'), rateWorker);

module.exports = router;
