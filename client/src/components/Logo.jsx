import React from 'react';

const Logo = ({ className = "text-brand-600" }) => {
    return (
        <div className={`flex items-center gap-2 font-display font-bold text-2xl tracking-tighter ${className}`}>
            <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-brand-600 rounded-lg rotate-3 opacity-20"></div>
                <div className="absolute inset-0 bg-brand-600 rounded-lg -rotate-3 opacity-20"></div>
                <div className="relative w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                        <path d="M12 12l4 4" />
                        <path d="M12 12v-8" />
                    </svg>
                </div>
            </div>
            <span>Tempo<span className="text-brand-600">Workers</span></span>
        </div>
    );
};

export default Logo;
