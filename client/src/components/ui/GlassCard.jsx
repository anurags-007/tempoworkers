import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '', hoverEffect = true }) => {
    return (
        <motion.div
            whileHover={hoverEffect ? { y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" } : {}}
            className={`glass rounded-2xl p-6 transition-all duration-300 ${className}`}
        >
            {children}
        </motion.div>
    );
};

export default GlassCard;
