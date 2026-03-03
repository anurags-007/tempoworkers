import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Search, User, IndianRupee, Briefcase, Users, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';

const HowItWorks = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('worker'); // 'worker' or 'employer'

    const variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    const steps = {
        worker: [
            {
                icon: <User size={32} className="text-green-600" />,
                title: t('how.worker.step1.title', "Create Your Profile"),
                desc: t('how.worker.step1.desc', "Sign up and list your skills to get noticed.")
            },
            {
                icon: <Search size={32} className="text-green-600" />,
                title: t('how.worker.step2.title', "Find Jobs Nearby"),
                desc: t('how.worker.step2.desc', "Browse active job listings in your local area with real-time wages.")
            },
            {
                icon: <CheckCircle size={32} className="text-green-600" />,
                title: t('how.worker.step3.title', "Apply & Get Hired"),
                desc: t('how.worker.step3.desc', "One-click apply. Get notified instantly when an employer accepts you.")
            },
            {
                icon: <IndianRupee size={32} className="text-green-600" />,
                title: t('how.worker.step4.title', "Earn Money"),
                desc: t('how.worker.step4.desc', "Complete the job and get paid directly by the employer.")
            }
        ],
        employer: [
            {
                icon: <FileText size={32} className="text-brand-600" />,
                title: t('how.employer.step1.title', "Post a Job"),
                desc: t('how.employer.step1.desc', "Describe your requirement: Role, Wage, Duration, and Location.")
            },
            {
                icon: <Users size={32} className="text-brand-600" />,
                title: t('how.employer.step2.title', "Review Applicants"),
                desc: t('how.employer.step2.desc', "See profiles of skilled workers who apply to your job.")
            },
            {
                icon: <CheckCircle size={32} className="text-brand-600" />,
                title: t('how.employer.step3.title', "Hire Instantly"),
                desc: t('how.employer.step3.desc', "Accept the best candidate. They get notified, and you get the work done.")
            }
        ]
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-200">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 pt-32 pb-20 text-center">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                        {t('how.title_prefix', 'How')} <span className="text-brand-600">TempoWorkers</span> {t('how.title_suffix', 'Works')}
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        {t('how.subtitle', "Whether you're looking for work or looking to hire, we make the process simple, transparent, and fast.")}
                    </p>
                </motion.div>

                {/* Toggle */}
                <div className="flex justify-center mb-16">
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex">
                        <button
                            onClick={() => setActiveTab('worker')}
                            className={`px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === 'worker'
                                    ? 'bg-green-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <User size={18} />
                            {t('how.btn_worker', "For Workers")}
                        </button>
                        <button
                            onClick={() => setActiveTab('employer')}
                            className={`px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === 'employer'
                                    ? 'bg-brand-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <Briefcase size={18} />
                            {t('how.btn_employer', "For Employers")}
                        </button>
                    </div>
                </div>

                {/* Steps Grid */}
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={variants}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left"
                        >
                            {steps[activeTab].map((step, index) => (
                                <GlassCard key={index} className="flex flex-col gap-4 border-slate-100 items-start">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'worker' ? 'bg-green-50' : 'bg-brand-50'}`}>
                                        {step.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                                        <p className="text-slate-500 leading-relaxed text-sm">{step.desc}</p>
                                    </div>
                                </GlassCard>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* CTA */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-20">
                    <h3 className="text-2xl font-bold text-slate-900 mb-8">{t('how.cta_title', "Ready to get started?")}</h3>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/login?role=worker">
                            <button className="px-8 py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition flex items-center justify-center gap-2 w-full sm:w-auto">
                                {t('role_worker_btn', 'Join as Worker')} <ArrowRight size={20} />
                            </button>
                        </Link>
                        <Link to="/login?role=employer">
                            <GradientButton className="w-full sm:w-auto justify-center" icon={ArrowRight}>
                                {t('role_employer_btn', 'Hire Workers')}
                            </GradientButton>
                        </Link>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default HowItWorks;
