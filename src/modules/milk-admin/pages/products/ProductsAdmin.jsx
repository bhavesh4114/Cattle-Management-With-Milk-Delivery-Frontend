import React, { useState, useEffect } from 'react';
import api from '../../../../services/api';

const ProductsAdmin = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', image: '', price: '', description: '', size: '', unit: 'L', isActive: true });
    const [toast, setToast] = useState({ text: '', type: '' });
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Custom Units state
    const [availableUnits, setAvailableUnits] = useState(['L', 'ML', 'KG', 'G', 'Packet']);
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check if file is larger than 2MB
            if (file.size > 2 * 1024 * 1024) {
                showToast("File size cannot exceed 2MB", "error");
                e.target.value = ""; // Reset input
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    setForm({ ...form, image: compressedBase64 });
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: '', type: '' }), 4000);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/api/products');
            setProducts(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching products:", error);
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/api/products/${editingId}`, form);
                showToast('Product updated successfully');
            } else {
                await api.post('/api/products', form);
                showToast('Product created successfully');
            }
            setForm({ name: '', image: '', price: '', description: '', size: '', unit: 'L', isActive: true });
            setEditingId(null);
            setIsModalOpen(false);
            fetchProducts();
        } catch (error) {
            console.error(error);
            showToast('Failed to save product', 'error');
        }
    };

    const handleEdit = (product) => {
        setForm({
            name: product.name,
            image: product.image || '',
            price: product.price,
            description: product.description || '',
            size: product.size || '',
            unit: product.unit || 'L',
            isActive: product.isActive
        });
        setEditingId(product.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await api.delete(`/api/products/${id}`);
            showToast('Product deleted successfully');
            fetchProducts();
        } catch (error) {
            console.error(error);
            showToast('Failed to delete product', 'error');
        }
    };

    return (
        <div style={{ background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
            {toast.text && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, fontWeight: 'bold' }}>
                    {toast.text}
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: "1.5rem", color: "#1e293b", margin: 0 }}>Products Management</h3>
                <button 
                    onClick={() => { 
                        setEditingId(null); 
                        setForm({ name: '', image: '', price: '', description: '', size: '', unit: 'L', isActive: true }); 
                        setIsModalOpen(true); 
                    }} 
                    style={{ background: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                    + Add New Product
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '12px' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Image</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Name</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Size</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Price</th>
                                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Status</th>
                                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No products found</td></tr>
                            ) : (
                                products.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px' }}>
                                            {p.image ? <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} /> : <div style={{ width: '40px', height: '40px', background: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>No Img</div>}
                                        </td>
                                        <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{p.name}</td>
                                        <td style={{ padding: '12px', color: '#64748b' }}>{p.size} {p.unit}</td>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#16a34a' }}>₹{p.price}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: p.isActive ? '#dcfce7' : '#fee2e2', color: p.isActive ? '#166534' : '#b91c1c' }}>
                                                {p.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button onClick={() => handleEdit(p)} style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Edit</button>
                                                <button onClick={() => handleDelete(p.id)} style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            <h4 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>{editingId ? 'Edit Product' : 'Add New Product'}</h4>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Product Name *</label>
                                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Cow Milk" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Product Image</label>
                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }} />
                                {form.image && (
                                    <div style={{ marginTop: '10px' }}>
                                        <img src={form.image} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Size / Quantity</label>
                                    <input type="text" value={form.size} onChange={e => setForm({...form, size: e.target.value})} placeholder="e.g. 1" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', margin: 0 }}>Unit</label>
                                        <button 
                                            type="button"
                                            onClick={() => setIsUnitModalOpen(true)}
                                            style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                                        >
                                            + Add Qty
                                        </button>
                                    </div>
                                    <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                        {availableUnits.map((u, i) => <option key={i} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Price (₹) *</label>
                                <input type="number" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="e.g. 60" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Description</label>
                                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="3" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}></textarea>
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                                    Active (Visible to users)
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{editingId ? 'Update Product' : 'Save Product'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isUnitModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1010, padding: '20px' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '350px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px' }}>Add New Unit</h4>
                        <input 
                            type="text" 
                            value={newUnitName}
                            onChange={(e) => setNewUnitName(e.target.value)}
                            placeholder="e.g. Box, Dozen"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => { setIsUnitModalOpen(false); setNewUnitName(''); }} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button type="button" onClick={() => {
                                if (newUnitName.trim()) {
                                    setAvailableUnits([...availableUnits, newUnitName.trim()]);
                                    setForm({ ...form, unit: newUnitName.trim() });
                                    setNewUnitName('');
                                    setIsUnitModalOpen(false);
                                }
                            }} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsAdmin;
