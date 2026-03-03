const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

// In production, crash immediately if JWT_SECRET is not configured.
// In development, fall back to a dev-only secret with a loud warning.
let JWT_SECRET;
if (process.env.JWT_SECRET) {
    JWT_SECRET = process.env.JWT_SECRET;
} else if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET environment variable is required in production.');
    process.exit(1);
} else {
    console.warn('⚠️  WARNING: JWT_SECRET not set. Using insecure dev-only secret. DO NOT use in production.');
    JWT_SECRET = 'DEV_ONLY_insecure_secret_do_not_use_in_prod';
}

/**
 * Generate a signed JWT token for a user (7-day expiry)
 */
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

/**
 * Protect middleware — verifies JWT and attaches req.user
 */
const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Not authorized. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Not authorized. User not found.' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired. Please login again.' });
        }
        return res.status(401).json({ message: 'Not authorized. Invalid token.' });
    }
};

/**
 * Role guard — use after protect()
 * Usage: requireRole('employer'), requireRole('worker')
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
};

module.exports = { protect, requireRole, generateToken };
