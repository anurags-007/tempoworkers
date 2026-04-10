import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import {
    LogOut, MapPin, Users, Plus, CheckCircle, Clock, X, ArrowLeft,
    Briefcase, Building2, Star, Trophy, History, MessageSquare, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';
import SkeletonLoader from '../components/SkeletonLoader';
import Confetti from '../components/Confetti';
import ChatBox from '../components/ChatBox';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
};

const CATEGORY_OPTIONS = ['Mason', 'Plumber', 'Electrician', 'Laborer', 'Carpenter', 'Painter', 'Welder', 'Helper'];

// ─── Star Rating Component ────────────────────────────────────────────────────
const StarRating = ({ onRate }) => {
    const [hovered, setHovered] = useState(0);
    const [selected, setSelected] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selected) { toast.error('Please select a star rating'); return; }
        setLoading(true);
        try {
            await onRate(selected, comment);
            setSubmitted(true);
            toast.success('Rating submitted! ⭐');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to submit rating');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <Star size={16} className="fill-amber-400" /> Rated {selected}/5 ⭐
            </div>
        );
    }

    return (
        <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wider">Rate this Worker</p>
            <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                    <button
                        key={s}
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setSelected(s)}
                        className="transition-transform hover:scale-110"
                    >
                        <Star
                            size={24}
                            className={`transition-colors ${(hovered || selected) >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                        />
                    </button>
                ))}
            </div>
            <textarea
                placeholder="Optional comment..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                className="w-full text-sm p-2 border border-amber-200 rounded-lg outline-none focus:border-amber-400 resize-none mb-2 bg-white"
            />
            <button
                onClick={handleSubmit}
                disabled={loading || !selected}
                className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition disabled:opacity-50"
            >
                {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
        </div>
    );
};

const EmployerDashboard = ({ user, setUser, onLogout }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('post');
    const [myJobs, setMyJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [historyApps, setHistoryApps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [celebrate, setCelebrate] = useState(false);
    const confettiShown = useRef(false);
    const [notifBadge, setNotifBadge] = useState(0);
    const [selectedChatApplication, setSelectedChatApplication] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        category: 'Mason',
        wage: '',
        duration: '',
        city: 'New Delhi'
    });

    // City → approximate coordinates lookup
    const cityCoords = {
        'New Delhi': [77.2090, 28.6139],
        'Mumbai': [72.8777, 19.0760],
        'Bangalore': [77.5946, 12.9716],
        'Chennai': [80.2707, 13.0827],
        'Hyderabad': [78.4867, 17.3850],
        'Kolkata': [88.3639, 22.5726],
        'Pune': [73.8567, 18.5204],
        'Ahmedabad': [72.5714, 23.0225],
        'Jaipur': [75.7873, 26.9124],
        'Surat': [72.8311, 21.1702],
    };

    useEffect(() => {
        if (activeTab === 'jobs') fetchMyJobs();
        else if (activeTab === 'history') fetchHistory();
    }, [activeTab]);

    // Listen for Socket.IO notifications to show badge on employer dashboard
    useEffect(() => {
        const handleNotif = (e) => {
            if (e.detail?.status === 'pending') {
                setNotifBadge(prev => prev + 1);
            }
        };
        window.addEventListener('tw-notification', handleNotif);
        return () => window.removeEventListener('tw-notification', handleNotif);
    }, []);

    const fetchMyJobs = async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            const res = await api.get(`/jobs/employer/${user._id}`);
            setMyJobs(res.data);
        } catch { toast.error('Failed to load jobs'); }
        finally { setLoading(false); }
    };

    const fetchApplicants = async (jobId) => {
        setLoading(true);
        try {
            const res = await api.get(`/applications/job/${jobId}`);
            setApplicants(res.data);
            setSelectedJob(jobId);
            setNotifBadge(0); // Clear badge when they view
        } catch { toast.error('Failed to load applicants'); }
        finally { setLoading(false); }
    };

    const fetchHistory = async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            const res = await api.get(`/applications/employer/${user._id}/history`);
            setHistoryApps(res.data);
        } catch { toast.error('Failed to load history'); }
        finally { setLoading(false); }
    };

    const handlePostJob = async (e) => {
        e.preventDefault();
        if (!user?._id) { toast.error('Not logged in'); return; }
        try {
            const coords = cityCoords[formData.city] || [77.2090, 28.6139];
            await api.post('/jobs', {
                title: formData.title,
                category: formData.category,
                wage: formData.wage,
                duration: formData.duration,
                location: { type: 'Point', coordinates: coords, city: formData.city }
            });
            toast.success(t('job_posted_success', 'Job Posted Successfully! 📢'));
            setFormData({ title: '', category: 'Mason', wage: '', duration: '', city: 'New Delhi' });
            setActiveTab('jobs');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error posting job');
        }
    };

    const handleToggleStatus = async (jobId) => {
        try {
            const res = await api.patch(`/jobs/${jobId}/status`);
            const newStatus = res.data.job.status;
            setMyJobs(prev => prev.map(j => j._id === jobId ? { ...j, status: newStatus } : j));
            toast(`Job is now ${newStatus}`, { icon: newStatus === 'open' ? '🟢' : '🔴', duration: 2000 });
        } catch {
            toast.error('Failed to update status');
        }
    };

    const updateStatus = async (appId, status) => {
        try {
            await api.patch(`/applications/${appId}/status`, { status });
            toast.success(`Applicant ${status}! 🎉`);
            setApplicants(applicants.map(app => app._id === appId ? { ...app, status } : app));
            if (status === 'accepted' && !confettiShown.current) {
                setCelebrate(true);
                confettiShown.current = true;
                setTimeout(() => setCelebrate(false), 5000);
            }
        } catch { toast.error('Update failed'); }
    };

    const markComplete = async (appId) => {
        try {
            await api.patch(`/applications/${appId}/complete`);
            
            // Release Escrow Phase
            try {
                await api.post(`/payment/release/${appId}`);
                toast.success('Escrow released and Job complete! 💸');
            } catch (err) {
                toast.success('Job Marked Complete! ✅'); // Fallback for non-escrow jobs
            }
            
            setApplicants(prev => prev.map(a => a._id === appId ? { ...a, status: 'completed', completedAt: new Date() } : a));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to mark complete');
        }
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleHirePayment = async (appId) => {
        setLoading(true);
        try {
            const resScript = await loadRazorpayScript();
            if (!resScript) {
                toast.error('Razorpay SDK failed to load. Are you online?');
                return;
            }

            const result = await api.post('/payment/create-order', { applicationId: appId });
            
            const options = {
                key: result.data.keyId,
                amount: result.data.amount.toString(),
                currency: result.data.currency,
                name: "TempoWorkers",
                description: "Escrow Payment for Worker",
                order_id: result.data.orderId,
                handler: async function (response) {
                    try {
                        const verifyRes = await api.post('/payment/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            applicationId: appId
                        });
                        toast.success(verifyRes.data.message || 'Worker Hired Successfully! 🎉');
                        
                        setApplicants(applicants.map(app => app._id === appId ? { ...app, status: 'accepted' } : app));
                        
                        if (!confettiShown.current) {
                            setCelebrate(true);
                            confettiShown.current = true;
                            setTimeout(() => setCelebrate(false), 5000);
                        }
                    } catch (err) {
                        toast.error(err.response?.data?.message || 'Payment Verification Failed');
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                    contact: user.mobile || ''
                },
                theme: {
                    color: "#059669"
                }
            };
            
            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

        } catch (err) {
            toast.error(err.response?.data?.message || 'Error initializing payment');
        } finally {
            setLoading(false);
        }
    };

    const rateWorker = async (appId, raterId) => async (rating, comment) => {
        await api.post(`/applications/${appId}/rate`, { rating, comment, raterId });
        setApplicants(prev => prev.map(a => a._id === appId ? { ...a, isRated: true } : a));
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const initials = (() => {
        const src = user.name || user.email || 'E';
        const clean = src.includes('@') ? src.split('@')[0] : src;
        return clean.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'E';
    })();

    const jobCount = myJobs.length;

    const tabs = [
        { key: 'post', label: t('emp_post_job', 'Post Job'), icon: Plus },
        { key: 'jobs', label: t('emp_active_jobs', 'Active Jobs'), icon: Briefcase, badge: jobCount || null },
        { key: 'history', label: 'History', icon: History, badge: historyApps.length || null },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans relative overflow-hidden transition-colors duration-1000">
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full blur-[100px] opacity-20 animate-float bg-blue-300/30" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full blur-[100px] opacity-20 animate-float bg-indigo-300/30" style={{ animationDelay: '2s' }} />
            </div>

            <Navbar />
            <Toaster position="top-center" />
            <Confetti trigger={celebrate} />

            <div className="pt-24 pb-12 px-4 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-200">
                            {initials}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-brand-600 uppercase tracking-wider mb-0.5">{getGreeting()} 👋</p>
                            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                                {user.name || 'Employer'}
                            </h1>
                            <p className="text-slate-500 text-sm mt-0.5">{user.companyName ? `${user.companyName} · ${user.email}` : user.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={onLogout}
                        title="Logout"
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition shadow-sm"
                    >
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <GlassCard className="!p-1 !rounded-2xl flex gap-1 bg-white/50 backdrop-blur-md border-white/40 mb-6">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        const showNotifBadge = tab.key === 'jobs' && notifBadge > 0;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => { setActiveTab(tab.key); setSelectedJob(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all relative ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                <Icon size={15} />
                                {tab.label}
                                {(tab.badge || showNotifBadge) && (
                                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/30 text-white' : showNotifBadge ? 'bg-red-500 text-white animate-pulse' : 'bg-brand-100 text-brand-700'}`}>
                                        {showNotifBadge ? notifBadge : tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </GlassCard>

                <AnimatePresence mode="wait">
                    {/* ─── Applicants Panel ─── */}
                    {selectedJob ? (
                        <motion.div key="applicants" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 font-bold px-4 py-2 rounded-xl hover:bg-white transition"
                            >
                                <ArrowLeft size={18} /> Back to Jobs
                            </button>

                            <h2 className="text-2xl font-bold mb-6 text-slate-800">Applicants</h2>

                            {loading ? (
                                <div className="space-y-4">
                                    <SkeletonLoader className="h-24 w-full rounded-2xl" />
                                    <SkeletonLoader className="h-24 w-full rounded-2xl" />
                                </div>
                            ) : applicants.length === 0 ? (
                                <div className="text-center py-20 bg-white/50 rounded-3xl border border-white/40 shadow-sm">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Users size={32} className="text-slate-400" /></div>
                                    <p className="text-slate-400 font-medium">No applicants yet for this job.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {applicants.map(app => (
                                        <GlassCard key={app._id} className="flex flex-col gap-4 p-6">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xl">
                                                        {app.worker?.name ? app.worker.name[0].toUpperCase() : 'W'}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-lg">{app.worker?.name || 'Worker'}</h3>
                                                        <p className="text-sm text-slate-500 mb-1">Mobile: {app.worker?.mobile || '—'}</p>
                                                        <p className="text-xs text-slate-400">Applied: {new Date(app.createdAt).toLocaleDateString('en-IN')}</p>
                                                        {app.worker?.baseRate > 0 && (
                                                            <p className="text-xs text-emerald-600 font-bold mt-0.5">Base rate: ₹{app.worker.baseRate}/day</p>
                                                        )}
                                                        <div className="flex gap-1.5 flex-wrap mt-1.5">
                                                            {app.worker?.skills?.map((skill, i) => (
                                                                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider border border-slate-200">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                                                    <button 
                                                        onClick={() => setSelectedChatApplication(app)}
                                                        className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-xl font-bold text-xs hover:bg-brand-100 transition flex items-center gap-1.5 border border-brand-200"
                                                    >
                                                        <MessageSquare size={14} /> Message
                                                    </button>
                                                    {app.status === 'pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => updateStatus(app._id, 'rejected')}
                                                                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100"
                                                                title="Reject"
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                            <GradientButton
                                                                onClick={() => handleHirePayment(app._id)}
                                                                className="!px-6 !py-2 !text-sm !from-brand-600 !to-brand-700 hover:!from-brand-500 hover:!to-brand-600 flex items-center gap-2"
                                                            >
                                                                <Lock size={14} /> Pay & Hire
                                                            </GradientButton>
                                                        </>
                                                    ) : app.status === 'accepted' ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-green-50 text-green-700 border border-green-100">
                                                                <CheckCircle size={16} /> Accepted
                                                            </span>
                                                            <button
                                                                onClick={() => markComplete(app._id)}
                                                                className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition flex items-center gap-1.5"
                                                            >
                                                                <Trophy size={15} /> Mark Complete
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${app.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                            {app.status === 'completed' ? <CheckCircle size={16} /> : <X size={16} />}
                                                            {app.status === 'completed' ? 'Completed' : 'Rejected'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Rating section — show after completion if not yet rated */}
                                            {app.status === 'completed' && !app.isRated && (
                                                <StarRating onRate={rateWorker(app._id, user._id)} />
                                            )}
                                            {app.status === 'completed' && app.isRated && (
                                                <div className="flex items-center gap-1.5 text-sm text-amber-600 font-bold">
                                                    <Star size={15} className="fill-amber-400" /> Worker has been rated
                                                </div>
                                            )}
                                        </GlassCard>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                    ) : activeTab === 'post' ? (
                        /* ─── Post Job Form ─── */
                        <motion.div key="post-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <GlassCard className="max-w-2xl mx-auto p-8 pt-10 border-t-4 border-t-brand-500">
                                <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                                    <Briefcase className="text-brand-600" /> {t('emp_post_job_title', 'Create a New Job')}
                                </h2>
                                <form onSubmit={handlePostJob} className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">{t('emp_job_title', 'Job Title')}</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Need 2 Masons for urgent work..."
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 outline-none transition font-medium text-slate-800 placeholder:text-slate-400"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">{t('emp_category', 'Category')}</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition appearance-none font-medium text-slate-800"
                                                    value={formData.category}
                                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                >
                                                    {CATEGORY_OPTIONS.map(cat => <option key={cat}>{cat}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">{t('emp_wage', 'Daily Wage')}</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    placeholder="500"
                                                    min="100"
                                                    className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition font-medium text-slate-800"
                                                    value={formData.wage}
                                                    onChange={e => setFormData({ ...formData, wage: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">{t('emp_duration', 'Duration')}</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 2 Days, 1 Week"
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 outline-none transition font-medium text-slate-800"
                                                value={formData.duration}
                                                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider flex items-center gap-1">
                                                <MapPin size={12} className="text-brand-500" /> {t('emp_location', 'City')}
                                            </label>
                                            <div className="relative">
                                                <select
                                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition appearance-none font-medium text-slate-800"
                                                    value={formData.city}
                                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                >
                                                    {Object.keys(cityCoords).map(city => <option key={city}>{city}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                                            </div>
                                        </div>
                                    </div>

                                    <GradientButton type="submit" fullWidth className="!py-4 !text-lg !shadow-xl mt-2">
                                        <Plus size={20} /> {t('emp_btn_post', 'Post Job')}
                                    </GradientButton>
                                </form>
                            </GlassCard>
                        </motion.div>

                    ) : activeTab === 'history' ? (
                        /* ─── History Tab ─── */
                        <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <h2 className="text-xl font-bold mb-5 text-slate-800 flex items-center gap-2">
                                <History size={20} className="text-brand-500" /> Completed Jobs History
                            </h2>
                            {loading ? (
                                <div className="space-y-4"><SkeletonLoader className="h-28 w-full rounded-2xl" /><SkeletonLoader className="h-28 w-full rounded-2xl" /></div>
                            ) : historyApps.length === 0 ? (
                                <div className="text-center py-20 bg-white/50 rounded-3xl border border-white/40">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trophy size={32} className="text-slate-400" /></div>
                                    <p className="text-slate-500 font-medium text-lg">No completed jobs yet.</p>
                                    <p className="text-slate-400 text-sm mt-1">Once you mark a job complete here, it'll appear in history.</p>
                                </div>
                            ) : (
                                <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                                    {historyApps.map(app => (
                                        <motion.div key={app._id} variants={item}>
                                            <GlassCard className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-slate-900 text-lg">{app.job?.title}</h3>
                                                    <div className="flex gap-3 flex-wrap mt-1 text-sm text-slate-500">
                                                        <span>Worker: <span className="font-bold text-slate-700">{app.worker?.name || app.worker?.mobile || '—'}</span></span>
                                                        <span>₹{app.job?.wage}/day</span>
                                                        <span>{app.job?.category}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        Completed: {app.completedAt ? new Date(app.completedAt).toLocaleDateString('en-IN') : '—'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-blue-700">
                                                    <CheckCircle size={16} /> Completed
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>

                    ) : (
                        /* ─── Active Jobs List ─── */
                        <motion.div key="jobs-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <div className="space-y-4">
                                {loading ? (
                                    <><SkeletonLoader className="h-40 w-full rounded-2xl" /><SkeletonLoader className="h-40 w-full rounded-2xl" /></>
                                ) : myJobs.length === 0 ? (
                                    <div className="text-center py-20 bg-white/50 rounded-3xl border border-white/40 shadow-sm">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Briefcase size={32} className="text-slate-400" /></div>
                                        <p className="text-slate-500 font-medium text-lg">No active jobs yet.</p>
                                        <button onClick={() => setActiveTab('post')} className="mt-4 px-6 py-2 rounded-xl bg-brand-50 text-brand-600 font-bold text-sm hover:bg-brand-100 transition border border-brand-100">
                                            Post your first job
                                        </button>
                                    </div>
                                ) : (
                                    <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2">
                                        {myJobs.map((job) => (
                                            <motion.div key={job._id} variants={item}>
                                                <GlassCard className="h-full flex flex-col hover:border-brand-300/50 hover:shadow-lg transition-all duration-300 group p-6">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h3 className="font-bold text-xl text-slate-900 leading-snug group-hover:text-brand-700 transition">{job.title}</h3>
                                                        <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg text-sm shadow-sm border border-green-200">
                                                            ₹{job.wage}/day
                                                        </span>
                                                    </div>

                                                    <div className="flex gap-3 text-sm text-slate-500 mb-6 font-medium flex-wrap">
                                                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                            <CheckCircle size={13} className="text-brand-500" /> {job.category}
                                                        </span>
                                                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                            <Clock size={13} className="text-slate-400" /> {job.duration}
                                                        </span>
                                                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100 capitalize">
                                                            <Building2 size={13} className="text-slate-400" /> {job.status}
                                                        </span>
                                                    </div>

                                                    <div className="mt-auto flex gap-3 pt-4 border-t border-slate-100">
                                                        <button
                                                            onClick={() => fetchApplicants(job._id)}
                                                            className="flex-1 py-2.5 rounded-xl bg-brand-50 text-brand-600 font-bold text-sm hover:bg-brand-100 transition flex items-center justify-center gap-2 border border-brand-100"
                                                        >
                                                            <Users size={18} /> View Applicants
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(job._id)}
                                                            title={job.status === 'open' ? 'Close job' : 'Reopen job'}
                                                            className={`px-3 py-2.5 rounded-xl font-bold text-xs border transition ${job.status === 'open' ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'}`}
                                                        >
                                                            {job.status === 'open' ? '🟢 Open' : '🔴 Closed'}
                                                        </button>
                                                    </div>
                                                </GlassCard>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {selectedChatApplication && (
                <ChatBox 
                    application={selectedChatApplication}
                    currentUser={user}
                    onClose={() => setSelectedChatApplication(null)}
                />
            )}
        </div>
    );
};

export default EmployerDashboard;
