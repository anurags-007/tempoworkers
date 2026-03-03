const { User, Worker, Employer } = require('../models/User');
const Otp = require('../models/Otp');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');

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

exports.sendOtp = async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({ message: 'DATABASE_CONNECTION_FAILED' });
    }

    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ message: 'Mobile number is required' });
    if (!/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({ message: 'Invalid mobile number. Must be a valid 10-digit Indian number.' });
    }

    // ─── OTP Rate Limit: 60 seconds cooldown per mobile ───
    const existing = await Otp.findOne({ mobile });
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
        await Otp.deleteMany({ mobile });
        await Otp.create({ mobile, otp });

        // Log only in non-production
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] OTP for ${mobile}: ${otp}`);
        }

        if (process.env.SMS_API_KEY) {
            let smsSent = false;
            try {
                const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                    method: 'POST',
                    headers: { 'authorization': process.env.SMS_API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ route: 'otp', variables_values: otp, numbers: mobile })
                });
                const data = await response.json();
                if (data.return === true) smsSent = true;
                else console.error('SMS API Error:', data.message);
            } catch (smsError) {
                console.error('Failed to send SMS:', smsError.message);
            }

            if (smsSent) return res.json({ message: 'OTP sent to your mobile number via SMS.' });
            // Do NOT reveal OTP in response — SMS failed silently
            return res.json({ message: 'OTP generated. SMS delivery failed; contact support.' });
        }

        // Dev-mode: ONLY return OTP when not in production
        if (process.env.NODE_ENV === 'production') {
            return res.json({ message: 'OTP sent.' });
        }
        res.json({ message: 'OTP generated (Dev Mode)', otp });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
};

exports.verifyOtp = async (req, res) => {
    const { mobile, otp, role } = req.body;

    if (!mobile || !otp) {
        return res.status(400).json({ message: 'Mobile number and OTP are required.' });
    }
    if (!/^\d{4}$/.test(otp)) {
        return res.status(400).json({ message: 'OTP must be exactly 4 digits.' });
    }

    try {
        const validOtp = await Otp.findOne({ mobile, otp });
        if (!validOtp) return res.status(400).json({ message: 'Invalid or Expired OTP' });

        await Otp.deleteOne({ _id: validOtp._id });

        let user = await User.findOne({ mobile });
        if (!user) {
            if (!role) return res.status(400).json({ message: 'Role required for new user' });
            user = role === 'worker' ? new Worker({ mobile, role }) : new Employer({ mobile, role });
            await user.save();
        }

        const token = generateToken(user);
        res.json({ message: 'Login successful', user, token });
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

        const { name, location, skills, baseRate, companyName, isAvailable } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name !== undefined) user.name = sanitizeName(name);
        if (location) user.location = location;

        if (user.role === 'worker') {
            if (skills !== undefined) user.skills = skills;
            if (baseRate !== undefined) user.baseRate = baseRate;
            if (isAvailable !== undefined) user.isAvailable = isAvailable;
        }
        if (user.role === 'employer') {
            if (companyName !== undefined) user.companyName = companyName;
        }

        await user.save();
        res.json({ message: 'Profile updated', user });
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
        newUser.password = undefined;

        const token = generateToken(newUser);
        res.status(201).json({ message: 'Registration successful', user: newUser, token });
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

        user.password = undefined;
        const token = generateToken(user);
        res.json({ message: 'Login successful', user, token });
    } catch (error) {
        console.error('Password Login Error:', error);
        res.status(500).json({ message: 'Login failed.' });
    }
};
