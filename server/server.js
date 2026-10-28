require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');

// Connect to database (fails fast in production if MONGO_URI is missing)
connectDB();

const app = express();
app.set('trust proxy', 1); // Essential for rate limiting behind reverse proxies (Vercel, Render, Nginx)
const httpServer = http.createServer(app);

// ─── Security Headers (OWASP Compliant) ───────────────────────
app.use(helmet({
    contentSecurityPolicy: false, // API server does not serve HTML; frontend is decoupled
    crossOriginEmbedderPolicy: false,
}));

// Additional custom security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
});

// ─── Whitelisted CORS Configuration ──────────────────────────
const allowedOrigins = [
    'https://client-r8vyry1zh-anurags-007s-projects.vercel.app',
    'https://clientt-ten-orpin.vercel.app',
    'https://client-ten-orpin.vercel.app',
    'https://anurags-tempoworkers-client.netlify.app',
    'https://anurags-007.github.io',
    'https://tempoworkers-client.vercel.app',
    'https://tempoworkers.vercel.app',
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

const isOriginAllowed = (origin) => {
    if (!origin) return true; // Allow same-origin, curl, server-to-server requests
    if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
        return true;
    }
    if (allowedOrigins.includes(origin)) {
        return true;
    }
    // Specific trusted Vercel preview deploys for this project only
    if (/^https:\/\/tempoworkers[a-z0-9-]*\.vercel\.app$/.test(origin) || /^https:\/\/client[a-z0-9-]*anurags-007s-projects\.vercel\.app$/.test(origin)) {
        return true;
    }
    return false;
};

const corsOptions = {
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            const err = new Error('CORS origin denied: ' + origin);
            err.status = 403;
            callback(err);
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));

// ─── Body Size Limit ─────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ─── Rate Limiting (Memory-Safe Sliding Window) ───────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { message: 'Too many authentication attempts. Please wait 15 minutes before trying again.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/login-password', authLimiter);
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── NoSQL & Prototype Pollution Sanitizer ────────────────────
const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            if (/^\$/.test(key) || /\./.test(key) || key === '__proto__' || key === 'constructor' || key === 'prototype') {
                delete obj[key];
            } else {
                sanitizeObject(obj[key]);
            }
        }
    }
};

const mongoSanitize = (req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    next();
};
app.use(mongoSanitize);

// ─── Socket.io with Redis Scaling & Handshake JWT Auth ───────
const io = new Server(httpServer, {
    cors: corsOptions,
});

const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('./config/redis');

if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('📶 Socket.io Redis adapter enabled');
}

// Authenticate WebSocket connections via JWT handshake
io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, '');
    if (!token) {
        return next(new Error('Authentication error: Token required'));
    }
    try {
        const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'DEV_ONLY_insecure_secret_do_not_use_in_prod' : null);
        if (!secret) return next(new Error('Authentication error: Server JWT secret missing'));
        const decoded = jwt.verify(token, secret);
        socket.user = decoded;
        next();
    } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
    }
});

io.on('connection', (socket) => {
    const userId = socket.user?.id || socket.user?._id;
    if (userId) {
        socket.join(`user_${userId}`);
    }

    // Only allow joining the user's own room to prevent IDOR eavesdropping
    socket.on('join', (requestedId) => {
        if (requestedId && String(requestedId) === String(userId)) {
            socket.join(`user_${userId}`);
        }
    });

    socket.on('disconnect', () => { });
});

app.set('io', io);

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ─── Health Check ────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Tempoworkers API is running', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    if (process.env.NODE_ENV !== 'test' && statusCode === 500) {
        console.error('Unhandled Server Error:', err);
    }
    res.status(statusCode).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, io, httpServer };
