const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../server');
const { setupTestDB, teardownTestDB, clearCollections, createTestToken } = require('./testHelper');
const { Employer, Worker, User } = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

describe('Jobs, Roles & Access Control Tests', () => {
    let employerUser, workerUser, otherWorkerUser;
    let employerToken, workerToken, otherWorkerToken;

    before(async () => {
        await setupTestDB();
    });

    after(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearCollections();

        employerUser = await Employer.create({
            email: 'employer@test.com',
            mobile: '9999900001',
            role: 'employer',
            name: 'Acme Builders',
            companyName: 'Acme Ltd'
        });
        employerToken = createTestToken(employerUser);

        workerUser = await Worker.create({
            email: 'worker@test.com',
            mobile: '8888800001',
            role: 'worker',
            name: 'John Carpenter'
        });
        workerToken = createTestToken(workerUser);

        otherWorkerUser = await Worker.create({
            email: 'otherworker@test.com',
            mobile: '8888800002',
            role: 'worker',
            name: 'Jane Mason'
        });
        otherWorkerToken = createTestToken(otherWorkerUser);
    });

    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
        const res = await request(app).post('/api/jobs').send({});
        assert.strictEqual(res.status, 401);
        assert.match(res.body.message, /not authorized/i);
    });

    it('enforces RBAC: worker cannot post jobs (403 Forbidden)', async () => {
        const res = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${workerToken}`)
            .send({
                title: 'Malicious Job Attempt',
                category: 'Mason',
                wage: 500,
                duration: '1 day',
                location: { coordinates: [77.2, 28.6] }
            });

        assert.strictEqual(res.status, 403);
        assert.match(res.body.message, /access denied/i);
    });

    it('allows employer to post jobs with valid parameters', async () => {
        const res = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${employerToken}`)
            .send({
                title: 'Need Carpenter for Framing',
                category: 'Carpenter',
                wage: 750,
                duration: '3 days',
                location: {
                    coordinates: [77.2090, 28.6139],
                    address: 'Connaught Place, New Delhi'
                }
            });

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.title, 'Need Carpenter for Framing');
        assert.strictEqual(res.body.wage, 750);
        assert.strictEqual(res.body.status, 'open');
    });

    it('rejects job creation with invalid coordinates or negative wage', async () => {
        const res1 = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${employerToken}`)
            .send({
                title: 'Bad Job',
                category: 'Mason',
                wage: -50,
                duration: '1 day',
                location: { coordinates: [77.2, 28.6] }
            });

        assert.strictEqual(res1.status, 400);

        const res2 = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${employerToken}`)
            .send({
                title: 'Bad Job Coordinates',
                category: 'Mason',
                wage: 500,
                duration: '1 day',
                location: { coordinates: [250, 95] } // out of bounds
            });

        assert.strictEqual(res2.status, 400);
        assert.match(res2.body.message, /coordinates/i);
    });

    it('does not expose employer personal mobile number or email in public job listings', async () => {
        await Job.create({
            title: 'Public Painting Job',
            category: 'Painter',
            wage: 600,
            duration: '2 days',
            employer: employerUser._id,
            location: { type: 'Point', coordinates: [77.2, 28.6] }
        });

        const res = await request(app).get('/api/jobs');
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.length > 0);

        const job = res.body[0];
        assert.ok(job.employer);
        assert.strictEqual(job.employer.name, 'Acme Builders');
        // Critical PII check: mobile and email MUST NOT be populated for public viewers
        assert.strictEqual(job.employer.mobile, undefined);
        assert.strictEqual(job.employer.email, undefined);
    });

    it('enforces RBAC: employer cannot apply to jobs (403 Forbidden)', async () => {
        const job = await Job.create({
            title: 'Sample Job',
            category: 'Electrician',
            wage: 800,
            duration: '1 day',
            employer: employerUser._id,
            location: { type: 'Point', coordinates: [77.2, 28.6] }
        });

        const res = await request(app)
            .post('/api/jobs/apply')
            .set('Authorization', `Bearer ${employerToken}`)
            .send({ jobId: job._id });

        assert.strictEqual(res.status, 403);
    });

    it('allows worker to apply for an open job, prevents duplicate application', async () => {
        const job = await Job.create({
            title: 'Open Plumbing Role',
            category: 'Plumber',
            wage: 700,
            duration: '1 day',
            employer: employerUser._id,
            location: { type: 'Point', coordinates: [77.2, 28.6] }
        });

        const res1 = await request(app)
            .post('/api/jobs/apply')
            .set('Authorization', `Bearer ${workerToken}`)
            .send({ jobId: job._id });

        assert.strictEqual(res1.status, 201);
        assert.strictEqual(res1.body.status, 'pending');

        // Second application should fail with 400 duplicate
        const res2 = await request(app)
            .post('/api/jobs/apply')
            .set('Authorization', `Bearer ${workerToken}`)
            .send({ jobId: job._id });

        assert.strictEqual(res2.status, 400);
        assert.match(res2.body.message, /already applied/i);
    });

    it('prevents worker from applying to a closed job', async () => {
        const closedJob = await Job.create({
            title: 'Closed Masonry Role',
            category: 'Mason',
            wage: 650,
            duration: '2 days',
            employer: employerUser._id,
            status: 'closed',
            location: { type: 'Point', coordinates: [77.2, 28.6] }
        });

        const res = await request(app)
            .post('/api/jobs/apply')
            .set('Authorization', `Bearer ${workerToken}`)
            .send({ jobId: closedJob._id });

        assert.strictEqual(res.status, 400);
        assert.match(res.body.message, /no longer accepting/i);
    });

    it('prevents IDOR: worker cannot view another worker applications', async () => {
        const res = await request(app)
            .get(`/api/applications/worker/${otherWorkerUser._id}`)
            .set('Authorization', `Bearer ${workerToken}`);

        assert.strictEqual(res.status, 403);
        assert.match(res.body.message, /not authorized/i);
    });
});
