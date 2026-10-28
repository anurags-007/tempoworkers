const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const crypto = require('crypto');
const { app } = require('../server');
const { setupTestDB, teardownTestDB, clearCollections, createTestToken } = require('./testHelper');
const { Employer, Worker } = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Payment = require('../models/Payment');

describe('Payment & Escrow Security Tests', () => {
    let employerUser, workerUser;
    let employerToken, workerToken;
    let job, application;

    before(async () => {
        await setupTestDB();
    });

    after(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearCollections();

        employerUser = await Employer.create({
            email: 'employer@paytest.com',
            role: 'employer',
            name: 'Escrow Employer Ltd'
        });
        employerToken = createTestToken(employerUser);

        workerUser = await Worker.create({
            email: 'worker@paytest.com',
            role: 'worker',
            name: 'Reliable Worker',
            razorpayAccountId: 'acc_test_12345'
        });
        workerToken = createTestToken(workerUser);

        job = await Job.create({
            title: 'Tile Installation',
            category: 'Mason',
            wage: 1500,
            duration: '3 days',
            employer: employerUser._id,
            location: { type: 'Point', coordinates: [77.2, 28.6] }
        });

        application = await Application.create({
            job: job._id,
            worker: workerUser._id,
            status: 'pending'
        });
    });

    it('enforces RBAC: workers cannot initiate or verify payments (403)', async () => {
        const res1 = await request(app)
            .post('/api/payment/create-order')
            .set('Authorization', `Bearer ${workerToken}`)
            .send({ applicationId: application._id });
        assert.strictEqual(res1.status, 403);

        const res2 = await request(app)
            .post('/api/payment/verify')
            .set('Authorization', `Bearer ${workerToken}`)
            .send({});
        assert.strictEqual(res2.status, 403);

        const res3 = await request(app)
            .post(`/api/payment/release/${application._id}`)
            .set('Authorization', `Bearer ${workerToken}`);
        assert.strictEqual(res3.status, 403);
    });

    it('rejects verify payment when required parameters are missing', async () => {
        const res = await request(app)
            .post('/api/payment/verify')
            .set('Authorization', `Bearer ${employerToken}`)
            .send({ razorpay_order_id: 'order_123' });

        assert.strictEqual(res.status, 400);
        assert.match(res.body.message, /missing/i);
    });

    it('rejects forged payment signatures (constant-time verification)', async () => {
        const payment = await Payment.create({
            application: application._id,
            employer: employerUser._id,
            worker: workerUser._id,
            amount: 1500,
            razorpay_order_id: 'order_forged_999',
            status: 'created'
        });

        const res = await request(app)
            .post('/api/payment/verify')
            .set('Authorization', `Bearer ${employerToken}`)
            .send({
                razorpay_order_id: 'order_forged_999',
                razorpay_payment_id: 'pay_999',
                razorpay_signature: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', // fake
                applicationId: application._id
            });

        assert.strictEqual(res.status, 400);
        assert.match(res.body.message, /invalid payment signature/i);

        const updatedPayment = await Payment.findById(payment._id);
        assert.strictEqual(updatedPayment.status, 'failed');
    });

    it('verifies genuine cryptographic signature and places funds in escrow', async () => {
        const orderId = 'order_genuine_123';
        const paymentId = 'pay_genuine_456';

        const payment = await Payment.create({
            application: application._id,
            employer: employerUser._id,
            worker: workerUser._id,
            amount: 1500,
            razorpay_order_id: orderId,
            status: 'created'
        });

        // Compute valid HMAC signature using test secret
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        const res = await request(app)
            .post('/api/payment/verify')
            .set('Authorization', `Bearer ${employerToken}`)
            .send({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: expectedSignature,
                applicationId: application._id
            });

        assert.strictEqual(res.status, 200);
        assert.match(res.body.message, /funds are in escrow/i);

        const verifiedPayment = await Payment.findById(payment._id);
        assert.strictEqual(verifiedPayment.status, 'escrow');

        const acceptedApplication = await Application.findById(application._id);
        assert.strictEqual(acceptedApplication.status, 'accepted');
        assert.strictEqual(acceptedApplication.paymentStatus, 'escrow');
    });

    it('prevents premature escrow release if application is not marked completed', async () => {
        await Payment.create({
            application: application._id,
            employer: employerUser._id,
            worker: workerUser._id,
            amount: 1500,
            razorpay_order_id: 'order_premature',
            status: 'escrow'
        });
        application.paymentStatus = 'escrow';
        application.status = 'accepted'; // Not 'completed' yet!
        await application.save();

        const res = await request(app)
            .post(`/api/payment/release/${application._id}`)
            .set('Authorization', `Bearer ${employerToken}`);

        assert.strictEqual(res.status, 400);
        assert.match(res.body.message, /completed/i);
    });
});
