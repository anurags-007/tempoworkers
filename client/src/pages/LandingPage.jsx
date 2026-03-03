import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HardHat, Briefcase, ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import Navbar from '../components/Navbar';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';
import AnimatedText from '../components/ui/AnimatedText';

const LandingPage = () => {
    const cardsRef = useRef(null);
    const { t } = useTranslation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            setUser(stored ? JSON.parse(stored) : null);
        } catch {
            setUser(null);
        }
    }, []);

    const dashboardPath = user?.role === 'employer' ? '/employer-dashboard' : '/worker-dashboard';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden relative selection:bg-brand-500 selection:text-white">

            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] animate-float opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full blur-[120px] animate-float opacity-50" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-amber-400/10 rounded-full blur-[100px] animate-float opacity-30" style={{ animationDelay: '4s' }} />
            </div>

            <Navbar />

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center pt-32 pb-20 px-4 relative max-w-7xl mx-auto w-full">

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-4xl mx-auto mb-24 z-10"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 border border-brand-200 text-brand-700 text-sm font-semibold mb-8 shadow-sm backdrop-blur-sm"
                    >
                        <Star size={14} className="fill-brand-500 text-brand-500" />
                        {t('hero_badge')}
                    </motion.div>

                    <h1 className="text-5xl md:text-7xl font-extrabold mb-8 text-slate-900 tracking-tight leading-[1.1]">
                        <Trans i18nKey="hero_title" components={{ 1: <span className="text-gradient" /> }} />
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
                        {t('hero_subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {user ? (
                            <Link to={dashboardPath}
                                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 shadow-lg shadow-brand-300/30 transition-all"
                            >
                                Go to Dashboard <ArrowRight size={18} />
                            </Link>
                        ) : (
                            <button
                                onClick={() => cardsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 shadow-lg shadow-brand-300/30 transition-all"
                            >
                                {t('sign_in')} <ArrowRight size={18} />
                            </button>
                        )}
                        <Link to="/how-it-works">
                            <button className="px-8 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm flex items-center gap-2">
                                <HardHat size={20} className="text-slate-400" />
                                {t('nav_how_it_works')}
                            </button>
                        </Link>
                    </div>
                </motion.div>

                {/* Cards Section */}
                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl px-4 relative z-10">

                    <GlassCard className="group border-green-100/50">
                        <Link to="/login?role=worker" className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 group-hover:scale-110 group-hover:bg-green-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                    <HardHat size={32} />
                                </div>
                                <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">500+ Workers</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-3 text-slate-900 group-hover:text-green-700 transition">{t('role_worker_title')}</h2>
                            <p className="text-slate-500 mb-8 flex-1 leading-relaxed">
                                {t('role_worker_desc')}
                            </p>
                            <div className="flex items-center text-green-600 font-bold group-hover:translate-x-2 transition">
                                {t('role_worker_btn', { icon: '' })} <ArrowRight size={18} className="ml-2" />
                            </div>
                        </Link>
                    </GlassCard>

                    <GlassCard className="group border-blue-100/50">
                        <Link to="/login?role=employer" className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                    <Briefcase size={32} />
                                </div>
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200">Post Free</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-3 text-slate-900 group-hover:text-brand-700 transition">{t('role_employer_title')}</h2>
                            <p className="text-slate-500 mb-8 flex-1 leading-relaxed">
                                {t('role_employer_desc')}
                            </p>
                            <div className="flex items-center text-brand-600 font-bold group-hover:translate-x-2 transition">
                                {t('role_employer_btn', { icon: '' })} <ArrowRight size={18} className="ml-2" />
                            </div>
                        </Link>
                    </GlassCard>
                </div>
            </main>

            <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-200 bg-white/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p>© {new Date().getFullYear()} TempoWorkers. Connecting India.</p>
                    <div className="flex gap-6">
                        <Link to="/how-it-works" className="hover:text-brand-600 transition">How It Works</Link>
                        <Link to="/login?role=worker" className="hover:text-brand-600 transition">For Workers</Link>
                        <Link to="/login?role=employer" className="hover:text-brand-600 transition">For Employers</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
