const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../server');
const { setupTestDB, teardownTestDB } = require('./testHelper');

describe('Security Headers, CORS & Injection Defenses', () => {
    before(async () => {
        await setupTestDB();
    });

    after(async () => {
        await teardownTestDB();
    });

    it('sets OWASP-recommended security headers on HTTP responses', async () => {
        const res = await request(app).get('/');

        assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
        assert.strictEqual(res.headers['x-frame-options'], 'DENY');
        assert.strictEqual(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
        assert.strictEqual(res.headers['permissions-policy'], 'geolocation=(), camera=(), microphone=()');
    });

    it('blocks unauthorized cross-origin requests via CORS whitelist', async () => {
        const res = await request(app)
            .get('/')
            .set('Origin', 'https://malicious-attacker-domain.com');

        assert.strictEqual(res.status, 403);
        assert.match(res.body.message, /CORS/i);
    });

    it('permits authorized frontend origins via CORS', async () => {
        const res = await request(app)
            .get('/')
            .set('Origin', 'http://localhost:5173');

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:5173');
        assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
    });

    it('rejects oversized JSON payloads exceeding 10kb (DoS mitigation)', async () => {
        const oversizedData = 'A'.repeat(12 * 1024); // 12kb string
        const res = await request(app)
            .post('/api/auth/register')
            .send({ data: oversizedData });

        assert.strictEqual(res.status, 413);
    });

    it('returns structured JSON for 404 routes instead of default server HTML', async () => {
        const res = await request(app).get('/api/non-existent-route-999');

        assert.strictEqual(res.status, 404);
        assert.strictEqual(typeof res.body, 'object');
        assert.match(res.body.message, /not found/i);
    });
});
