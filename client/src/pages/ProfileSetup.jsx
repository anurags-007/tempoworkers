import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { User, Briefcase, MapPin, Star, Plus, X, CheckCircle, ArrowRight } from 'lucide-react';
import api from '../api';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';
import Logo from '../components/Logo';

const SKILLS = ['Mason', 'Plumber', 'Electrician', 'Laborer', 'Carpenter', 'Painter', 'Welder', 'Helper', 'Driver', 'Cook'];
const CITIES = ['New Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'];

const CITY_COORDS = {
    'New Delhi': [77.2090, 28.6139], 'Mumbai': [72.8777, 19.0760],
    'Bangalore': [77.5946, 12.9716], 'Chennai': [80.2707, 13.0827],
    'Hyderabad': [78.4867, 17.3850], 'Kolkata': [88.3639, 22.5726],
    'Pune': [73.8567, 18.5204], 'Ahmedabad': [72.5714, 23.0225],
    'Jaipur': [75.7873, 26.9124], 'Surat': [72.8311, 21.1702],
};

const ProfileSetup = ({ user, onSave }) => {
    const isWorker = user?.role === 'worker';
    const [form, setForm] = useState({
        name: user?.name || '',
        city: user?.location?.city || 'New Delhi',
        skills: user?.skills || [],
        baseRate: user?.baseRate || '',
        companyName: user?.companyName || '',
    });
    const [loading, setLoading] = useState(false);

    const toggleSkill = (skill) => {
        setForm(prev => ({
            ...prev,
            skills: prev.skills.includes(skill)
                ? prev.skills.filter(s => s !== skill)
                : [...prev.skills, skill]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Please enter your name');
            return;
        }
        if (isWorker && form.skills.length === 0) {
            toast.error('Please select at least one skill');
            return;
        }

        setLoading(true);
        try {
            const coords = CITY_COORDS[form.city] || [77.2090, 28.6139];
            const payload = {
                name: form.name.trim(),
                location: {
                    type: 'Point',
                    coordinates: coords,
                    city: form.city,
                },
                ...(isWorker ? {
                    skills: form.skills,
                    baseRate: parseFloat(form.baseRate) || 0,
                } : {
                    companyName: form.companyName.trim(),
                })
            };

            const res = await api.put('/auth/profile', payload);
            const updatedUser = res.data.user;

            // Merge updated fields into user
            const merged = { ...user, ...updatedUser };
            localStorage.setItem('user', JSON.stringify(merged));
            toast.success('Profile saved! Welcome 🎉');
            setTimeout(() => onSave(merged), 800);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden ${isWorker ? 'bg-emerald-50/40' : 'bg-blue-50/40'}`}>
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className={`absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-30 ${isWorker ? 'bg-emerald-300' : 'bg-blue-300'}`} />
                <div className={`absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-25 ${isWorker ? 'bg-green-200' : 'bg-indigo-200'}`} />
            </div>

            <Toaster position="top-center" />

            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <Logo className="text-2xl mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Complete Your Profile</h1>
                    <p className="text-slate-500">Just a few details to get you started</p>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <GlassCard className="p-8 shadow-2xl border-white/60">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                                    <User size={12} /> Your Full Name
                                </label>
                                <input
                                    type="text"
                                    placeholder={isWorker ? 'e.g. Ramesh Kumar' : 'e.g. Sunil Mehta'}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition font-medium text-slate-900"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Employer: Company Name */}
                            {!isWorker && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                                        <Briefcase size={12} /> Company Name <span className="text-slate-400 normal-case font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Mehta Construction Pvt. Ltd."
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition font-medium text-slate-900"
                                        value={form.companyName}
                                        onChange={e => setForm({ ...form, companyName: e.target.value })}
                                    />
                                </div>
                            )}

                            {/* City */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={12} /> Your City
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition appearance-none font-medium text-slate-900"
                                        value={form.city}
                                        onChange={e => setForm({ ...form, city: e.target.value })}
                                    >
                                        {CITIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</span>
                                </div>
                            </div>

                            {/* Worker: Skills */}
                            {isWorker && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-1">
                                        <Star size={12} /> Your Skills <span className="text-red-400">*</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {SKILLS.map(skill => {
                                            const selected = form.skills.includes(skill);
                                            return (
                                                <button
                                                    key={skill}
                                                    type="button"
                                                    onClick={() => toggleSkill(skill)}
                                                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${selected ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-200' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-600'}`}
                                                >
                                                    {selected ? <CheckCircle size={13} className="inline mr-1 mb-0.5" /> : <Plus size={13} className="inline mr-1 mb-0.5" />}
                                                    {skill}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Worker: Base Rate */}
                            {isWorker && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                        Daily Rate (₹) <span className="text-slate-400 normal-case font-normal">(optional)</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                        <input
                                            type="number"
                                            placeholder="500"
                                            min="100"
                                            className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition font-medium text-slate-900"
                                            value={form.baseRate}
                                            onChange={e => setForm({ ...form, baseRate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <GradientButton
                                type="submit"
                                fullWidth
                                disabled={loading}
                                className="!py-4 !text-base !shadow-xl"
                            >
                                {loading ? 'Saving...' : (
                                    <span className="flex items-center justify-center gap-2">
                                        Save & Continue <ArrowRight size={18} />
                                    </span>
                                )}
                            </GradientButton>
                        </form>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    );
};

export default ProfileSetup;
