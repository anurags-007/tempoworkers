import React from 'react';
import { motion } from 'framer-motion';

const GradientButton = ({ children, onClick, className = '', icon: Icon, fullWidth = false }) => {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`
                relative px-8 py-3 rounded-xl font-bold text-white shadow-premium overflow-hidden group
                bg-gradient-to-r from-brand-600 to-brand-800 hover:from-brand-500 hover:to-brand-700
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
        >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 backdrop-blur-sm" />
            <div className="relative flex items-center justify-center gap-2">
                {children}
                {Icon && <Icon size={20} />}
            </div>
        </motion.button>
    );
};

export default GradientButton;
