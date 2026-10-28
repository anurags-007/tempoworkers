// Live Full-Stack Simulation Test for TempoWorkers
// Tests: Auth, Profiles, Jobs, Real-time WebSockets, Live Chat, Applications, Ratings

const { io } = require('C:/Users/anura/OneDrive/Desktop/tempoworkers-main/client/node_modules/socket.io-client');

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runLiveTest() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║       TEMPOWORKERS LIVE REAL-TIME END-TO-END SIMULATION TEST       ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ [PASS] ${message}`);
            passed++;
        } else {
            console.error(`  ❌ [FAIL] ${message}`);
            failed++;
        }
    }

    try {
        // ==========================================
        // 1. WORKER ONBOARDING
        // ==========================================
        console.log('👉 STEP 1: Worker Registration & Profile Setup');
        const workerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
        
        // 1a. Send OTP
        const wOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: workerPhone })
        });
        const wOtpData = await wOtpRes.json();
        assert(wOtpRes.status === 200, `Worker OTP requested for +91-${workerPhone}`);
        const workerOtp = wOtpData.otp;

        // 1b. Verify OTP & Register
        const wLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: workerPhone, otp: workerOtp, role: 'worker' })
        });
        const wLoginData = await wLoginRes.json();
        assert(wLoginRes.status === 200 && !!wLoginData.token, 'Worker authenticated with JWT token');
        const workerToken = wLoginData.token;
        const workerId = wLoginData.user._id;

        // 1c. Update Worker Profile
        const wProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${workerToken}`
            },
            body: JSON.stringify({
                name: 'Ramesh Kumar',
                skills: ['Plumbing', 'Pipe Fitting', 'Industrial Maintenance'],
                dailyRate: 1500,
                hourlyRate: 200,
                isAvailable: true
            })
        });
        const wProfileData = await wProfileRes.json();
        assert(wProfileRes.status === 200, 'Worker profile updated (Name: Ramesh Kumar, Rate: ₹1500/day)');

        // ==========================================
        // 2. EMPLOYER ONBOARDING
        // ==========================================
        console.log('\n👉 STEP 2: Employer Registration & Profile Setup');
        const employerEmail = `vikram.${Date.now()}@urbanbuild.com`;

        // 2a. Send OTP
        const eOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: employerEmail })
        });
        const eOtpData = await eOtpRes.json();
        assert(eOtpRes.status === 200, `Employer OTP requested for ${employerEmail}`);
        const employerOtp = eOtpData.otp;

        // 2b. Verify OTP & Register
        const eLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: employerEmail, otp: employerOtp, role: 'employer' })
        });
        const eLoginData = await eLoginRes.json();
        assert(eLoginRes.status === 200 && !!eLoginData.token, 'Employer authenticated with JWT token');
        const employerToken = eLoginData.token;
        const employerId = eLoginData.user._id;

        // 2c. Update Employer Profile
        const eProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employerToken}`
            },
            body: JSON.stringify({
                name: 'Vikram Malhotra',
                companyName: 'UrbanBuild Infrastructure Pvt Ltd'
            })
        });
        assert(eProfileRes.status === 200, 'Employer profile updated (Vikram Malhotra / UrbanBuild)');

        // ==========================================
        // 3. WEBSOCKET REAL-TIME CONNECTIONS
        // ==========================================
        console.log('\n👉 STEP 3: Establishing Real-Time WebSocket Handshakes');

        const workerSocket = io(SOCKET_URL, {
            transports: ['websocket'],
            auth: { token: workerToken },
            reconnectionAttempts: 3
        });

        const employerSocket = io(SOCKET_URL, {
            transports: ['websocket'],
            auth: { token: employerToken },
            reconnectionAttempts: 3
        });

        await Promise.all([
            new Promise((resolve) => workerSocket.on('connect', () => {
                workerSocket.emit('join', workerId);
                resolve();
            })),
            new Promise((resolve) => employerSocket.on('connect', () => {
                employerSocket.emit('join', employerId);
                resolve();
            }))
        ]);
        assert(workerSocket.connected, `Worker WebSocket connected (Socket ID: ${workerSocket.id})`);
        assert(employerSocket.connected, `Employer WebSocket connected (Socket ID: ${employerSocket.id})`);

        // Setup Socket Listeners
        let jobBroadcastReceived = false;
        let employerNotificationReceived = null;
        let workerChatMessageReceived = null;
        let employerChatMessageReceived = null;

        workerSocket.on('notification', (data) => {
            if (data.type === 'job_posted') {
                jobBroadcastReceived = true;
            }
            if (data.type === 'chat_message') {
                workerChatMessageReceived = data;
            }
        });
        workerSocket.on('chat_message', (msg) => {
            workerChatMessageReceived = msg;
        });

        employerSocket.on('notification', (data) => {
            employerNotificationReceived = data;
        });
        employerSocket.on('chat_message', (msg) => {
            employerChatMessageReceived = msg;
        });

        // ==========================================
        // 4. EMPLOYER POSTS A JOB
        // ==========================================
        console.log('\n👉 STEP 4: Employer Posts New Job Opportunity');
        const jobPayload = {
            title: 'Urgent Commercial Pipe Fitting at Metro Station',
            category: 'Plumber',
            wage: 1800,
            payType: 'Daily',
            duration: '3 Days',
            location: {
                type: 'Point',
                coordinates: [77.3638, 28.6280],
                address: 'Noida City Center Metro Station, UP'
            }
        };

        const postJobRes = await fetch(`${BASE_URL}/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employerToken}`
            },
            body: JSON.stringify(jobPayload)
        });
        const postJobData = await postJobRes.json();
        assert(postJobRes.status === 201, `Job posted successfully! (ID: ${postJobData._id})`);
        const jobId = postJobData._id;

        await sleep(500); // Allow socket broadcast propagation
        assert(jobBroadcastReceived, 'Worker received real-time "job_posted" broadcast via Socket.IO');

        // ==========================================
        // 5. WORKER APPLIES FOR THE JOB
        // ==========================================
        console.log('\n👉 STEP 5: Worker Discovers and Applies for Job');
        const applyRes = await fetch(`${BASE_URL}/jobs/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${workerToken}`
            },
            body: JSON.stringify({ jobId })
        });
        const applyData = await applyRes.json();
        assert(applyRes.status === 201 || applyRes.status === 200, 'Worker submitted application successfully');
        const applicationId = applyData._id;

        await sleep(500); // Allow socket notification propagation
        assert(
            employerNotificationReceived && employerNotificationReceived.message.includes('Ramesh Kumar'),
            `Employer received real-time socket notification: "${employerNotificationReceived?.message}"`
        );

        // ==========================================
        // 6. REAL-TIME LIVE CHAT BETWEEN WORKER & EMPLOYER
        // ==========================================
        console.log('\n👉 STEP 6: Real-Time Live Chat Messaging');

        // 6a. Worker sends message
        const workerMsgText = 'Namaste Sir, I have 8 years experience in industrial plumbing and can join tomorrow.';
        const wChatRes = await fetch(`${BASE_URL}/chat/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${workerToken}`
            },
            body: JSON.stringify({ text: workerMsgText })
        });
        assert(wChatRes.status === 200 || wChatRes.status === 201, 'Worker sent chat message via API');

        await sleep(500);
        assert(
            employerChatMessageReceived && employerChatMessageReceived.text === workerMsgText,
            `Employer received live chat in real-time: "${employerChatMessageReceived?.text}"`
        );

        // 6b. Employer replies
        const empReplyText = 'Great Ramesh! Please report at Gate 2 by 8:30 AM tomorrow with your tool kit.';
        const eChatRes = await fetch(`${BASE_URL}/chat/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employerToken}`
            },
            body: JSON.stringify({ text: empReplyText })
        });
        assert(eChatRes.status === 200 || eChatRes.status === 201, 'Employer sent reply via API');

        await sleep(500);
        assert(
            workerChatMessageReceived && workerChatMessageReceived.text === empReplyText,
            `Worker received live reply in real-time: "${workerChatMessageReceived?.text}"`
        );

        // 6c. Fetch message history
        const historyRes = await fetch(`${BASE_URL}/chat/${applicationId}`, {
            headers: { 'Authorization': `Bearer ${workerToken}` }
        });
        const history = await historyRes.json();
        assert(Array.isArray(history) && history.length === 2, `Chat history verified (${history.length} messages persisted)`);

        // ==========================================
        // 7. EMPLOYER ACCEPTS APPLICATION & COMPLETES JOB
        // ==========================================
        console.log('\n👉 STEP 7: Application Lifecycle (Accept, Complete & Rate)');

        // 7a. Accept Application
        const acceptRes = await fetch(`${BASE_URL}/applications/${applicationId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employerToken}`
            },
            body: JSON.stringify({ status: 'accepted' })
        });
        assert(acceptRes.status === 200, 'Employer accepted worker application (Status: accepted)');

        // 7b. Mark Job as Completed
        const completeRes = await fetch(`${BASE_URL}/applications/${applicationId}/complete`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employerToken}`
            }
        });
        assert(completeRes.status === 200, 'Job marked completed by Employer (Status: completed)');

        // 7c. Rate Worker
        const rateRes = await fetch(`${BASE_URL}/applications/${applicationId}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employerToken}`
            },
            body: JSON.stringify({
                rating: 5,
                review: 'Ramesh did top quality plumbing work. Very punctual, polite and highly skilled.'
            })
        });
        assert(rateRes.status === 200, 'Employer submitted 5-star rating and review for Ramesh');

        // ==========================================
        // 8. VERIFY FINAL WORKER STATS
        // ==========================================
        console.log('\n👉 STEP 8: Final Profile & History Verification');
        const finalWorkerRes = await fetch(`${BASE_URL}/applications/worker/${workerId}/history`, {
            headers: { 'Authorization': `Bearer ${workerToken}` }
        });
        const historyData = await finalWorkerRes.json();
        assert(Array.isArray(historyData) && historyData.length >= 1, `Worker profile has ${historyData.length} completed job history item`);

        // Close sockets cleanly
        workerSocket.disconnect();
        employerSocket.disconnect();

        console.log('\n╔════════════════════════════════════════════════════════════════════╗');
        console.log(`║   SIMULATION RESULT: ${passed} PASSED, ${failed} FAILED (100% COMPLETE)         ║`);
        console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    } catch (err) {
        console.error('Fatal live test error:', err);
    }
}

runLiveTest();
