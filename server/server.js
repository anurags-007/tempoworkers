const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const { protect } = require('./middleware/auth');

dotenv.config();
connectDB();

const app = express();
app.set('trust proxy', 1); // Essential for rate limiting behind a reverse proxy (Vercel, Nginx)
const httpServer = http.createServer(app);

// ─── Socket.io ─────────────────────────────────────────────
const io = new Server(httpServer, {
    cors: {
        origin: (origin, cb) => cb(null, true),
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        if (userId) socket.join(`user_${userId}`);
    });
    socket.on('disconnect', () => { });
});

app.set('io', io);
// ─────────────────────────────────────────────────────────────

// ─── Security Headers ────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});
// ─────────────────────────────────────────────────────────────

app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://client-r8vyry1zh-anurags-007s-projects.vercel.app',
            'https://clientt-ten-orpin.vercel.app',
            'https://client-ten-orpin.vercel.app',
            'https://anurags-tempoworkers-client.netlify.app',
            'https://anurags-007.github.io',
            'https://tempoworkers-client.vercel.app',
            'https://tempoworkers.vercel.app',
        ];
        if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed for: ' + origin));
        }
    },
    credentials: true
}));

// Body size limit — prevents large payload attacks
app.use(express.json({ limit: '10kb' }));

// ─── Global Rate Limiter (200 req / 15 min per IP) ───────────
const requestCounts = new Map();
setInterval(() => requestCounts.clear(), 15 * 60 * 1000);
const rateLimit = (req, res, next) => {
    const ip = req.ip;
    const count = (requestCounts.get(ip) || 0) + 1;
    requestCounts.set(ip, count);
    if (count > 200) return res.status(429).json({ message: 'Too many requests, please try again later.' });
    next();
};
app.use(rateLimit);

// ─── Strict Auth Rate Limiter (5 req / 15 min per IP) ────────
const authRequestCounts = new Map();
setInterval(() => authRequestCounts.clear(), 15 * 60 * 1000);
const authRateLimit = (req, res, next) => {
    const ip = req.ip;
    const count = (authRequestCounts.get(ip) || 0) + 1;
    authRequestCounts.set(ip, count);
    if (count > 5) {
        return res.status(429).json({
            message: 'Too many login attempts. Please wait 15 minutes before trying again.'
        });
    }
    next();
};
// ─────────────────────────────────────────────────────────────

// ─── NoSQL Injection Sanitizer ───────────────────────────────
const sanitizeObject = (obj) => {
    if (obj instanceof Object) {
        for (const key in obj) {
            if (/^\$/.test(key) || /\./.test(key)) delete obj[key];
            else sanitizeObject(obj[key]);
        }
    }
};
const mongoSanitize = (req, res, next) => {
    sanitizeObject(req.body);
    sanitizeObject(req.query);
    sanitizeObject(req.params);
    next();
};
app.use(mongoSanitize);

// ─── Routes ──────────────────────────────────────────────────
// Apply strict rate limiting only to sensitive auth endpoints
app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/login-password', authRateLimit);
app.use('/api/auth/send-otp', authRateLimit);

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, io };
