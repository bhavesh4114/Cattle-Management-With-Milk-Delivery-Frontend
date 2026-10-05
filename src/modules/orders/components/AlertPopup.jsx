import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const AlertPopup = () => {
    const [alert, setAlert] = useState(null);
    const [working, setWorking] = useState(false);

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

    const handleDeliveryAction = async (action) => {
        if (!alert) return;
        setWorking(true);
        try {
            if (action === 'confirm') {
                await api.post(`/api/delivery/${alert.orderId}/confirm`, { orderType: alert.orderType });
            } else {
                await api.post(`/api/delivery/${alert.orderId}/report-issue`, {
                    orderType: alert.orderType,
                    issue: 'Customer reported an issue from the delivery confirmation popup.'
                });
            }
            await api.put(`/api/alerts/${alert.id}/read`);
            setAlert(null);
        } catch (e) {
            console.error('Delivery confirmation failed', e);
        } finally {
            setWorking(false);
        }
    };

    if (!alert) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '440px', padding: '32px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                    🔔
                </div>
                <h2 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1.5rem', fontWeight: '800' }}>
                    {alert.type === 'DELIVERY_CONFIRMATION' ? 'Delivery Confirmation' : 'Important Announcement'}
                </h2>
                <p style={{ margin: '0 0 28px 0', color: '#475569', fontSize: '1.05rem', lineHeight: '1.5' }}>
                    {alert.message}
                </p>
                {alert.type === 'DELIVERY_CONFIRMATION' ? (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => handleDeliveryAction('issue')}
                            disabled={working}
                            style={{ flex: 1, padding: '14px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: working ? 'not-allowed' : 'pointer' }}
                        >
                            Report Issue
                        </button>
                        <button
                            onClick={() => handleDeliveryAction('confirm')}
                            disabled={working}
                            style={{ flex: 1, padding: '14px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: working ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
                        >
                            Confirm Delivery
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={handleDismiss}
                        style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
                    >
                        Got it!
                    </button>
                )}
            </div>
        </div>
    );
};

export default AlertPopup;

