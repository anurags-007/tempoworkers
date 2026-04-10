import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:5000';

/**
 * useSocket — Connects to Socket.io, joins user room, shows toast on notification.
 * Also dispatches a 'tw-notification' CustomEvent on window so components can
 * reactively show notification badges without prop drilling.
 */
const useSocket = (user) => {
    const socketRef = useRef(null);

    useEffect(() => {
        if (!user?._id) return;

        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join', user._id);
        });

        socket.on('notification', (data) => {
            const { type, title, message } = data;
            const text = `${title}: ${message}`;
            if (type === 'success') {
                toast.success(text, { duration: 8000, icon: '🎉' });
            } else {
                toast(text, { duration: 6000, icon: '📋' });
            }
            // Broadcast to any listening components (e.g. EmployerDashboard badge)
            window.dispatchEvent(new CustomEvent('tw-notification', { detail: data }));
        });

        socket.on('chat_message', (msg) => {
            window.dispatchEvent(new CustomEvent('tw-chat-message', { detail: msg }));
        });

        socket.on('disconnect', () => { });

        return () => {
            socket.disconnect();
        };
    }, [user?._id]);

    return socketRef;
};

export default useSocket;

