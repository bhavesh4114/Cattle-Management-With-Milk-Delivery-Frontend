import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';
import DeliveryAssignmentPanel from '../subscriptions/DeliveryAssignmentPanel';

const MilkTrialsAdmin = () => {
    const [trials, setTrials] = useState([]);
    const [pricing, setPricing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewModal, setViewModal] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ text: '', type: '' });
    const [deliveryBoys, setDeliveryBoys] = useState([]);

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: '', type: '' }), 4000);
    };

    useEffect(() => {
        fetchTrials();
        fetchDeliveryBoys();
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/api/products/active');
            setPricing(res.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    const fetchDeliveryBoys = async () => {
        try {
            const res = await api.get('/api/milk-module/delivery-boys');
            setDeliveryBoys(res.data);
        } catch (error) {
            console.error("Error fetching delivery boys:", error);
        }
    };

    const fetchTrials = async () => {
        try {
            const res = await api.get('/api/milk-module/trial/all-trials');
            setTrials(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching trials:", error);
            setLoading(false);
        }
    };

    const handleAssignDelivery = async (trialId, boyId) => {
        try {
            await api.post(`/api/milk-module/assign-delivery/trial/${trialId}`, { deliveryBoyId: boyId });
            showToast("Delivery Boy Assigned!", "success");
            fetchTrials();
            setViewModal({ ...viewModal, data: { ...viewModal.data, deliveryBoyId: boyId, deliveryStatus: 'Assigned' } });
        } catch (error) {
            showToast("Failed to assign delivery boy", "error");
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/api/milk-module/trial/${id}/status`, { 
                status,
                startDate: status === 'ACTIVE' ? new Date() : undefined,
                endDate: status === 'ACTIVE' ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) : undefined // 2 days from now
            });
            showToast(`Trial ${status}`);
            fetchTrials();
        } catch (error) {
            console.error(error);
            showToast("Failed to update status", "error");
        }
    };

    const getUnit = (item) => {
        if (item?.product?.unit) return item.product.unit;
        const milkType = item?.milkType || item;
        const p = pricing.find(x => (x.name === milkType) || (x.milkType === milkType));
        if (p && p.unit) return p.unit;
        if (milkType && (milkType.toLowerCase().includes('milk') || milkType.toLowerCase().includes('chaas'))) return 'L';
        return 'Qty';
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading trials...</div>;

    return (
        <div style={{ background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
            {toast.text && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, fontWeight: 'bold' }}>
                    {toast.text}
                </div>
            )}
            <h3 style={{ fontSize: "1.5rem", color: "#1e293b", marginBottom: "20px" }}>Trial / One-time Requests</h3>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ background: '#eff6ff', color: '#1e3a8a', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Customer</th>
                            <th style={{ padding: '12px' }}>Product Type</th>
                            <th style={{ padding: '12px' }}>Quantity</th>
                            <th style={{ padding: '12px' }}>Trial Dates</th>
                            <th style={{ padding: '12px' }}>Status</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trials.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No trial requests found.</td></tr> : trials.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px' }}>
                                    <strong>{t.customerName}</strong><br/>
                                    <span style={{ color: '#64748b' }}>{t.phone}</span>
                                </td>
                                <td style={{ padding: '12px' }}>{t.milkType}</td>
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>{t.dailyQuantity} {getUnit(t)}/day</td>
                                <td style={{ padding: '12px', color: '#475569' }}>
                                    {t.startDate ? `${new Date(t.startDate).toLocaleDateString('en-GB')} to ${new Date(t.endDate).toLocaleDateString('en-GB')}` : 'Not started'}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                        background: t.status === 'PENDING_ADMIN' ? '#fef3c7' : t.status === 'ACTIVE' ? '#dbeafe' : t.status === 'REJECTED' ? '#fee2e2' : '#dcfce3',
                                        color: t.status === 'PENDING_ADMIN' ? '#d97706' : t.status === 'ACTIVE' ? '#1d4ed8' : t.status === 'REJECTED' ? '#b91c1c' : '#166534'
                                    }}>
                                        {t.status.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td style={{ padding: '12px' }}>
                                    {(t.status === 'PENDING_ADMIN' || t.status.toUpperCase().includes('PENDING')) && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => updateStatus(t.id, 'ACTIVE')} style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Activate Trial</button>
                                            <button onClick={() => updateStatus(t.id, 'REJECTED')} style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Reject</button>
                                        </div>
                                    )}
                                    {t.status === 'ACTIVE' && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => updateStatus(t.id, 'COMPLETED')} style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Mark Completed</button>
                                        </div>
                                    )}
                                    <div style={{ marginTop: '8px' }}>
                                        <button onClick={() => setViewModal({ isOpen: true, data: t })} style={{ padding: '4px 8px', background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                            View Details
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* View Details Modal */}
            {viewModal.isOpen && viewModal.data && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ background: '#f8fafc', padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 'bold' }}>Customer Trial Details</h3>
                            <button onClick={() => setViewModal({ isOpen: false, data: null })} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Trial Status</div>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block',
                                        background: viewModal.data.status === 'ACTIVE' ? '#dcfce3' : viewModal.data.status === 'PENDING_ADMIN' ? '#fef3c7' : '#fee2e2',
                                        color: viewModal.data.status === 'ACTIVE' ? '#166534' : viewModal.data.status === 'PENDING_ADMIN' ? '#d97706' : '#b91c1c'
                                    }}>
                                        {viewModal.data.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>

                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                                        <strong style={{ color: '#475569' }}>Name:</strong> <span style={{ color: '#0f172a', fontWeight: '500' }}>{viewModal.data.customerName || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                                        <strong style={{ color: '#475569' }}>Phone:</strong> <span style={{ color: '#0f172a', fontWeight: '500' }}>{viewModal.data.phone}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                                        <strong style={{ color: '#475569' }}>Address:</strong> <span style={{ color: '#0f172a', fontWeight: '500' }}>{viewModal.data.address}</span>
                                    </div>
                                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                                        <strong style={{ color: '#475569' }}>Product:</strong> <span style={{ color: '#0f172a', fontWeight: '500' }}>{viewModal.data.milkType}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                                        <strong style={{ color: '#475569' }}>Quantity:</strong> <span style={{ color: '#0f172a', fontWeight: '500' }}>{viewModal.data.dailyQuantity} {getUnit(viewModal.data.milkType)}/day</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                                        <strong style={{ color: '#475569' }}>Dates:</strong> 
                                        <span style={{ color: '#0f172a', fontWeight: '500' }}>
                                            {viewModal.data.startDate ? `${new Date(viewModal.data.startDate).toLocaleDateString('en-GB')} to ${new Date(viewModal.data.endDate).toLocaleDateString('en-GB')}` : 'Not started'}
                                        </span>
                                    </div>
                                    {viewModal.data.notes && (
                                        <>
                                            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                                                <strong style={{ color: '#475569' }}>Notes:</strong> <span style={{ color: '#0f172a', fontStyle: 'italic' }}>{viewModal.data.notes}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ background: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setViewModal({ isOpen: false, data: null })} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MilkTrialsAdmin;
