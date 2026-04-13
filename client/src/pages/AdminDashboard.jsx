import React, { useState, useEffect } from 'react';
import api from '../api';
import { toast, Toaster } from 'react-hot-toast';
import { Users, Briefcase, FileText, Trash2, ShieldAlert, BarChart3, Loader2, Search } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'users' | 'jobs'
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes, jobsRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users'),
                api.get('/admin/jobs')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setJobs(jobsRes.data);
        } catch (error) {
            toast.error('Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure? This will permanently delete the user.')) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            toast.success('User deleted');
            setUsers(users.filter(u => u._id !== userId));
        } catch (e) {
            toast.error('Deletion failed');
        }
    };

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Delete this job listing?')) return;
        try {
            await api.delete(`/admin/jobs/${jobId}`);
            toast.success('Job removed');
            setJobs(jobs.filter(j => j._id !== jobId));
        } catch (e) {
            toast.error('Deletion failed');
        }
    };

    const filteredUsers = users.filter(u => 
        (u.name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.mobile?.includes(searchTerm))
    );

    const filteredJobs = jobs.filter(j => 
        (j.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (j.category?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-600" size={48} />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 pt-24 text-slate-900">
            <Toaster />
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <ShieldAlert className="text-brand-600" /> Platform Admin
                        </h1>
                        <p className="text-slate-500 font-medium">Manage users, jobs, and platform health</p>
                    </div>
                    
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                        <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'stats' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Stats</button>
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'users' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Users</button>
                        <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'jobs' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Jobs</button>
                    </div>
                </div>

                {activeTab !== 'stats' && (
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name, email, or title..." 
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 outline-none transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                {/* Stats View */}
                {activeTab === 'stats' && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Users" value={stats.users.total} icon={<Users />} color="blue" />
                        <StatCard title="Workers" value={stats.users.workers} icon={<Users />} color="emerald" />
                        <StatCard title="Employers" value={stats.users.employers} icon={<Users />} color="indigo" />
                        <StatCard title="Total Jobs" value={stats.jobs.total} icon={<Briefcase />} color="amber" />
                        <StatCard title="Active Jobs" value={stats.jobs.active} icon={<FileText />} color="rose" />
                        <StatCard title="Total Apps" value={stats.applications} icon={<BarChart3 />} color="purple" />
                    </div>
                )}

                {/* Users View */}
                {activeTab === 'users' && (
                    <GlassCard className="overflow-hidden !p-0 border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">User</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Role</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{u.name || 'No Name'}</div>
                                                <div className="text-xs text-slate-500">{u.email || u.mobile}</div>
                                            </td>
                                            <td className="px-6 py-4 uppercase text-[10px] font-bold">
                                                <span className={`px-2 py-1 rounded-md ${u.role === 'worker' ? 'bg-emerald-50 text-emerald-600' : u.role === 'admin' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                {u.role !== 'admin' && (
                                                    <button onClick={() => handleDeleteUser(u._id)} className="p-2 text-slate-400 hover:text-rose-600 transition"><Trash2 size={18} /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                )}

                {/* Jobs View */}
                {activeTab === 'jobs' && (
                    <GlassCard className="overflow-hidden !p-0 border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Job Details</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Employer</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredJobs.map(j => (
                                        <tr key={j._id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{j.title}</div>
                                                <div className="text-xs text-slate-500">{j.category} • ₹{j.wage}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-700">{j.employer?.name}</div>
                                                <div className="text-xs text-slate-400">{j.employer?.email || j.employer?.mobile}</div>
                                            </td>
                                            <td className="px-6 py-4 uppercase text-[10px] font-bold">
                                                <span className={`px-2 py-1 rounded-md ${j.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    {j.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleDeleteJob(j._id)} className="p-2 text-slate-400 hover:text-rose-600 transition"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => (
    <GlassCard className={`!p-6 border-slate-100 text-slate-900`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-slate-100 text-brand-600 shadow-sm`}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
        </div>
        <div>
            <div className="text-3xl font-black mb-1">{value}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{title}</div>
        </div>
    </GlassCard>
);

export default AdminDashboard;
