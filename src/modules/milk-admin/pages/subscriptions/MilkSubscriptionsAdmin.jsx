import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../../../services/api';
import RescheduleDeliveryModal from '../../../../components/notifications/RescheduleDeliveryModal';

const MilkSubscriptionsAdmin = () => {
    const [subs, setSubs] = useState([]);
    const [pricing, setPricing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [proposeModal, setProposeModal] = useState({ isOpen: false, ids: null, startDate: '', endDate: '' });
    const [viewModal, setViewModal] = useState({ isOpen: false, data: null });
    const [receiptModal, setReceiptModal] = useState({ isOpen: false, data: null });
    const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ text: '', type: '' });
    const [deliveryBoys, setDeliveryBoys] = useState([]);

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: '', type: '' }), 4000);
    };

    useEffect(() => {
        fetchSubs();
        fetchDeliveryBoys();
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products/active');
            setPricing(res.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    const fetchDeliveryBoys = async () => {
        try {
            const res = await api.get('/milk-module/delivery-boys');
            setDeliveryBoys(res.data);
        } catch (error) {
            console.error("Error fetching delivery boys:", error);
        }
    };

    const fetchSubs = async () => {
        try {
            const res = await api.get('/milk-module/subscription/all-subscriptions');
            setSubs(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching subscriptions:", error);
            setLoading(false);
        }
    };

    const handleAssignDelivery = async (subId, boyId) => {
        try {
            await api.post(`/milk-module/assign-delivery/sub/${subId}`, { deliveryBoyId: boyId });
            showToast("Delivery Boy Assigned!", "success");
            fetchSubs();
            setViewModal({ ...viewModal, data: { ...viewModal.data, deliveryBoyId: boyId, deliveryStatus: 'Assigned' } });
        } catch (error) {
            showToast("Failed to assign delivery boy", "error");
        }
    };

    const handleGroupAction = async (ids, action, dates = null) => {
        try {
            const payload = { action, ...(dates || {}) };
            for (let subId of ids) {
                await api.post(`/milk-module/subscription/${subId}/admin-offer`, payload);
            }
            showToast(`Subscriptions updated`);
            setProposeModal({ isOpen: false, ids: null, startDate: '', endDate: '' });
            fetchSubs();
        } catch (error) {
            console.error(error);
            showToast("Failed to update subscriptions", "error");
        }
    };

    const getUnit = (item) => {
        if (item?.product?.unit) return item.product.unit;
        const milkType = item?.milkType || item;
        const p = pricing.find(x => (x.name === milkType) || (x.milkType === milkType));
        if (p && p.unit) return p.unit;
        if (milkType && typeof milkType === 'string' && (milkType.toLowerCase().includes('milk') || milkType.toLowerCase().includes('chaas'))) return 'L';
        return 'Qty';
    };

    const calculateApproximateAmount = (item) => {
        if (item.totalAmount) return item.totalAmount;
        const p = pricing.find(x => (x.name === item.milkType) || (x.milkType === item.milkType));
        if (!p) return 0;
        const start = new Date(item.requestedStartDate);
        const end = new Date(item.requestedEndDate);
        const diffTime = Math.abs(end - start);
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return totalDays * item.dailyQuantity * (p.price || 0);
    };

    const downloadReceiptPdf = (sub) => {
        try {
            const doc = new jsPDF();
            const receiptNo = `REC-MILK-${sub.id.toString().padStart(5, '0')}`;
            const dateGenerated = new Date().toLocaleDateString('en-GB');

            // Header Banner
            doc.setFillColor(30, 58, 138); // Deep Blue #1e3a8a
            doc.rect(0, 0, 210, 30, 'F');

            // Header Title
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('FARM FRESH MILK MANAGEMENT', 14, 15);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(191, 219, 254);
            doc.text('Pure, Fresh & Organic Milk Subscription Service', 14, 23);

            // Receipt Title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text('PAYMENT RECEIPT / INVOICE', 14, 43);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Receipt #: ${receiptNo}`, 14, 50);
            doc.text(`Receipt Date: ${dateGenerated}`, 14, 56);

            // Paid Status Pill
            doc.setFillColor(220, 252, 231); // Light Green
            doc.roundedRect(138, 36, 58, 22, 3, 3, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 101, 52); // Dark Green
            doc.text('STATUS: PAID', 146, 47);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Mode: ${sub.paymentMethod || 'Online / Cash'}`, 146, 53);

            // Divider Line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.line(14, 62, 196, 62);

            // Customer Info (Left)
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Customer Details:', 14, 71);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Name: ${sub.customerName || 'N/A'}`, 14, 78);
            doc.text(`Phone: ${sub.phone || 'N/A'}`, 14, 84);
            doc.text(`Address: ${sub.address || 'N/A'}${sub.pincode ? ' - ' + sub.pincode : ''}`, 14, 90);

            // Subscription Period (Right)
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Subscription Schedule:', 115, 71);

            const startDate = new Date(sub.finalStartDate || sub.requestedStartDate);
            const endDate = new Date(sub.finalEndDate || sub.requestedEndDate);
            const totalDays = Math.max(1, Math.round(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Start Date: ${startDate.toLocaleDateString('en-GB')}`, 115, 78);
            doc.text(`End Date: ${endDate.toLocaleDateString('en-GB')}`, 115, 84);
            doc.text(`Duration: ${totalDays} Days (Daily Delivery)`, 115, 90);

            // Items Table
            const items = sub.items && sub.items.length > 0 ? sub.items : [sub];
            const tableRows = items.map((item, idx) => {
                const milkType = item.milkType || 'Milk';
                const unit = getUnit(item);
                const p = pricing.find(x => (x.name === milkType) || (x.milkType === milkType));
                const rate = item.pricePerLitre || (p?.price) || (item.totalAmount ? (item.totalAmount / (totalDays * item.dailyQuantity)).toFixed(2) : '-');
                const lineTotal = item.totalAmount || (p ? totalDays * item.dailyQuantity * p.price : '-');
                return [
                    (idx + 1).toString(),
                    `Fresh ${milkType}`,
                    `${item.dailyQuantity} ${unit}/day`,
                    `${totalDays} Days`,
                    rate !== '-' ? `Rs. ${rate}` : 'N/A',
                    lineTotal !== '-' ? `Rs. ${lineTotal}` : `Rs. ${sub.totalGroupAmount || 0}`
                ];
            });

            const grandTotal = sub.totalGroupAmount || sub.totalAmount || sub.estimatedGroupAmount || 0;

            autoTable(doc, {
                startY: 98,
                head: [['#', 'Product Description', 'Daily Qty', 'Total Days', 'Rate/Unit', 'Total Amount']],
                body: tableRows,
                headStyles: {
                    fillColor: [30, 58, 138],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9,
                    halign: 'left'
                },
                bodyStyles: {
                    textColor: [15, 23, 42],
                    fontSize: 9
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { cellWidth: 60 },
                    2: { halign: 'center', cellWidth: 28 },
                    3: { halign: 'center', cellWidth: 25 },
                    4: { halign: 'right', cellWidth: 28 },
                    5: { halign: 'right', cellWidth: 31 }
                },
                foot: [['', '', '', '', 'Total Paid:', `Rs. ${grandTotal}`]],
                footStyles: {
                    fillColor: [241, 245, 249],
                    textColor: [15, 23, 42],
                    fontStyle: 'bold',
                    halign: 'right',
                    fontSize: 10
                },
                theme: 'striped',
                margin: { left: 14, right: 14 }
            });

            const finalY = doc.lastAutoTable.finalY + 12;

            // Notes / Verification Box
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, finalY, 182, 28, 2, 2, 'F');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text('Payment Verification & Notes:', 18, finalY + 7);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text('Payment received and verified in full. Deliveries will be scheduled daily as per subscription.', 18, finalY + 14);
            if (sub.notes) {
                doc.text(`Special Notes: ${sub.notes}`, 18, finalY + 21);
            } else {
                doc.text(`Customer Helpline: +91 9998887771 | Email: support@milkmanagement.com`, 18, finalY + 21);
            }

            // Footer
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('Thank you for choosing Farm Fresh Milk! This is an official computer-generated receipt.', 14, pageHeight - 10);
            doc.text(`Generated on ${new Date().toLocaleString('en-GB')}`, 140, pageHeight - 10);

            const safeName = (sub.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
            doc.save(`Milk_Receipt_${safeName}_INV-${sub.id}.pdf`);
            showToast('Receipt PDF downloaded successfully!', 'success');
        } catch (err) {
            console.error('PDF generation error:', err);
            showToast('Failed to generate receipt PDF', 'error');
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading subscriptions...</div>;

    return (
        <div style={{ background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", position: 'relative' }}>
            {toast.text && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, fontWeight: 'bold' }}>
                    {toast.text}
                </div>
            )}
            <h3 style={{ fontSize: "1.5rem", color: "#1e293b", marginBottom: "20px" }}>Monthly Subscriptions</h3>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ background: '#eff6ff', color: '#1e3a8a', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Customer</th>
                            <th style={{ padding: '12px' }}>Product Info</th>
                            <th style={{ padding: '12px' }}>Requested Dates</th>
                            <th style={{ padding: '12px' }}>Agreed Details</th>
                            <th style={{ padding: '12px' }}>Sub Status</th>
                            <th style={{ padding: '12px' }}>Payment</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subs.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No subscriptions found.</td></tr> : Object.values(subs.reduce((acc, s) => {
                            const key = `${s.customerName}_${s.phone}_${s.requestedStartDate.split('T')[0]}_${s.status}_${s.paymentStatus}`;
                            if (!acc[key]) {
                                acc[key] = { ...s, items: [], ids: [], totalGroupAmount: 0, estimatedGroupAmount: 0 };
                            }
                            acc[key].items.push(s);
                            acc[key].ids.push(s.id);
                            if (s.totalAmount) acc[key].totalGroupAmount += s.totalAmount;
                            acc[key].estimatedGroupAmount += calculateApproximateAmount(s);
                            return acc;
                        }, {})).map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px' }}>
                                    <strong>{s.customerName}</strong><br />
                                    <span style={{ color: '#64748b' }}>{s.phone}</span>
                                </td>
                                <td style={{ padding: '12px' }}>
                                    {s.items.map(item => (
                                        <div key={item.id} style={{ marginBottom: '8px' }}>
                                            <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>{item.dailyQuantity} {getUnit(item)}/day</div>
                                            <div style={{ color: '#64748b', fontSize: '12px' }}>{item.milkType}</div>
                                        </div>
                                    ))}
                                </td>
                                <td style={{ padding: '12px', color: '#475569' }}>
                                    {new Date(s.requestedStartDate).toLocaleDateString('en-GB')} to {new Date(s.requestedEndDate).toLocaleDateString('en-GB')}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    {s.finalStartDate ? (
                                        <>
                                            <div style={{ fontWeight: 'bold' }}>{new Date(s.finalStartDate).toLocaleDateString('en-GB')} - {new Date(s.finalEndDate).toLocaleDateString('en-GB')}</div>
                                            <div style={{ color: '#16a34a', fontSize: '12px', fontWeight: 'bold' }}>Total: ₹{s.totalGroupAmount}</div>
                                        </>
                                    ) : '-'}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                        background: s.status === 'ACTIVE' ? '#dcfce3' : s.status === 'REJECTED' || s.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7',
                                        color: s.status === 'ACTIVE' ? '#166534' : s.status === 'REJECTED' || s.status === 'CANCELLED' ? '#b91c1c' : '#d97706'
                                    }}>
                                        {s.status === 'CANCELLED' ? '❌ CANCELLED BY USER' : s.status.replace(/_/g, ' ')}
                                    </span>
                                    {s.notes && (
                                        <div style={{ fontSize: '11px', color: s.status === 'CANCELLED' ? '#b91c1c' : '#64748b', marginTop: '4px', fontStyle: s.status === 'CANCELLED' ? 'italic' : 'normal' }}>
                                            {s.notes}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                            background: s.paymentStatus === 'PAID' ? '#dbeafe' : s.paymentStatus === 'FAILED' ? '#fee2e2' : '#f1f5f9',
                                            color: s.paymentStatus === 'PAID' ? '#1d4ed8' : s.paymentStatus === 'FAILED' ? '#b91c1c' : '#475569'
                                        }}>
                                            {s.paymentStatus.replace(/_/g, ' ')}
                                        </span>
                                        {s.paymentStatus === 'PAID' && (
                                            <button
                                                onClick={() => setReceiptModal({ isOpen: true, data: s })}
                                                title="View & Download PDF Receipt"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 9px',
                                                    borderRadius: '8px',
                                                    background: '#ecfdf5',
                                                    color: '#047857',
                                                    border: '1px solid #a7f3d0',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 1px 2px rgba(16, 185, 129, 0.1)'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >
                                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="13" width="13" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                    <polyline points="14 2 14 8 20 8"></polyline>
                                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                                    <polyline points="10 9 9 9 8 9"></polyline>
                                                </svg>
                                                Receipt
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '12px' }}>
                                    {s.status === 'CANCELLED' && (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                                            ⚠️ Cancelled by Customer
                                        </div>
                                    )}
                                    {(s.status === 'PENDING_ADMIN' || (s.status.toUpperCase().includes('PENDING') && s.status !== 'CANCELLED')) && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => handleGroupAction(s.ids, 'ACCEPT', { startDate: s.requestedStartDate, endDate: s.requestedEndDate })} style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Accept As-is</button>
                                            <button onClick={() => setProposeModal({ isOpen: true, ids: s.ids, startDate: s.requestedStartDate.split('T')[0], endDate: s.requestedEndDate.split('T')[0] })} style={{ padding: '4px 8px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Change Dates</button>
                                            <button onClick={() => handleGroupAction(s.ids, 'REJECT')} style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Reject</button>
                                        </div>
                                    )}
                                    {s.status === 'ACTIVE' && s.paymentStatus === 'CASH_PENDING' && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => handleGroupAction(s.ids, 'VERIFY_CASH')} style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Verify Cash</button>
                                            <button onClick={() => handleGroupAction(s.ids, 'REJECT')} style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Cancel Sub</button>
                                        </div>
                                    )}
                                    {s.status === 'ACTIVE' && s.paymentStatus === 'PAID' && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => handleGroupAction(s.ids, 'COMPLETED')} style={{ padding: '4px 8px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Mark Completed</button>
                                        </div>
                                    )}
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <button onClick={() => setViewModal({ isOpen: true, data: s })} style={{ padding: '4px 8px', background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => setRescheduleModal({ isOpen: true, data: s })}
                                            title="Reschedule Delivery Date"
                                            style={{
                                                padding: '4px 8px',
                                                background: '#fffbeb',
                                                color: '#b45309',
                                                border: '1px solid #fde68a',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            📅 Reschedule
                                        </button>
                                        {s.paymentStatus === 'PAID' && (
                                            <button onClick={() => downloadReceiptPdf(s)} title="Download PDF Receipt" style={{ padding: '4px 8px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="7 10 12 15 17 10"></polyline>
                                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                                </svg>
                                                PDF Receipt
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {proposeModal.isOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                    <div style={{ background: "white", padding: "24px", borderRadius: "12px", width: "400px" }}>
                        <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Propose New Dates</h3>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Start Date</label>
                        <input type="date" value={proposeModal.startDate} onChange={e => setProposeModal({ ...proposeModal, startDate: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #cbd5e1" }} />

                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>End Date</label>
                        <input type="date" value={proposeModal.endDate} min={proposeModal.startDate} onChange={e => setProposeModal({ ...proposeModal, endDate: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #cbd5e1" }} />

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                            <button onClick={() => setProposeModal({ isOpen: false, ids: null, startDate: '', endDate: '' })} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "bold" }}>Cancel</button>
                            <button onClick={() => handleGroupAction(proposeModal.ids, 'PROPOSE', { startDate: proposeModal.startDate, endDate: proposeModal.endDate })} style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#f59e0b", color: "white", cursor: "pointer", fontWeight: "bold" }}>Propose to Customer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {viewModal.isOpen && viewModal.data && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ background: '#f8fafc', padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 'bold' }}>Customer Order Details</h3>
                            <button onClick={() => setViewModal({ isOpen: false, data: null })} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Subscription Status</div>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block',
                                        background: viewModal.data.status === 'ACTIVE' ? '#dcfce3' : viewModal.data.status === 'PENDING_ADMIN' ? '#fef3c7' : '#fee2e2',
                                        color: viewModal.data.status === 'ACTIVE' ? '#166534' : viewModal.data.status === 'PENDING_ADMIN' ? '#d97706' : '#b91c1c'
                                    }}>
                                        {viewModal.data.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Payment Status</div>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block',
                                        background: viewModal.data.paymentStatus === 'PAID' ? '#dcfce3' : viewModal.data.paymentStatus === 'CASH_PENDING' || viewModal.data.paymentStatus === 'AWAITING_PAYMENT' ? '#dbeafe' : '#f1f5f9',
                                        color: viewModal.data.paymentStatus === 'PAID' ? '#166534' : viewModal.data.paymentStatus === 'CASH_PENDING' || viewModal.data.paymentStatus === 'AWAITING_PAYMENT' ? '#1d4ed8' : '#475569'
                                    }}>
                                        {viewModal.data.paymentStatus ? viewModal.data.paymentStatus.replace(/_/g, ' ') : 'N/A'}
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
                                        <strong style={{ color: '#475569' }}>Products:</strong>
                                        <div style={{ color: '#0f172a', fontWeight: '500' }}>
                                            {viewModal.data.items && viewModal.data.items.map(i => (
                                                <div key={i.id}>{i.dailyQuantity} {getUnit(i.milkType)}/day {i.milkType}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                                        <strong style={{ color: '#475569' }}>Total Amount:</strong> <span style={{ color: '#0f172a', fontWeight: 'bold' }}>₹{viewModal.data.totalGroupAmount || viewModal.data.estimatedGroupAmount || '0'} {viewModal.data.status === 'PENDING_ADMIN' ? '(Est.)' : ''}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                                        <strong style={{ color: '#475569' }}>Dates:</strong>
                                        <span style={{ color: '#0f172a', fontWeight: '500' }}>
                                            {new Date(viewModal.data.requestedStartDate).toLocaleDateString('en-GB')} to {new Date(viewModal.data.requestedEndDate).toLocaleDateString('en-GB')}
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
                                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px' }}>
                                        <strong style={{ color: '#475569', marginBottom: '8px' }}>Order QR Code</strong>
                                        <div style={{ padding: '12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                                            <QRCodeSVG
                                                value={`Customer: ${viewModal.data.customerName}\nPhone: ${viewModal.data.phone}\nAddress: ${viewModal.data.address}\nItems: ${viewModal.data.items?.map(i => `${i.dailyQuantity} ${i.milkType}`).join(', ')}\nTotal: Rs ${viewModal.data.totalGroupAmount || viewModal.data.estimatedGroupAmount || 0}`}
                                                size={220}
                                                level="L"
                                            />
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Scan for delivery confirmation</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {viewModal.data.paymentStatus === 'PAID' ? (
                                <button
                                    onClick={() => downloadReceiptPdf(viewModal.data)}
                                    style={{
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        border: '1px solid #a7f3d0',
                                        padding: '10px 18px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="15" width="15" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    Download PDF Receipt
                                </button>
                            ) : <div></div>}
                            <button onClick={() => setViewModal({ isOpen: false, data: null })} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Receipt Modal */}
            {receiptModal.isOpen && receiptModal.data && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, backdropFilter: 'blur(4px)', padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '560px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
                        {/* Header */}
                        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: 'white', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Payment Receipt / Invoice</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#bfdbfe' }}>Receipt #: REC-MILK-{receiptModal.data.id.toString().padStart(5, '0')}</p>
                            </div>
                            <button onClick={() => setReceiptModal({ isOpen: false, data: null })} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Status Banner */}
                            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '11px', color: '#047857', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Status</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', background: '#10b981', color: 'white' }}>PAID</span>
                                        <span style={{ fontSize: '12px', color: '#065f46', fontWeight: '600' }}>Mode: {receiptModal.data.paymentMethod || 'Online / Cash'}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '11px', color: '#047857', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total Paid</span>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#065f46' }}>
                                        ₹{receiptModal.data.totalGroupAmount || receiptModal.data.totalAmount || receiptModal.data.estimatedGroupAmount || 0}
                                    </div>
                                </div>
                            </div>

                            {/* Customer & Period Details */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                    <strong style={{ color: '#475569' }}>Customer:</strong>
                                    <span style={{ color: '#0f172a', fontWeight: '600' }}>{receiptModal.data.customerName || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                    <strong style={{ color: '#475569' }}>Mobile:</strong>
                                    <span style={{ color: '#0f172a' }}>{receiptModal.data.phone || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                    <strong style={{ color: '#475569' }}>Address:</strong>
                                    <span style={{ color: '#0f172a' }}>{receiptModal.data.address || 'N/A'}{receiptModal.data.pincode ? ` - ${receiptModal.data.pincode}` : ''}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                    <strong style={{ color: '#475569' }}>Period:</strong>
                                    <span style={{ color: '#0f172a', fontWeight: '600' }}>
                                        {new Date(receiptModal.data.finalStartDate || receiptModal.data.requestedStartDate).toLocaleDateString('en-GB')} to {new Date(receiptModal.data.finalEndDate || receiptModal.data.requestedEndDate).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div>
                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items Summary</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                    <thead>
                                        <tr style={{ background: '#eff6ff', color: '#1e3a8a', textAlign: 'left' }}>
                                            <th style={{ padding: '10px 12px' }}>Product</th>
                                            <th style={{ padding: '10px 12px' }}>Daily Qty</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(receiptModal.data.items && receiptModal.data.items.length > 0 ? receiptModal.data.items : [receiptModal.data]).map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>Fresh {item.milkType}</td>
                                                <td style={{ padding: '10px 12px', color: '#2563eb', fontWeight: '700' }}>{item.dailyQuantity} {getUnit(item)}/day</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>₹{item.totalAmount || '0'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ background: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                onClick={() => setReceiptModal({ isOpen: false, data: null })}
                                style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                            >
                                Close
                            </button>
                            <button
                                onClick={() => downloadReceiptPdf(receiptModal.data)}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 22px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Download PDF Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule Delivery Date Modal */}
            <RescheduleDeliveryModal
                isOpen={rescheduleModal.isOpen}
                delivery={rescheduleModal.data}
                onClose={() => setRescheduleModal({ isOpen: false, data: null })}
                onRescheduled={() => {
                    showToast('Delivery Date Rescheduled & Notifications Sent!');
                    fetchSubs();
                }}
            />
        </div>
    );
};

export default MilkSubscriptionsAdmin;
