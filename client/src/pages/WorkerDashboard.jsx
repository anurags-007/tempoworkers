import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
    LogOut, MapPin, Clock, Search, CheckCircle, XCircle, Briefcase,
    RefreshCw, Bookmark, BookmarkCheck, Filter, X, User, Star, History, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';
import SkeletonLoader from '../components/SkeletonLoader';
import Confetti from '../components/Confetti';

const CATEGORIES = ['All', 'Mason', 'Plumber', 'Electrician', 'Laborer', 'Carpenter', 'Painter', 'Welder', 'Helper'];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
};

// ─── Star display helper ──────────────────────────────────────────────────────
const StarDisplay = ({ value, max = 5 }) => (
    <div className="flex gap-0.5">
        {[...Array(max)].map((_, i) => (
            <Star
                key={i}
                size={13}
                className={i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
            />
        ))}
    </div>
);

const WorkerDashboard = ({ user, setUser, onLogout }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('jobs');
    const [jobs, setJobs] = useState([]);
    const [bookmarkedJobs, setBookmarkedJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [historyApps, setHistoryApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCelebration, setShowCelebration] = useState(false);
    const confettiShown = useRef(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [minWage, setMinWage] = useState('');
    const [maxWage, setMaxWage] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (activeTab === 'jobs') fetchJobs();
        else if (activeTab === 'applications') fetchApplications();
        else if (activeTab === 'bookmarks') fetchBookmarks();
        else if (activeTab === 'history') fetchHistory();
    }, [activeTab]);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ radius: 50 });
            if (categoryFilter !== 'All') params.set('category', categoryFilter);
            if (minWage) params.set('minWage', minWage);
            if (maxWage) params.set('maxWage', maxWage);
            if (searchQuery) params.set('search', searchQuery);

            const fetchFn = async (lat, lng) => {
                params.set('lat', lat);
                params.set('lng', lng);
                const res = await api.get(`/jobs?${params.toString()}`);
                setJobs(res.data);
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => fetchFn(pos.coords.latitude, pos.coords.longitude).catch(() => fetchFn(28.6139, 77.2090)),
                    () => fetchFn(28.6139, 77.2090)
                );
            } else {
                await fetchFn(28.6139, 77.2090);
            }
        } catch { toast.error('Failed to load jobs'); }
        finally { setLoading(false); }
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/applications/worker/${user._id}`);
            setApplications(res.data);
            if (!confettiShown.current && res.data.some(a => a.status === 'accepted')) {
                setShowCelebration(true);
                confettiShown.current = true;
                setTimeout(() => setShowCelebration(false), 5000);
            }
        } catch { toast.error('Failed to load applications'); }
        finally { setLoading(false); }
    };

    const fetchBookmarks = async () => {
        setLoading(true);
        try {
            const res = await api.get('/jobs/bookmarked');
            setBookmarkedJobs(res.data);
        } catch { toast.error('Failed to load bookmarks'); }
        finally { setLoading(false); }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/applications/worker/${user._id}/history`);
            setHistoryApps(res.data);
        } catch { toast.error('Failed to load history'); }
        finally { setLoading(false); }
    };

    const handleApply = async (jobId) => {
        try {
            await api.post('/jobs/apply', { jobId });
            toast.success('Applied successfully! 🎉');
            setJobs(prev => prev.map(j => j._id === jobId ? { ...j, hasApplied: true } : j));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error applying');
        }
    };

    const handleBookmark = async (jobId) => {
        try {
            const res = await api.post(`/jobs/${jobId}/bookmark`);
            const label = res.data.isBookmarked ? 'Bookmarked!' : 'Bookmark removed';
            toast(label, { icon: res.data.isBookmarked ? '🔖' : '✖️', duration: 2000 });
            setJobs(prev => prev.map(j => j._id === jobId ? { ...j, isBookmarked: res.data.isBookmarked } : j));
        } catch { toast.error('Could not update bookmark'); }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;

    const initials = (() => {
        const src = user.name || user.mobile || 'W';
        return src.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'W';
    })();

    const acceptedCount = applications.filter(a => a.status === 'accepted').length;
    const pendingCount = applications.filter(a => a.status === 'pending').length;
    const profileIncomplete = !user.name || !user.skills?.length;

    // Average rating
    const avgRating = user.ratings?.length
        ? (user.ratings.reduce((s, r) => s + r.value, 0) / user.ratings.length).toFixed(1)
        : null;

    const tabs = [
        { key: 'jobs', label: t('worker_jobs', 'Available Jobs') },
        { key: 'applications', label: t('worker_applications', 'My Applications'), badge: pendingCount },
        { key: 'bookmarks', label: 'Saved', badge: bookmarkedJobs.length > 0 ? bookmarkedJobs.length : null },
        { key: 'history', label: 'History', badge: historyApps.length > 0 ? historyApps.length : null },
    ];

    const displayJobs = activeTab === 'bookmarks' ? bookmarkedJobs : jobs;

    return (
        <div className="min-h-screen bg-slate-50 font-sans relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-20 bg-emerald-300 animate-float" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-15 bg-green-200 animate-float" style={{ animationDelay: '2s' }} />
            </div>

            <Navbar />
            <Toaster position="top-center" />
            <Confetti trigger={showCelebration} />

            <div className="pt-24 pb-12 px-4 max-w-5xl mx-auto">
                {/* Profile Completion Banner */}
                {profileIncomplete && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                                <User size={18} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="font-bold text-amber-800 text-sm">Complete your profile</p>
                                <p className="text-amber-600 text-xs">Add your name and skills to get discovered by employers</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/profile-setup')}
                            className="px-4 py-2 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition"
                        >
                            Setup →
                        </button>
                    </motion.div>
                )}

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-200">
                            {initials}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-0.5">{getGreeting()} 👋</p>
                            <h1 className="text-2xl font-bold text-slate-900">{user.name || 'Worker'}</h1>
                            {user.skills?.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                    {user.skills.slice(0, 3).map(s => (
                                        <span key={s} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">{s}</span>
                                    ))}
                                </div>
                            )}
                            {avgRating && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <StarDisplay value={parseFloat(avgRating)} />
                                    <span className="text-xs font-bold text-amber-600">{avgRating} ({user.ratings.length} rating{user.ratings.length !== 1 ? 's' : ''})</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {acceptedCount > 0 && (
                            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <Star size={14} className="text-emerald-600 fill-emerald-500" />
                                <span className="text-xs font-bold text-emerald-700">{acceptedCount} Hired</span>
                            </div>
                        )}
                        <button onClick={() => navigate('/profile-setup')} title="Edit Profile" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-brand-500 hover:border-brand-200 transition shadow-sm">
                            <User size={18} />
                        </button>
                        <button onClick={onLogout} title="Logout" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition shadow-sm">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <GlassCard className="!p-1 !rounded-2xl flex gap-1 bg-white/50 backdrop-blur-md border-white/40 mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </GlassCard>

                {/* Jobs / Bookmarks: Search + Filters */}
                {(activeTab === 'jobs' || activeTab === 'bookmarks') && (
                    <div className="mb-5 space-y-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={t('search_placeholder', 'Search jobs...')}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition text-slate-900 font-medium"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowFilters(f => !f)}
                                className={`px-4 py-3 rounded-xl border font-bold text-sm flex items-center gap-2 transition ${showFilters ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400'}`}
                            >
                                <Filter size={16} />
                                <span className="hidden sm:inline">Filters</span>
                            </button>
                            <button
                                onClick={fetchJobs}
                                title="Refresh"
                                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-emerald-600 hover:border-emerald-300 transition"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <GlassCard className="p-4 space-y-4 bg-white/80">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Category</p>
                                            <div className="flex flex-wrap gap-2">
                                                {CATEGORIES.map(cat => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => setCategoryFilter(cat)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${categoryFilter === cat ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Daily Wage (₹)</p>
                                            <div className="flex gap-3 items-center">
                                                <input type="number" placeholder="Min" value={minWage} onChange={e => setMinWage(e.target.value)} className="w-28 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500" />
                                                <span className="text-slate-400">—</span>
                                                <input type="number" placeholder="Max" value={maxWage} onChange={e => setMaxWage(e.target.value)} className="w-28 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500" />
                                                <button onClick={fetchJobs} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition">Apply</button>
                                                <button onClick={() => { setMinWage(''); setMaxWage(''); setCategoryFilter('All'); fetchJobs(); }} className="text-slate-500 text-sm hover:text-slate-800 underline">Reset</button>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'applications' ? (
                        <motion.div key="apps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {loading ? (
                                <div className="space-y-4">{[...Array(3)].map((_, i) => <SkeletonLoader key={i} className="h-28 w-full rounded-2xl" />)}</div>
                            ) : applications.length === 0 ? (
                                <div className="text-center py-20 bg-white/50 rounded-3xl border border-white/40">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Briefcase size={32} className="text-slate-400" /></div>
                                    <p className="text-slate-500 font-medium text-lg">No applications yet.</p>
                                    <button onClick={() => setActiveTab('jobs')} className="mt-4 px-6 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition border border-emerald-100">Browse Jobs</button>
                                </div>
                            ) : (
                                <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                                    {applications.map(app => (
                                        <motion.div key={app._id} variants={item}>
                                            <GlassCard className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-all duration-200 p-5">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-slate-900 text-lg">{app.job?.title}</h3>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium">
                                                        <span className="flex items-center gap-1"><MapPin size={13} /> {app.job?.location?.city || 'India'}</span>
                                                        <span>₹{app.job?.wage}/day</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-2">Applied: {new Date(app.createdAt).toLocaleDateString('en-IN')}</p>
                                                </div>
                                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${app.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' : app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : app.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                    {app.status === 'accepted' ? <CheckCircle size={16} /> : app.status === 'rejected' ? <XCircle size={16} /> : app.status === 'completed' ? <Trophy size={16} /> : <Clock size={16} />}
                                                    <span className="capitalize">{app.status}</span>
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>

                    ) : activeTab === 'history' ? (
                        /* ─── History Tab ─── */
                        <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <h2 className="text-xl font-bold mb-5 text-slate-800 flex items-center gap-2">
                                <History size={20} className="text-emerald-600" /> Completed Jobs
                            </h2>
                            {loading ? (
                                <div className="space-y-4">{[...Array(3)].map((_, i) => <SkeletonLoader key={i} className="h-28 w-full rounded-2xl" />)}</div>
                            ) : historyApps.length === 0 ? (
                                <div className="text-center py-20 bg-white/50 rounded-3xl border border-white/40">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trophy size={32} className="text-slate-400" /></div>
                                    <p className="text-slate-500 font-medium text-lg">No completed jobs yet.</p>
                                    <p className="text-slate-400 text-sm mt-1">Your completed jobs will appear here.</p>
                                </div>
                            ) : (
                                <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                                    {historyApps.map(app => {
                                        const rating = app.job?.employer?._id && user.ratings?.find(r => r.from?.toString() === app.job?.employer?._id?.toString());
                                        return (
                                            <motion.div key={app._id} variants={item}>
                                                <GlassCard className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-900 text-lg">{app.job?.title}</h3>
                                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium flex-wrap">
                                                            <span>Employer: {app.job?.employer?.companyName || app.job?.employer?.name || '—'}</span>
                                                            <span>₹{app.job?.wage}/day</span>
                                                            <span>{app.job?.category}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 mt-1.5">
                                                            Completed: {app.completedAt ? new Date(app.completedAt).toLocaleDateString('en-IN') : '—'}
                                                        </p>
                                                        {rating && (
                                                            <div className="flex items-center gap-1.5 mt-2">
                                                                <StarDisplay value={rating.value} />
                                                                <span className="text-xs text-amber-600 font-bold">{rating.value}/5</span>
                                                                {rating.comment && <span className="text-xs text-slate-500 italic">"{rating.comment}"</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-blue-700">
                                                        <CheckCircle size={16} /> Completed
                                                    </div>
                                                </GlassCard>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </motion.div>

                    ) : (
                        /* ─── Jobs / Bookmarks Grid ─── */
                        <motion.div key="jobs-or-bookmarks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {loading ? (
                                <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 md:grid-cols-2">
                                    {[...Array(4)].map((_, i) => <SkeletonLoader key={i} className="h-52 w-full rounded-2xl" />)}
                                </motion.div>
                            ) : displayJobs.length === 0 ? (
                                <div className="text-center py-20 bg-white/50 rounded-3xl border border-white/40">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        {activeTab === 'bookmarks' ? <Bookmark size={32} className="text-slate-400" /> : <Briefcase size={32} className="text-slate-400" />}
                                    </div>
                                    <p className="text-slate-500 font-medium text-lg">
                                        {activeTab === 'bookmarks' ? 'No saved jobs yet.' : 'No jobs found nearby.'}
                                    </p>
                                    {activeTab === 'bookmarks' && (
                                        <button onClick={() => setActiveTab('jobs')} className="mt-4 px-6 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm border border-emerald-100">Browse Jobs</button>
                                    )}
                                </div>
                            ) : (
                                <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 md:grid-cols-2">
                                    {displayJobs.map(job => (
                                        <motion.div key={job._id} variants={item}>
                                            <GlassCard className="h-full flex flex-col hover:shadow-xl hover:border-emerald-300/50 transition-all duration-300 group p-5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1 pr-2">
                                                        <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-emerald-700 transition">{job.title}</h3>
                                                        <p className="text-sm text-slate-500 mt-0.5 font-medium">{job.employer?.companyName || job.employer?.name || 'Employer'}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="font-bold text-emerald-600 text-lg">₹{job.wage}</div>
                                                        <div className="text-xs text-slate-400 font-medium">/day</div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold border border-emerald-100">
                                                        <CheckCircle size={11} /> {job.category}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-100">
                                                        <Clock size={11} /> {job.duration}
                                                    </span>
                                                    {job.location?.city && (
                                                        <span className="flex items-center gap-1 text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-100">
                                                            <MapPin size={11} /> {job.location.city}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-auto flex gap-2 pt-4 border-t border-slate-100">
                                                    {job.hasApplied ? (
                                                        <div className="flex-1 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center justify-center gap-2">
                                                            <CheckCircle size={16} /> Applied ✓
                                                        </div>
                                                    ) : (
                                                        <GradientButton
                                                            onClick={() => handleApply(job._id)}
                                                            className="flex-1 !py-2.5 !text-sm !from-emerald-600 !to-green-700"
                                                        >
                                                            Apply Now
                                                        </GradientButton>
                                                    )}
                                                    <button
                                                        onClick={() => handleBookmark(job._id)}
                                                        title={job.isBookmarked ? 'Remove bookmark' : 'Save job'}
                                                        className={`w-11 h-11 rounded-xl border flex items-center justify-center transition ${job.isBookmarked ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' : 'bg-white border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-300'}`}
                                                    >
                                                        {job.isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                                                    </button>
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default WorkerDashboard;
