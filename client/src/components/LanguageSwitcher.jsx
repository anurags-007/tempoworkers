import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
];

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        setIsOpen(false);
    };

    const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/90 transition text-sm font-medium text-slate-700 group"
            >
                <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 group-hover:bg-brand-100 transition">
                    <Globe size={14} />
                </div>
                <span className="hidden md:inline">{currentLang.name}</span>
                <span className="md:hidden">{currentLang.code.toUpperCase()}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 glass rounded-2xl overflow-hidden py-2"
                    >
                        <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Select Language
                        </div>
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-brand-50 transition relative ${i18n.language === lang.code ? 'text-brand-700 font-bold bg-brand-50/50' : 'text-slate-600'
                                    }`}
                            >
                                <span className="text-xl filter drop-shadow-sm">{lang.flag}</span>
                                {lang.name}
                                {i18n.language === lang.code && (
                                    <motion.div
                                        layoutId="activeLang"
                                        className="absolute left-0 w-1 h-full bg-brand-500 rounded-r-full"
                                    />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LanguageSwitcher;
