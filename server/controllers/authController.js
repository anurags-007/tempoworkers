const { User, Worker, Employer } = require('../models/User');
const Otp = require('../models/Otp');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { generateToken } = require('../middleware/auth');

const sendEmailOtp = async (email, otp) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️  EMAIL_USER or EMAIL_PASS not set in .env. Skipping actual email send.');
        return false;
    }
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        await transporter.sendMail({
            from: `"TempoWorkers" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'TempoWorkers - Your Login OTP',
            html: `<p>Your OTP for login is <strong>${otp}</strong>. It expires in 5 minutes.</p>`
        });
        return true;
    } catch (err) {
        console.error('Email API Error:', err);
        return false;
    }
};

// ─── Password Strength Validator ─────────────────────────────
// Min 8 chars, at least 1 digit or 1 special character
const isStrongPassword = (password) => {
    return (
        typeof password === 'string' &&
        password.length >= 8 &&
        /[\d!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?]/.test(password)
    );
};

// ─── Name Sanitizer ──────────────────────────────────────────
const sanitizeName = (name) => {
    if (typeof name !== 'string') return '';
    // Strip HTML, limit length to 80 chars
    return name.replace(/<[^>]*>/g, '').trim().slice(0, 80);
};

// ─── User Response Sanitizer (Prevents Data Leakage) ─────────
const sanitizeUserResponse = (user) => {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.__v;
    delete obj.tokenVersion;
    delete obj.lastOtpSentAt;
    return obj;
};

exports.sendOtp = async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({ message: 'DATABASE_CONNECTION_FAILED' });
    }

    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: 'Mobile number or Email is required' });

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isMobile = /^[6-9]\d{9}$/.test(identifier);

    if (!isEmail && !isMobile) {
        return res.status(400).json({ message: 'Invalid identifier. Must be a valid email or 10-digit Indian mobile number.' });
    }

    // ─── OTP Rate Limit: 60 seconds cooldown per identifier ───
    const existing = await Otp.findOne({ identifier });
    if (existing) {
        const secondsSinceSent = (Date.now() - new Date(existing.createdAt).getTime()) / 1000;
        if (secondsSinceSent < 60) {
            const remaining = Math.ceil(60 - secondsSinceSent);
            return res.status(429).json({
                message: `Please wait ${remaining}s before requesting another OTP.`,
                retryAfter: remaining
            });
        }
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    try {
        await Otp.deleteMany({ identifier });
        await Otp.create({ identifier, otp });

        // Log only in non-production
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] OTP for ${identifier}: ${otp}`);
        }

        let sentSuccess = false;
        let deliveryMethod = '';

        if (isEmail) {
            sentSuccess = await sendEmailOtp(identifier, otp);
            deliveryMethod = 'Email';
        } else if (isMobile && process.env.SMS_API_KEY) {
            let smsSent = false;
            try {
                const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                    method: 'POST',
                    headers: { 'authorization': process.env.SMS_API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ route: 'otp', variables_values: otp, numbers: identifier })
                });
                const data = await response.json();
                if (data.return === true) smsSent = true;
                else console.error('SMS API Error:', data.message);
            } catch (smsError) {
                console.error('Failed to send SMS:', smsError.message);
            }

            if (smsSent) {
                sentSuccess = true;
                deliveryMethod = 'SMS';
            } else {
                // SMS failed. Check if worker has an email to fallback to
                const user = await User.findOne({ mobile: identifier });
                if (user && user.email) {
                    // Update the Otp document identifier to the email so verifyOtp works seamlessly
                    await Otp.updateOne({ identifier }, { identifier: user.email });
                    sentSuccess = await sendEmailOtp(user.email, otp);
                    if (sentSuccess) {
                        return res.json({ 
                            message: 'SMS failed. OTP fallback sent to your registered Email address.', 
                            fallbackTriggered: true,
                            fallbackIdentifier: user.email 
                        });
                    }
                }
            }
        }

        if (sentSuccess) return res.json({ message: `OTP sent to your ${isEmail ? 'email address' : 'mobile number'}.` });

        // Dev-mode: ONLY return OTP when not in production and sending failed (or not configured)
        if (process.env.NODE_ENV === 'production') {
            return res.json({ message: 'OTP generated. Delivery integration failed or not configured; contact support.' });
        }
        res.json({ message: `OTP generated (Dev Mode) for ${identifier}`, otp });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
};

