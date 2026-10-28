const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { User, Worker, Employer, Admin } = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');
const Payment = require('./models/Payment');
const Message = require('./models/Message');
const connectDB = require('./config/db');

dotenv.config();

const seedComprehensiveData = async () => {
    try {
        console.log('🔄 Connecting to database for seeding...');
        await connectDB();

        console.log('🧹 Purging old collections...');
        await User.deleteMany();
        await Job.deleteMany();
        await Application.deleteMany();
        await Payment.deleteMany();
        await Message.deleteMany();

        console.log('🌱 Seeding Admin, Employers & Skilled Workers...');

        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash('Tempo@1234', salt);

        // 1. Admin
        const admin = await Admin.create({
            name: 'TempoWorkers System Admin',
            email: 'admin@tempoworkers.com',
            mobile: '9900000001',
            password: defaultPassword,
            role: 'admin',
            isVerified: true
        });

        // 2. Verified Employers
        const emp1 = await Employer.create({
            name: 'Vikram Malhotra',
            companyName: 'Apex Infra & Construction Ltd',
            email: 'vikram@apexinfra.com',
            mobile: '9810011223',
            password: defaultPassword,
            role: 'employer',
            isVerified: true,
            location: { type: 'Point', coordinates: [77.3638, 28.6280] } // Sector 62, Noida
        });

        const emp2 = await Employer.create({
            name: 'Ananya Sharma',
            companyName: 'Urban Living Interiors & Modular Spaces',
            email: 'ananya@urbanliving.in',
            mobile: '9820022334',
            password: defaultPassword,
            role: 'employer',
            isVerified: true,
            location: { type: 'Point', coordinates: [77.0878, 28.4595] } // Cyber City, Gurgaon
        });

        const emp3 = await Employer.create({
            name: 'Rajiv Mehra',
            companyName: 'QuickMovers Commercial Logistics',
            email: 'rajiv@quickmovers.in',
            mobile: '9830033445',
            password: defaultPassword,
            role: 'employer',
            isVerified: true,
            location: { type: 'Point', coordinates: [77.2090, 28.6139] } // Connaught Place, New Delhi
        });

        // 3. High-Rated Skilled Workers
        const worker1 = await Worker.create({
            name: 'Rajesh Kumar',
            mobile: '9811223344',
            email: 'rajesh.electrician@gmail.com',
            password: defaultPassword,
            role: 'worker',
            skills: ['Electrician', 'High-Voltage Wiring', 'Circuit Breakers', 'Appliance Repair'],
            dailyRate: 1500,
            hourlyRate: 200,
            rating: 4.9,
            ratingCount: 38,
            completedJobsCount: 42,
            isAvailable: true,
            isVerified: true,
            location: { type: 'Point', coordinates: [77.3550, 28.6210] } // Noida
        });

        const worker2 = await Worker.create({
            name: 'Mohammed Aslam',
            mobile: '9822334455',
            email: 'aslam.plumbing@gmail.com',
            password: defaultPassword,
            role: 'worker',
            skills: ['Plumber', 'Pipe Fitting', 'Sanitary Installations', 'Leak Detection'],
            dailyRate: 1400,
            hourlyRate: 180,
            rating: 4.8,
            ratingCount: 29,
            completedJobsCount: 33,
            isAvailable: true,
            isVerified: true,
            location: { type: 'Point', coordinates: [77.0900, 28.4650] } // Gurgaon
        });

        const worker3 = await Worker.create({
            name: 'Sunita Devi',
            mobile: '9833445566',
            email: 'sunita.cleaning@gmail.com',
            password: defaultPassword,
            role: 'worker',
            skills: ['Deep Cleaning', 'Sanitization', 'Office Maintenance', 'Housekeeping'],
            dailyRate: 900,
            hourlyRate: 120,
            rating: 5.0,
            ratingCount: 51,
            completedJobsCount: 60,
            isAvailable: true,
            isVerified: true,
            location: { type: 'Point', coordinates: [77.2150, 28.6200] } // Central Delhi
        });

        const worker4 = await Worker.create({
            name: 'Harpreet Singh',
            mobile: '9844556677',
            email: 'harpreet.carpenter@gmail.com',
            password: defaultPassword,
            role: 'worker',
            skills: ['Carpenter', 'Modular Furniture', 'Wood Polishing', 'Door Fitting'],
            dailyRate: 1600,
            hourlyRate: 220,
            rating: 4.7,
            ratingCount: 22,
            completedJobsCount: 25,
            isAvailable: true,
            isVerified: true,
            location: { type: 'Point', coordinates: [77.3700, 28.6300] } // Noida
        });

        console.log('📌 Seeding Live Job Postings across Delhi-NCR...');

        const job1 = await Job.create({
            employer: emp1._id,
            title: 'Commercial 3-Phase Electrician for Office Complex',
            category: 'Electrician',
            wage: 1800,
            payType: 'Daily',
            duration: '3 Days',
            location: {
                type: 'Point',
                coordinates: [77.3638, 28.6280],
                address: 'Logix Cyber Park, Sector 62, Noida, UP'
            },
            status: 'open'
        });

        const job2 = await Job.create({
            employer: emp2._id,
            title: 'Master Carpenter for Modular Kitchen Fitting',
            category: 'Carpenter',
            wage: 1600,
            payType: 'Daily',
            duration: '2 Days',
            location: {
                type: 'Point',
                coordinates: [77.0878, 28.4595],
                address: 'DLF Phase 2, Cyber City, Gurgaon, HR'
            },
            status: 'open'
        });

        const job3 = await Job.create({
            employer: emp3._id,
            title: 'Heavy Logistics Loading & Warehouse Shifting',
            category: 'Helper',
            wage: 1000,
            payType: 'Daily',
            duration: '1 Day',
            location: {
                type: 'Point',
                coordinates: [77.2090, 28.6139],
                address: 'Barakhamba Road, Connaught Place, New Delhi'
            },
            status: 'open'
        });

        const job4 = await Job.create({
            employer: emp1._id,
            title: 'High-Rise Emergency Water Line & Valve Repair',
            category: 'Plumber',
            wage: 2000,
            payType: 'Daily',
            duration: '1 Day',
            location: {
                type: 'Point',
                coordinates: [77.3750, 28.6350],
                address: 'Express Trade Towers, Sector 132, Noida, UP'
            },
            status: 'open'
        });

        console.log('📝 Seeding Applications & Chat Interactions...');

        // Application 1: Rajesh applied to Job 1 (Accepted)
        const app1 = await Application.create({
            job: job1._id,
            worker: worker1._id,
            status: 'accepted',
            paymentStatus: 'escrow'
        });

        // Application 2: Aslam applied to Job 4 (Completed + Rated)
        const app2 = await Application.create({
            job: job4._id,
            worker: worker2._id,
            status: 'completed',
            paymentStatus: 'released',
            isRated: true,
            rating: 5,
            review: 'Mohammed Aslam fixed the main 4-inch valve within 2 hours. Exceptional skill and honesty!'
        });

        // Chat message on Application 1
        await Message.create({
            application: app1._id,
            sender: worker1._id,
            text: 'Hello Mr. Vikram, I will be reporting at the site by 8:30 AM tomorrow with standard safety gear.'
        });

        await Message.create({
            application: app1._id,
            sender: emp1._id,
            text: 'Noted Rajesh! Please ask for Supervisor Arvind at Tower A entry gate.'
        });

        console.log('\n=============================================================');
        console.log('🎉 DEMO DATA SEEDED SUCCESSFULLY! CLIENT READY DEMO LOGINS:');
        console.log('=============================================================');
        console.log('👑 Admin:     admin@tempoworkers.com    | Password: Tempo@1234');
        console.log('🏢 Employer:  vikram@apexinfra.com       | Password: Tempo@1234 (Apex Infra)');
        console.log('🏢 Employer:  ananya@urbanliving.in      | Password: Tempo@1234 (Urban Living)');
        console.log('👷 Worker:    9811223344 (Rajesh Kumar, Electrician ⭐4.9)');
        console.log('👷 Worker:    9822334455 (Mohammed Aslam, Plumber ⭐4.8)');
        console.log('👷 Worker:    9833445566 (Sunita Devi, Cleaner ⭐5.0)');
        console.log('=============================================================\n');

        if (require.main === module) {
            process.exit(0);
        }
    } catch (err) {
        console.error('❌ Seeding Error:', err);
        if (require.main === module) {
            process.exit(1);
        }
    }
};

if (require.main === module) {
    seedComprehensiveData();
}

module.exports = seedComprehensiveData;
