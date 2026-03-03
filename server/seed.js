const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User, Worker, Employer } = require('./models/User');
const Job = require('./models/Job');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seedData = async () => {
    try {
        await User.deleteMany();
        await Job.deleteMany();

        const employer = await Employer.create({
            name: 'John Doe Builder',
            mobile: '9999999999',
            role: 'employer',
            location: { type: 'Point', coordinates: [77.2090, 28.6139] } // New Delhi
        });

        const worker = await Worker.create({
            name: 'Ramesh Mason',
            mobile: '8888888888',
            role: 'worker',
            skills: ['Mason', 'Plumber'],
            baseRate: 500,
            location: { type: 'Point', coordinates: [77.2000, 28.6100] } // Nearby
        });

        const job = await Job.create({
            employer: employer._id,
            title: 'Need Mason for Wall Repair',
            category: 'Mason',
            wage: 600,
            duration: '2 days',
            location: { type: 'Point', coordinates: [77.2090, 28.6139] },
        });

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

seedData();
