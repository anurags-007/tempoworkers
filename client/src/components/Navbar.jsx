import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, LogIn, LayoutDashboard } from 'lucide-react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import GradientButton from './ui/GradientButton';
import PushNotificationManager from './PushNotificationManager';

const Navbar = () => {
    const { t } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const location = useLocation();

    // Read auth state from localStorage
    useEffect(() => {
        const readUser = () => {
            try {
                const stored = localStorage.getItem('user');
                setUser(stored ? JSON.parse(stored) : null);
            } catch {
                setUser(null);
            }
        };
        readUser();
        // Re-sync whenever the route changes (e.g. after login)
    }, [location.pathname]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: t('nav_how_it_works'), path: '/how-it-works' },
        { name: t('nav_employer'), path: '/login?role=employer' },
        { name: t('nav_worker'), path: '/login?role=worker' },
    ];

    const dashboardPath = user?.role === 'employer' 
        ? '/employer-dashboard' 
        : user?.role === 'admin' 
            ? '/admin' 
            : '/worker-dashboard';

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass py-3' : 'bg-transparent py-5'}`}>
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <Link to="/" className="hover:opacity-80 transition">
                    <Logo className="text-slate-900" />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className="text-sm font-medium text-slate-600 hover:text-brand-600 transition tracking-wide"
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
                    <PushNotificationManager />
                    <LanguageSwitcher />

                    {/* Show Dashboard button if logged in, else Sign In */}
                    {user ? (
                        <Link to={dashboardPath}>
                            <GradientButton className="!px-6 !py-2 !text-sm !shadow-lg" icon={LayoutDashboard}>
                                Dashboard
                            </GradientButton>
                        </Link>
                    ) : (
                        <Link to="/login">
                            <GradientButton className="!px-6 !py-2 !text-sm !shadow-lg" icon={LogIn}>
                                {t('sign_in')}
                            </GradientButton>
                        </Link>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-slate-700"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Nav */}
            {isOpen && (
                <div className="mobile-nav fixed inset-0 top-[70px] bg-white z-40 p-6 flex flex-col gap-6 md:hidden animate-fade-in">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className="text-xl font-bold text-slate-800"
                            onClick={() => setIsOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="h-px bg-slate-100 w-full my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Language</span>
                        <LanguageSwitcher />
                    </div>

                    {/* Mobile: Dashboard or Sign In */}
                    {user ? (
                        <Link to={dashboardPath} onClick={() => setIsOpen(false)}>
                            <GradientButton fullWidth icon={LayoutDashboard}>
                                Dashboard
                            </GradientButton>
                        </Link>
                    ) : (
                        <Link to="/login" onClick={() => setIsOpen(false)}>
                            <GradientButton fullWidth>
                                {t('sign_in')}
                            </GradientButton>
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