exports.verifyOtp = async (req, res) => {
    const { identifier, otp, role } = req.body;
    // Fallback support for older clients sending `mobile` instead of `identifier`
    const targetIdentifier = identifier || req.body.mobile;

    if (!targetIdentifier || !otp) {
        return res.status(400).json({ message: 'Mobile number/Email and OTP are required.' });
    }
    if (!/^\d{4}$/.test(otp)) {
        return res.status(400).json({ message: 'OTP must be exactly 4 digits.' });
    }

    try {
        const validOtp = await Otp.findOne({ identifier: targetIdentifier });
        if (!validOtp) return res.status(400).json({ message: 'No OTP requested or expired.' });

        if (validOtp.otp !== otp) {
            validOtp.failedAttempts = (validOtp.failedAttempts || 0) + 1;
            if (validOtp.failedAttempts >= 5) {
                await Otp.deleteOne({ _id: validOtp._id });
                return res.status(429).json({ message: 'Too many failed attempts. Please request a new OTP.' });
            }
            await validOtp.save();
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        await Otp.deleteOne({ _id: validOtp._id });

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetIdentifier);
        
        let user = await User.findOne(
            isEmail ? { email: targetIdentifier } : { mobile: targetIdentifier }
        );
        
        if (!user) {
            if (!role) return res.status(400).json({ message: 'Role required for new user' });
            if (isEmail) {
                user = role === 'worker' ? new Worker({ email: targetIdentifier, role }) : new Employer({ email: targetIdentifier, role });
            } else {
                user = role === 'worker' ? new Worker({ mobile: targetIdentifier, role }) : new Employer({ mobile: targetIdentifier, role });
            }
            await user.save();
        }

        const token = generateToken(user);
        res.json({ message: 'Login successful', user: sanitizeUserResponse(user), token });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ message: 'Login failed' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        // SECURITY: always use JWT-authenticated user ID, never trust req.body.userId
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Not authorized.' });
        }

        const { name, location, skills, baseRate, companyName, isAvailable, email } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name !== undefined) user.name = sanitizeName(name);
        if (location) user.location = location;
        if (email !== undefined && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
             user.email = email;
        }

        if (user.role === 'worker') {
            if (skills !== undefined) user.skills = skills;
            if (baseRate !== undefined) user.baseRate = baseRate;
            if (isAvailable !== undefined) user.isAvailable = isAvailable;
        }
        if (user.role === 'employer') {
            if (companyName !== undefined) user.companyName = companyName;
        }

        await user.save();
        res.json({ message: 'Profile updated', user: sanitizeUserResponse(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.register = async (req, res) => {
    const { email, password, role, companyName } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Valid email, password, and role are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (role !== 'employer' && role !== 'worker') {
        return res.status(400).json({ message: 'Invalid role.' });
    }
    if (!isStrongPassword(password)) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters and contain at least one digit or special character.'
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists with this email.' });

        const salt = await bcrypt.genSalt(12); // bcrypt cost factor 12 (was 10)
        const hashedPassword = await bcrypt.hash(password, salt);

        const opts = { email, password: hashedPassword, role };
        const newUser = role === 'employer'
            ? new Employer({ ...opts, companyName: companyName || '' })
            : new Worker(opts);

        await newUser.save();

        const token = generateToken(newUser);
        res.status(201).json({ message: 'Registration successful', user: sanitizeUserResponse(newUser), token });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Registration failed.' });
    }
};

exports.loginWithPassword = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }
    // Minimum length check (don't validate full strength on login to avoid user enumeration)
    if (password.length < 8) {
        return res.status(400).json({ message: 'Invalid credentials.' });
    }

    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.password) {
            // Return same message whether user not found or password mismatch — prevents enumeration
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const token = generateToken(user);
        res.json({ message: 'Login successful', user: sanitizeUserResponse(user), token });
    } catch (error) {
        console.error('Password Login Error:', error);
        res.status(500).json({ message: 'Login failed.' });
    }
};
