import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import UserOrderTracking from './UserOrderTracking';

const UserProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ text: '', type: '' });
    const [showOrders, setShowOrders] = useState(false);

    // Modal states
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);

    // Cart states - persisted in localStorage
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('userProductCart');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [showCart, setShowCart] = useState(false);

    const [orderType, setOrderType] = useState('Single'); // 'Single' or 'Subscription'
    const [form, setForm] = useState({
        quantity: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        customerName: '',
        phone: '',
        address: '',
        pincode: '',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Persist cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('userProductCart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/api/products/active');
            setProducts(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching products", error);
            setLoading(false);
        }
    };

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: '', type: '' }), 4000);
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === product.id);
            if (existing) {
                return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        showToast('Added to Cart!');
    };

    const updateCartQty = (id, delta) => {
        setCart(prev => prev.map(p => {
            if (p.id === id) {
                const newQty = Math.max(1, p.quantity + delta);
                return { ...p, quantity: newQty };
            }
            return p;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(p => p.id !== id));
    };

    const openCheckoutModal = (type) => {
        setOrderType(type);
        setForm({
            ...form,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        });
        setSelectedProduct(true); // using this as a boolean to show checkout modal
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return;
        setSubmitting(true);
        try {
            for (const item of cart) {
                if (orderType === 'Single') {
                    await api.post('/api/milk-module/trial/submit-request', {
                        customerName: form.customerName,
                        phone: form.phone,
                        address: form.address,
                        pincode: form.pincode,
                        milkType: item.name,
                        productId: item.id,
                        dailyQuantity: parseFloat(item.quantity),
                        startDate: form.startDate,
                        endDate: form.startDate,
                        notes: form.notes
                    });
                } else {
                    await api.post('/api/milk-module/subscription/submit-request', {
                        customerName: form.customerName,
                        phone: form.phone,
                        address: form.address,
                        pincode: form.pincode,
                        milkType: item.name,
                        productId: item.id,
                        dailyQuantity: parseFloat(item.quantity),
                        startDate: form.startDate,
                        endDate: form.endDate,
                        notes: form.notes
                    });
                }
            }
            showToast(orderType === 'Single' ? 'Order placed successfully!' : 'Subscription requested!');
            setCart([]);
            setShowCart(false);
            setSelectedProduct(null);
            // Show the orders tracking page
            setTimeout(() => setShowOrders(true), 1200);
        } catch (error) {
            console.error(error);
            showToast('Failed to place order', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (showOrders) {
        return <UserOrderTracking onBack={() => setShowOrders(false)} />;
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
            {toast.text && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', padding: '16px 24px', borderRadius: '12px', zIndex: 9999, fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    {toast.text}
                </div>
            )}

            <div style={{ marginBottom: '32px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '24px', borderRadius: '20px', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', position: 'relative' }}>
                <h1 style={{ margin: '0 0 12px 0', fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.025em', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Farm Fresh Products
                </h1>
                <p style={{ margin: 0, fontSize: '1rem', color: '#94a3b8', maxWidth: '600px' }}>
                    Pure, natural, and delivered directly to your doorstep. Choose from our curated selection of premium dairy products.
                </p>
                <button onClick={() => setShowOrders(true)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📦 My Orders
                </button>
            </div>

            {cart.length > 0 && !showCart && (
                <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 900 }}>
                    <button onClick={() => { setShowCart(true); setViewingProduct(null); }} style={{ padding: '16px 32px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '30px', fontWeight: '800', fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(59,130,246,0.5)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        🛒 View Cart ({cart.length})
                    </button>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥛</div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No Products Available</h3>
                    <p style={{ margin: 0, color: '#64748b' }}>Check back later for fresh supplies!</p>
                </div>
            ) : showCart ? (
                <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px', marginBottom: '24px' }}>
                        <h2 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>Your Cart</h2>
                        <button onClick={() => setShowCart(false)} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>← Back to Shop</button>
                    </div>
                    {cart.length === 0 ? (
                        <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#64748b', padding: '40px 0' }}>Your cart is empty.</p>
                    ) : (
                        <>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                                        <th style={{ padding: '16px', textAlign: 'left' }}>Product</th>
                                        <th style={{ padding: '16px', textAlign: 'center' }}>Price</th>
                                        <th style={{ padding: '16px', textAlign: 'center' }}>Quantity</th>
                                        <th style={{ padding: '16px', textAlign: 'right' }}>Total</th>
                                        <th style={{ padding: '16px', textAlign: 'right' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }} />
                                                ) : <span style={{ fontSize: '40px' }}>🥛</span>}
                                                <div>
                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#0f172a' }}>{item.name}</h4>
                                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.size} {item.unit}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#3b82f6' }}>₹{item.price}</td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                                                    <button onClick={() => updateCartQty(item.id, -1)} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                                    <span style={{ padding: '0 16px', fontWeight: '600' }}>{item.quantity}</span>
                                                    <button onClick={() => updateCartQty(item.id, 1)} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }}>₹{item.price * item.quantity}</td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <button onClick={() => removeFromCart(item.id)} style={{ padding: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setShowCart(false); openCheckoutModal('Single'); }} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    Buy Single Day
                                </button>
                                <button onClick={() => { setShowCart(false); openCheckoutModal('Subscription'); }} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    Subscribe for Month
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ) : viewingProduct ? (
                <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                        <button onClick={() => setViewingProduct(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: '600', fontSize: '1rem' }}>
                            <span style={{ marginRight: '8px', fontSize: '1.2rem' }}>←</span> Back to Products
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
                        <div style={{ flex: 1, padding: '40px', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {viewingProduct.image ? (
                                <img src={viewingProduct.image} alt={viewingProduct.name} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '16px', mixBlendMode: 'multiply' }} />
                            ) : (
                                <span style={{ fontSize: '120px' }}>🥛</span>
                            )}
                        </div>
                        <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800', color: '#0f172a' }}>{viewingProduct.name}</h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#3b82f6' }}>₹{viewingProduct.price}</span>
                                <span style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px', fontWeight: '700', color: '#64748b' }}>{viewingProduct.size} {viewingProduct.unit}</span>
                            </div>
                            <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#475569', marginBottom: '40px' }}>
                                {viewingProduct.description || "No description provided for this product."}
                            </p>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button onClick={() => addToCart(viewingProduct)} style={{ flex: 1, padding: '16px', background: '#f1f5f9', color: '#0f172a', border: '2px solid #e2e8f0', borderRadius: '12px', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                    onMouseEnter={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    onMouseLeave={(e) => e.target.style.borderColor = '#e2e8f0'}>
                                    Add to Cart
                                </button>
                                <button onClick={() => { addToCart(viewingProduct); setViewingProduct(null); setShowCart(false); openCheckoutModal('Single'); }} style={{ flex: 1, padding: '16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', transition: 'background 0.2s ease', boxShadow: '0 10px 15px -3px rgba(15,23,42,0.3)' }}
                                    onMouseEnter={(e) => e.target.style.background = '#1e293b'}
                                    onMouseLeave={(e) => e.target.style.background = '#0f172a'}>
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : !selectedProduct ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                    {products.map(p => (
                        <div key={p.id} style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)', transition: 'transform 0.3s ease, box-shadow 0.3s ease', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)'; }}>
                            <div style={{ position: 'relative', height: '130px', background: p.image ? `url(${p.image}) center/contain no-repeat #ffffff` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                {!p.image && <span style={{ fontSize: '36px', color: '#94a3b8' }}>🥛</span>}
                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '12px', fontWeight: '800', color: '#0f172a', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    ₹{p.price}
                                </div>
                            </div>
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>{p.name}</h3>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '3px 6px', borderRadius: '6px' }}>{p.size} {p.unit}</span>
                                </div>
                                <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {p.description || "Fresh and natural farm product."}
                                </p>
                                <button onClick={() => setViewingProduct(p)} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s ease' }}
                                    onMouseEnter={(e) => e.target.style.background = '#1e293b'}
                                    onMouseLeave={(e) => e.target.style.background = '#0f172a'}>
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px', marginBottom: '24px' }}>
                        <h2 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>Complete Your Order</h2>
                        <button onClick={() => setSelectedProduct(null)} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', gap: '40px' }}>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#0f172a' }}>Order Summary</h3>
                            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <p style={{ margin: '0 0 16px 0', color: '#64748b', fontWeight: '500' }}>{cart.length} item(s) in order</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #cbd5e1' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>Total (Per Day)</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3b82f6' }}>₹{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '800', color: orderType === 'Single' ? '#0f172a' : '#3b82f6' }}>
                                        {orderType === 'Single' ? '✓ Single Day Order' : '✓ Monthly Subscription'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginTop: '24px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Estimated Total Payment</span>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', marginTop: '8px' }}>
                                    ₹{orderType === 'Single'
                                        ? cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
                                        : (cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * (((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1)).toFixed(2)
                                    }
                                </div>
                            </div>
                        </div>

                        <div style={{ flex: 1.5 }}>
                            <form id="orderForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Your Name</label>
                                        <input type="text" required value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Phone Number</label>
                                        <input type="text" required minLength="10" maxLength="10" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Delivery Address</label>
                                    <textarea required rows="2" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', transition: 'border-color 0.2s', resize: 'none' }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'}></textarea>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Pincode</label>
                                        <input type="text" required minLength="6" maxLength="6" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                                    </div>
                                    <div></div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>{orderType === 'Single' ? 'Delivery Date' : 'Start Date'}</label>
                                        <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                                    </div>
                                    {orderType === 'Subscription' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>End Date</label>
                                            <input type="date" required min={form.startDate} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Special Notes</label>
                                    <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Leave at front door" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#f8fafc', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                                </div>

                                <button type="submit" disabled={submitting} style={{ marginTop: '10px', width: '100%', padding: '18px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1.2rem', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s, opacity 0.2s', opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }} onMouseEnter={e => !submitting && (e.target.style.background = '#059669')} onMouseLeave={e => !submitting && (e.target.style.background = '#10b981')}>
                                    {submitting ? 'Processing...' : 'Confirm Order'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProducts;
