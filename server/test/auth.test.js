const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../server');
const { setupTestDB, teardownTestDB, clearCollections } = require('./testHelper');
const { User } = require('../models/User');
const Otp = require('../models/Otp');

describe('Authentication & Authorization Tests', () => {
    before(async () => {
        await setupTestDB();
    });

    after(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearCollections();
    });

    describe('Registration Endpoint Security', () => {
        it('prevents privilege escalation: cannot self-register as admin', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'hacker@example.com',
                    password: 'Password123!',
                    role: 'admin',
                });

            assert.strictEqual(res.status, 400);
            assert.match(res.body.message, /invalid role/i);

            const userInDb = await User.findOne({ email: 'hacker@example.com' });
            assert.strictEqual(userInDb, null);
        });

        it('rejects weak passwords', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'worker@example.com',
                    password: 'short',
                    role: 'worker',
                });

            assert.strictEqual(res.status, 400);
            assert.match(res.body.message, /password must be at least 8 characters/i);
        });

        it('successfully registers an employer and does not leak password hash in response', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'employer@example.com',
                    password: 'SecurePassword1!',
                    role: 'employer',
                    companyName: 'Acme Builders',
                });

            assert.strictEqual(res.status, 201);
            assert.ok(res.body.token);
            assert.strictEqual(res.body.user.email, 'employer@example.com');
            assert.strictEqual(res.body.user.role, 'employer');
            assert.strictEqual(res.body.user.password, undefined);
        });

        it('rejects duplicate registration with existing email', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'dup@example.com',
                    password: 'SecurePassword1!',
                    role: 'worker',
                });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'dup@example.com',
                    password: 'AnotherPassword1!',
                    role: 'worker',
                });

            assert.strictEqual(res.status, 400);
            assert.match(res.body.message, /already exists/i);
        });
    });

    describe('Password Login Endpoint Security', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'loginuser@example.com',
                    password: 'SecurePassword1!',
                    role: 'employer',
                });
        });

        it('logs in successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login-password')
                .send({
                    email: 'loginuser@example.com',
                    password: 'SecurePassword1!',
                });

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.token);
            assert.strictEqual(res.body.user.email, 'loginuser@example.com');
            assert.strictEqual(res.body.user.password, undefined);
        });

        it('rejects incorrect password without revealing user existence (prevents enumeration)', async () => {
            const res = await request(app)
                .post('/api/auth/login-password')
                .send({
                    email: 'loginuser@example.com',
                    password: 'WrongPassword999!',
                });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.message, 'Invalid credentials.');
        });

        it('rejects nonexistent user with identical error message (prevents enumeration)', async () => {
            const res = await request(app)
                .post('/api/auth/login-password')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'SomePassword123!',
                });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.message, 'Invalid credentials.');
        });
    });

    describe('OTP Verification Security', () => {
        it('prevents privilege escalation: cannot create admin user via OTP verification', async () => {
            await Otp.create({ identifier: 'testotp@example.com', otp: '1234' });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'testotp@example.com',
                    otp: '1234',
                    role: 'admin',
                });

            assert.strictEqual(res.status, 400);
            assert.match(res.body.message, /valid role/i);

            const userInDb = await User.findOne({ email: 'testotp@example.com' });
            assert.strictEqual(userInDb, null);
        });

        it('enforces 4-digit OTP format', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'worker@example.com',
                    otp: '12345',
                    role: 'worker',
                });

            assert.strictEqual(res.status, 400);
            assert.match(res.body.message, /must be exactly 4 digits/i);
        });

        it('rate limits OTP requests per identifier with cooldown', async () => {
            const res1 = await request(app)
                .post('/api/auth/send-otp')
                .send({ identifier: '9876543210' });

            assert.strictEqual(res1.status, 200);

            // Immediate second request within 60s should receive 429
            const res2 = await request(app)
                .post('/api/auth/send-otp')
                .send({ identifier: '9876543210' });

            assert.strictEqual(res2.status, 429);
            assert.match(res2.body.message, /wait/i);
        });
    });
});
