import React, { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { useWindowSize } from 'react-use'; // Optional, but usually good for confetti. 
// Actually, react-confetti handles window resize automatically if width/height not provided, 
// but it's better to provide it to avoid scrollbar issues.
// Let's implement a simple version that covers the screen.

const Confetti = ({ trigger }) => {
    const [show, setShow] = useState(false);
    const [recycle, setRecycle] = useState(true);

    useEffect(() => {
        if (trigger) {
            setShow(true);
            setRecycle(true);
            // Stop recycling after 5 seconds, keep falling until gone
            setTimeout(() => {
                setRecycle(false);
            }, 5000);
            // Remove component after 10 seconds
            setTimeout(() => {
                setShow(false);
            }, 8000);
        }
    }, [trigger]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100]">
            <ReactConfetti
                width={window.innerWidth}
                height={window.innerHeight}
                recycle={recycle}
                numberOfPieces={200}
                gravity={0.2}
            />
        </div>
    );
};

export default Confetti;
