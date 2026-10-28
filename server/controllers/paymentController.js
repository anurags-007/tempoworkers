const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Application = require('../models/Application');
const Job = require('../models/Job');

// Initialize Razorpay (Requires RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in .env)
const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay keys are missing. Please configure them in the .env file.');
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

exports.createOrder = async (req, res) => {
    try {
        const { applicationId } = req.body;
        const employerId = req.user._id;

        const application = await Application.findById(applicationId).populate('job worker');
        if (!application) return res.status(404).json({ message: 'Application not found' });
        if (application.job.employer.toString() !== employerId.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (application.status !== 'pending') {
            return res.status(400).json({ message: 'Application must be pending to initiate escrow' });
        }

        // Prevent duplicate escrow orders for the same application
        const existingEscrow = await Payment.findOne({ application: applicationId, status: 'escrow' });
        if (existingEscrow) {
            return res.status(400).json({ message: 'Escrow payment already active for this application.' });
        }
        await Payment.deleteMany({ application: applicationId, status: 'created' });

        // Amount in paise (multiply by 100)
        let amount = application.job.wage;
        // Check if the worker has a base rate, we use job wage for now unless negotiated. Using Job Wage.
        const amountInPaise = Math.round(amount * 100);

        const razorpay = getRazorpayInstance();

        // DEV MODE fallback simulation if the secret is "DUMMY" we can bypass actual API call. 
        // We will assume real keys since npm installed razorpay.
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${applicationId}`
        });

        const payment = new Payment({
            application: applicationId,
            employer: employerId,
            worker: application.worker._id,
            amount: amount,
            razorpay_order_id: order.id
        });
        await payment.save();

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ message: error.message || 'Failed to create order' });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, applicationId } = req.body;
        const employerId = req.user._id;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing payment verification parameters.' });
        }

        // SECURITY FIX: Bind payment to the authenticated employer (IDOR Protection)
        const payment = await Payment.findOne({ razorpay_order_id, employer: employerId });
        if (!payment) {
            return res.status(404).json({ message: 'Payment record not found for this employer.' });
        }

        // Idempotency: If already in escrow, return success safely
        if (payment.status === 'escrow') {
            return res.json({ message: 'Payment verified successfully, funds are in escrow! Job Accepted.' });
        }

        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ message: 'Server payment configuration missing.' });
        }

        const bodyText = `${razorpay_order_id}|${razorpay_payment_id}`;
        
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(bodyText)
            .digest('hex');

        // Constant-time signature comparison to eliminate timing side-channel attacks
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');
        const signatureBuffer = Buffer.from(razorpay_signature, 'hex');

        const isSignatureValid = 
            expectedBuffer.length === signatureBuffer.length && 
            crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

        if (isSignatureValid) {
            // Payment is verified
            payment.razorpay_payment_id = razorpay_payment_id;
            payment.razorpay_signature = razorpay_signature;
            payment.status = 'escrow';
            await payment.save();

            // Mark application as accepted and paymentStatus as escrow
            const application = await Application.findById(payment.application);
            if (!application) return res.status(404).json({ message: 'Associated application not found.' });
            application.status = 'accepted';
            application.paymentStatus = 'escrow';
            await application.save();

            res.json({ message: 'Payment verified successfully, funds are in escrow! Job Accepted.' });
        } else {
            payment.status = 'failed';
            await payment.save();
            res.status(400).json({ message: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ message: 'Failed to verify payment' });
    }
};

exports.releaseEscrow = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const employerId = req.user._id;

        const application = await Application.findById(applicationId).populate('job worker');
        if (!application) return res.status(404).json({ message: 'Application not found' });
        
        if (application.job.employer.toString() !== employerId.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        if (application.status !== 'completed') {
            return res.status(400).json({ message: 'Job must be marked completed before releasing funds' });
        }

        if (application.paymentStatus !== 'escrow') {
            return res.status(400).json({ message: 'No funds in escrow for this application' });
        }

        // RACE CONDITION PREVENTION: Atomically transition status from 'escrow' to 'processing_release'
        const payment = await Payment.findOneAndUpdate(
            { application: applicationId, status: 'escrow' },
            { status: 'processing_release' },
            { new: true }
        );
        if (!payment) {
            return res.status(409).json({ message: 'Escrow payment record not found or release is already being processed.' });
        }

        const worker = application.worker;
        if (!worker.razorpayAccountId) {
            // Revert state back to escrow so the worker can link their account and retry
            payment.status = 'escrow';
            await payment.save();
            return res.status(400).json({ 
                message: 'Worker has not linked their bank account (razorpayAccountId missing). Funds remain in escrow.' 
            });
        }

        try {
            const razorpay = getRazorpayInstance();
            // Amount is in paise
            const amountInPaise = Math.round(payment.amount * 100);

            const transfer = await razorpay.transfers.create({
                account: worker.razorpayAccountId,
                amount: amountInPaise,
                currency: 'INR',
                notes: {
                    applicationId: applicationId,
                    jobTitle: application.job.title
                }
            });

            console.log(`[Razorpay] Transfer created: ${transfer.id}`);

            application.paymentStatus = 'released';
            await application.save();

            payment.status = 'released';
            payment.razorpay_transfer_id = transfer.id;
            await payment.save();

            res.json({ message: 'Funds released and transferred to worker successfully! ✅', transferId: transfer.id });
        } catch (rzpError) {
            console.error('Razorpay Transfer API Error:', rzpError);
            // Revert status to escrow so the employer can retry after resolving provider issues
            payment.status = 'escrow';
            await payment.save();

            return res.status(502).json({ 
                message: 'Razorpay transfer failed. Please ensure your account has enough balance and the worker id is valid.',
                error: rzpError.message
            });
        }
    } catch (error) {
        console.error('Release Escrow Error:', error);
        res.status(500).json({ message: 'Failed to release funds' });
    }
};
