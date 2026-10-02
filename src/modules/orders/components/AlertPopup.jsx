import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const AlertPopup = () => {
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await api.get('/api/alerts/my-alerts');
                if (res.data && res.data.length > 0) {
                    setAlert(res.data[0]);
                }
            } catch (e) {
                console.error('Failed to fetch alerts', e);
            }
        };

        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleDismiss = async () => {
        if (!alert) return;
        try {
            await api.put(`/api/alerts/${alert.id}/read`);
            setAlert(null);
            // Wait a moment and check for next alert
            setTimeout(async () => {
                const res = await api.get('/api/alerts/my-alerts');
                if (res.data && res.data.length > 0) {
                    setAlert(res.data[0]);
                }
            }, 1000);
        } catch (e) {
            console.error('Failed to mark read', e);
        }
    };

    if (!alert) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '440px', padding: '32px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                    🔔
                </div>
                <h2 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1.5rem', fontWeight: '800' }}>Important Announcement</h2>
                <p style={{ margin: '0 0 28px 0', color: '#475569', fontSize: '1.05rem', lineHeight: '1.5' }}>
                    {alert.message}
                </p>
                <button 
                    onClick={handleDismiss}
                    style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
                >
                    Got it!
                </button>
            </div>
        </div>
    );
};

export default AlertPopup;

