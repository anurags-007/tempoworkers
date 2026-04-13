import React, { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'react-hot-toast';
import { Bell, BellOff, Loader2 } from 'lucide-react';

const VAPID_PUBLIC_KEY = 'BN6U3IRO2wgadwq-NKLsPksx-Yd_fTeRtbukB412n95jXntXgEPqt7Y5RAdIkvWYAGs8QPHKr7iFzCcSVrYpgYo';

const PushNotificationManager = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [supported, setSupported] = useState(true);

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setSupported(false);
            return;
        }

        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (e) {
            console.error('Check subscription error:', e);
        }
    };

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribe = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Notification permission denied');
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            await api.post('/push/subscribe', subscription);
            
            setIsSubscribed(true);
            toast.success('Notifications enabled! 🔔');
        } catch (error) {
            console.error('Push subscription error:', error);
            toast.error('Failed to enable notifications');
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                await subscription.unsubscribe();
                await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
            }

            setIsSubscribed(false);
            toast.success('Notifications disabled');
        } catch (error) {
            console.error('Unsubscribe error:', error);
            toast.error('Failed to disable notifications');
        } finally {
            setLoading(false);
        }
    };

    if (!supported) return null;

    return (
        <button
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={loading}
            className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold ${
                isSubscribed 
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
            }`}
        >
            {loading ? (
                <Loader2 size={18} className="animate-spin" />
            ) : isSubscribed ? (
                <><BellOff size={18} /> Disable Notifications</>
            ) : (
                <><Bell size={18} /> Enable Notifications</>
            )}
        </button>
    );
};

export default PushNotificationManager;
