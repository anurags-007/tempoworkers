import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { toast, Toaster } from 'react-hot-toast';
import { ArrowLeft, Smartphone, ShieldCheck, Loader2, Send, LogIn, Lock, UserPlus, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';
import Logo from '../components/Logo';

const Login = ({ setUser }) => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const initialRole = searchParams.get('role') || 'worker';
    const [role, setRole] = useState(initialRole);
    const navigate = useNavigate();

    // Default auth modes based on role
    const isWorker = role === 'worker';
    const [authMode, setAuthMode] = useState(initialRole === 'worker' ? 'otp' : 'password');

    // OTP Auth State
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('identifier'); // 'identifier' | 'otp'
    const [timer, setTimer] = useState(0);

    // Password Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    // ===== Worker Flow (OTP) =====
    const handleSendOtp = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        const isMobile = /^[6-9]\d{9}$/.test(identifier);

        if (!isEmail && !isMobile) {
            toast.error(t('login.error_identifier', 'Please enter a valid 10-digit mobile number or email address'));
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/send-otp', { identifier });
            
            // Handle Fallback message dynamically
            if (res.data.fallbackTriggered) {
                toast(res.data.message, { icon: '🔄', duration: 6000 });
                setIdentifier(res.data.fallbackIdentifier);
            } else {
                toast.success(res.data.message || t('login.otp_sent', 'OTP Sent successfully!'), { icon: '📩' });
            }

            setStep('otp');
            setTimer(30);
            setOtp('');
        } catch (error) {
            toast.error(error.response?.data?.message || t('login.error_send_otp', 'Error sending OTP'));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 4) {
            toast.error(t('login.error_otp_length', 'Please enter a valid 4-digit OTP'));
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { identifier, otp, role });
            finishLogin(res.data.user, res.data.token);
        } catch (error) {
            toast.error(error.response?.data?.message || t('login.error_invalid_otp', 'Invalid OTP'));
        } finally {
            setLoading(false);
        }
    };

    // ===== Employer Flow (Email/Password) =====
    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please enter Email and Password');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/login-password', { email, password });
            finishLogin(res.data.user, res.data.token);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please enter Email and Password');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/register', { email, password, role });
            toast.success('Registration Successful! Logging you in...');
            finishLogin(res.data.user, res.data.token);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration Failed');
        } finally {
            setLoading(false);
        }
    };

    const finishLogin = (user, token) => {
        localStorage.setItem('user', JSON.stringify(user));
        if (token) localStorage.setItem('token', token);
        setUser(user);
        toast.success(t('login.success', 'Login Successful!'), { icon: '🚀' });
        setTimeout(() => {
            if (!user.name) {
                navigate('/profile-setup');
            } else {
                navigate(`/${user.role}-dashboard`);
            }
        }, 1000);
    };


    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-1000 relative overflow-hidden ${isWorker ? 'bg-green-50/30' : 'bg-blue-50/30'}`}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className={`absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full blur-[100px] opacity-30 animate-float ${isWorker ? 'bg-green-300/30' : 'bg-blue-300/30'}`} />
                <div className={`absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full blur-[100px] opacity-30 animate-float ${isWorker ? 'bg-emerald-300/30' : 'bg-indigo-300/30'}`} style={{ animationDelay: '2s' }} />
            </div>

            <Toaster position="top-center" />

            <div className="w-full max-w-md relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigate('/')} className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium group text-sm">
                        <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition" /> {t('back_home', 'Back')}
                    </button>
                    <Link to="/"><Logo className="text-xl" /></Link>
                </div>

                <GlassCard className="!p-0 overflow-hidden border-white/60 shadow-2xl relative">
                    <div className={`p-6 ${isWorker ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-brand-500 to-brand-700'} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-white/10 pattern-dots" />
                        <h2 className="text-2xl font-bold text-white mb-4 relative z-10 text-center">
                            {isWorker ? t('login_worker_portal', 'Worker Area') : t('login_employer_portal', 'Employer Area')}
                        </h2>

                        <div className="flex bg-black/20 p-1 rounded-xl relative z-10 mb-4">
                            <button
                                onClick={() => { setRole('worker'); setAuthMode('otp'); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${role === 'worker' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}
                            >
                                I am a Worker
                            </button>
                            <button
                                onClick={() => { setRole('employer'); setAuthMode('password'); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${role === 'employer' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}
                            >
                                I am an Employer
                            </button>
                        </div>

                        <div className="flex bg-black/20 p-1 rounded-xl relative z-10">
                            <button
                                onClick={() => setAuthMode('otp')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${authMode === 'otp' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}
                            >
                                <Smartphone size={14} /> OTP Login
                            </button>
                            <button
                                onClick={() => setAuthMode('password')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${authMode === 'password' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}
                            >
                                <KeyRound size={14} /> Password
                            </button>
                            <button
                                onClick={() => setAuthMode('register')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${authMode === 'register' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}
                            >
                                <UserPlus size={14} /> Register
                            </button>
                        </div>
                    </div>

                    <div className="p-8">
                        <AnimatePresence mode="wait">
                            {/* OTP Flow */}
                            {authMode === 'otp' && (
                                <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} >
                                    {step === 'identifier' ? (
                                        <form onSubmit={handleSendOtp} className="space-y-5">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Mobile or Email</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        value={identifier} 
                                                        onChange={(e) => setIdentifier(e.target.value)} 
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 font-bold text-lg outline-none transition-all" 
                                                        placeholder="99999 99999 or email@domain.com" 
                                                        autoFocus 
                                                    />
                                                </div>
                                            </div>
                                            <GradientButton type="submit" disabled={loading || identifier.length < 5} className="w-full justify-center">
                                                {loading ? <Loader2 className="animate-spin" /> : <>Get OTP <Send size={16} /></>}
                                            </GradientButton>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                                            <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enter OTP</label><button type="button" onClick={() => setStep('identifier')} className="text-xs font-bold text-brand-600 hover:underline">Change details</button></div>
                                            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 font-bold text-3xl text-center tracking-[1rem] outline-none transition-all" placeholder="••••" autoFocus />
                                            <div className="text-center text-sm font-medium">{timer > 0 ? <span className="text-slate-400">Resend in <span className="text-slate-900 font-bold">{timer}s</span></span> : <button type="button" onClick={handleSendOtp} className="text-brand-600 font-bold hover:underline">Resend OTP</button>}</div>
                                            <GradientButton type="submit" disabled={loading || otp.length < 4} className="w-full justify-center">{loading ? <Loader2 className="animate-spin" /> : <>Verify & Login <LogIn size={16} /></>}</GradientButton>
                                        </form>
                                    )}
                                </motion.div>
                            )}

                            {/* Password Login Flow */}
                            {authMode === 'password' && (
                                <motion.div key="password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} >
                                    <form onSubmit={handlePasswordLogin} className="space-y-5">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Email Address</label>
                                            <div className="relative">
                                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 font-medium outline-none transition-all" placeholder="employer@example.com" autoFocus />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Password</label>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 font-medium outline-none transition-all" placeholder="••••••••" />
                                            </div>
                                        </div>
                                        <GradientButton type="submit" disabled={loading || !password || !email} className="w-full justify-center">
                                            {loading ? <Loader2 className="animate-spin" /> : <>Login <LogIn size={16} /></>}
                                        </GradientButton>
                                    </form>
                                </motion.div>
                            )}

                            {/* Register Flow */}
                            {authMode === 'register' && (
                                <motion.div key="register" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} >
                                    <form onSubmit={handleRegister} className="space-y-5">
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                                            <ShieldCheck className="text-amber-500 shrink-0" size={18} />
                                            <p className="text-xs text-amber-800 font-medium">
                                                {isWorker ? "Create an account to browse jobs and manage your applications securely." : "Create an account to post jobs or manage applications securely."}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Email Address</label>
                                            <div className="relative">
                                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 font-medium outline-none transition-all" placeholder="user@example.com" autoFocus />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Set Password</label>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 font-medium outline-none transition-all" placeholder="••••••••" />
                                            </div>
                                        </div>
                                        <GradientButton type="submit" disabled={loading || !password || !email} className="w-full justify-center">
                                            {loading ? <Loader2 className="animate-spin" /> : <>Create Account <UserPlus size={16} /></>}
                                        </GradientButton>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </GlassCard>
                <p className="text-center mt-8 text-slate-400 text-sm font-medium">{t('login.terms', 'By continuing, you agree to our Terms & Privacy Policy.')}</p>
            </div>
        </div>
    );
};

export default Login;
