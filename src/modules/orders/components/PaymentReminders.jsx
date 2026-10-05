import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const PaymentReminders = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [message, setMessage] = useState('Your payment is pending. Please complete your payment to confirm your order.');
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState({ text: '', type: '' });

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: '', type: '' }), 4000);
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/alerts/pending-payments');
            setUsers(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUsers(users.map(u => u.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (id) => {
        if (selectedUsers.includes(id)) {
            setSelectedUsers(selectedUsers.filter(u => u !== id));
        } else {
            setSelectedUsers([...selectedUsers, id]);
        }
    };

    const handleSendAlerts = async () => {
        if (selectedUsers.length === 0) {
            showToast('Please select at least one user', 'error');
            return;
        }
        setSending(true);
        try {
            await api.post('/alerts/send', {
                userIds: selectedUsers,
                message: message
            });
            showToast(`Alert sent to ${selectedUsers.length} user(s) successfully!`);
            setSelectedUsers([]);
            fetchUsers();
        } catch (e) {
            console.error(e);
            showToast(e.response?.data?.details || 'Failed to send alerts', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
            {toast.text && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', padding: '16px 24px', borderRadius: '12px', zIndex: 9999, fontWeight: 'bold' }}>
                    {toast.text}
                </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔔 Payment Reminders
                </h2>
                <div style={{ background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {users.length} Pending Payments
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
            ) : users.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                    No users with pending payments.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                            onClick={(e) => handleSelectAll({ target: { checked: selectedUsers.length !== users.length } })}
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}
                        >
                            {selectedUsers.length === users.length && users.length > 0 ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f1f5f9' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', width: '40px' }}></th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600', fontSize: '0.9rem' }}>Customer</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600', fontSize: '0.9rem' }}>Phone</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600', fontSize: '0.9rem' }}>Pending Orders</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600', fontSize: '0.9rem', textAlign: 'right' }}>Pending Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => handleSelectUser(user.id)}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>{user.name}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{user.phone}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{user.orderCount}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#ef4444', textAlign: 'right' }}>Rs. {user.pendingAmount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>Announcement Message</label>
                            <textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'transparent', fontSize: '0.9rem' }}>.</label>
                            <button 
                                onClick={handleSendAlerts}
                                disabled={sending || selectedUsers.length === 0}
                                style={{ width: '100%', padding: '12px', background: selectedUsers.length === 0 ? '#cbd5e1' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer', transition: 'background 0.2s', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>✉️</span>
                                {sending ? 'Sending...' : `Send Alert (${selectedUsers.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentReminders;
