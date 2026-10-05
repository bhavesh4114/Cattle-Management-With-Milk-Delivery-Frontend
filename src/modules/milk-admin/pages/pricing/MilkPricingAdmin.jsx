import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';

const MilkPricingAdmin = () => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ milkType: 'Cow Milk', pricePerLitre: '' });
    const [toast, setToast] = useState({ text: '', type: '' });

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: '', type: '' }), 4000);
    };

    useEffect(() => {
        fetchPrices();
    }, []);

    const fetchPrices = async () => {
        try {
            const res = await api.get('/milk-module/pricing/price-list');
            setPrices(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching prices:", error);
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/milk-module/pricing/update', {
                milkType: form.milkType,
                pricePerLitre: parseFloat(form.pricePerLitre)
            });
            showToast('Price updated successfully');
            setForm({ milkType: 'Cow Milk', pricePerLitre: '' });
            fetchPrices();
        } catch (error) {
            console.error(error);
            showToast('Failed to update price', 'error');
        }
    };

    return (
        <div style={{ background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowX: "auto" }}>
            {toast.text && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, fontWeight: 'bold' }}>
                    {toast.text}
                </div>
            )}
            <h3 style={{ fontSize: "1.5rem", color: "#1e293b", marginBottom: "20px" }}>Milk Pricing Management</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '30px', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', boxSizing: 'border-box', width: '100%' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#334155' }}>Update Rate</h4>
                    <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ boxSizing: 'border-box', width: '100%' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>Milk Type</label>
                            <select value={form.milkType} onChange={e => setForm({...form, milkType: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                <option>Cow Milk</option>
                                <option>Buffalo Milk</option>
                            </select>
                        </div>
                        <div style={{ boxSizing: 'border-box', width: '100%' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>Price per Litre (₹)</label>
                            <input type="number" required value={form.pricePerLitre} onChange={e => setForm({...form, pricePerLitre: e.target.value})} placeholder="e.g. 60" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <button type="submit" style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Update Price</button>
                    </form>
                </div>

                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', boxSizing: 'border-box', width: '100%' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#334155' }}>Current Rates</h4>
                    {loading ? <p>Loading...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {prices.length === 0 ? (
                                <div style={{ padding: '10px', textAlign: 'center', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>No prices configured yet.</div>
                            ) : prices.map(p => (
                                <div key={p.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Milk Type</span>
                                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.milkType}</span>
                                    </div>
                                    <div style={{ borderBottom: '1px dashed #e2e8f0' }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Rate</span>
                                        <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '16px' }}>₹{p.pricePerLitre}/L</span>
                                    </div>
                                    <div style={{ borderBottom: '1px dashed #e2e8f0' }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Updated</span>
                                        <span style={{ color: '#334155' }}>{new Date(p.effectiveDate).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MilkPricingAdmin;
