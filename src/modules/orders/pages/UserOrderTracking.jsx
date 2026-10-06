import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AlertPopup from '../components/AlertPopup';
import NotificationCenter from '../../../components/notifications/NotificationCenter';
import SpecialAlertsBanner from '../../../components/notifications/SpecialAlertsBanner';


const STATUS_COLORS = {
  PENDING_ADMIN: { bg: '#fef3c7', color: '#92400e', label: 'Pending Admin' },
  AWAITING_CUSTOMER: { bg: '#ede9fe', color: '#5b21b6', label: 'Admin Changed Dates' },
  AWAITING_PAYMENT: { bg: '#dbeafe', color: '#1e40af', label: 'Awaiting Payment' },
  ACTIVE: { bg: '#dcfce7', color: '#166534', label: 'Active' },
  COMPLETED: { bg: '#f1f5f9', color: '#475569', label: 'Completed' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  REJECTED: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
};

const UserOrderTracking = ({ onBack }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [trials, setTrials] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ text: '', type: '' });
  const [payModal, setPayModal] = useState({ open: false, id: null, amount: 0 });
  const [payMethod, setPayMethod] = useState('ONLINE');
  const [paying, setPaying] = useState(false);
  const [trackModal, setTrackModal] = useState({ open: false, data: null, loading: false });
  const [doorQr, setDoorQr] = useState({ loading: true, token: "", user: null });

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 4000);
  };

  const fetchOrders = async () => {
    try {
      const [priceRes, subRes, trialRes] = await Promise.all([
        api.get('/products/active').catch(() => ({ data: [] })),
        api.get('/milk-module/subscription/my-subscriptions').catch(() => ({ data: [] })),
        api.get('/milk-module/trial/my-trials').catch(() => ({ data: [] }))
      ]);
      setPricing(priceRes.data);
      setSubscriptions(subRes.data);
      setTrials(trialRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDoorQr();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDoorQr = async () => {
    try {
      const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
      if (!adminData.id) return setDoorQr({ loading: false, token: "", user: null });
      const res = await api.get(`/users/${adminData.id}/qr`);
      setDoorQr({ loading: false, token: res.data.qrToken, user: res.data.user });
    } catch (e) {
      console.error(e);
      setDoorQr({ loading: false, token: "", user: null });
    }
  };

  const printDoorQr = () => {
    if (!doorQr.token) return;
    const customerName = doorQr.user?.name || 'Customer';
    const html = `
      <html>
        <head>
          <title>Delivery QR</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; padding: 40px; }
            .qr-card { width: 360px; border: 2px solid #111827; padding: 28px; text-align: center; }
            h1 { margin: 0 0 18px; font-size: 26px; letter-spacing: 1px; }
            p { margin: 12px 0 0; color: #374151; font-size: 15px; }
            .name { margin-top: 18px; font-weight: 700; color: #111827; }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <h1>DELIVERY QR</h1>
            <div id="qr">${document.getElementById('door-qr-print-source')?.innerHTML || ''}</div>
            <p>Scan this QR for delivery</p>
            <div class="name">Customer: ${customerName}</div>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>`;
    const printWindow = window.open('', '_blank', 'width=480,height=640');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const copyDoorQrToken = async () => {
    if (!doorQr.token) return;
    try {
      await navigator.clipboard.writeText(doorQr.token);
      showToast('Delivery token copied.');
    } catch {
      showToast('Token copy failed. Select and copy it manually.', 'error');
    }
  };

  const respondToOffer = async (ids, decision) => {
    try {
      const idList = Array.isArray(ids) ? ids : [ids];
      for (let id of idList) {
        await api.post(`/milk-module/subscription/${id}/user-respond`, { decision });
      }
      showToast(decision === 'ACCEPT' ? 'Date change accepted!' : 'Order cancelled.');
      fetchOrders();
    } catch (e) {
      console.error(e);
      showToast('Failed to respond', 'error');
    }
  };

  const submitPayment = async () => {
    setPaying(true);
    try {
      const idList = Array.isArray(payModal.ids) ? payModal.ids : [payModal.id];
      for (let id of idList) {
        await api.post(`/milk-module/subscription/${id}/pay`, { method: payMethod });
        if (payMethod === 'ONLINE') {
          await api.post('/milk-module/subscription/verify-payment', {
            subscriptionId: id,
            transactionId: 'TXN' + Date.now(),
            status: 'SUCCESS'
          });
        }
      }
      showToast(payMethod === 'ONLINE' ? 'Online payment successful!' : 'Cash payment recorded!');
      setPayModal({ open: false, id: null, ids: [], amount: 0 });
      fetchOrders();
    } catch (e) {
      console.error(e);
      showToast('Payment failed', 'error');
    } finally {
      setPaying(false);
    }
  };

  const calcEstimatedTotal = (order) => {
    if (order.totalAmount) return order.totalAmount;
    const priceEntry = pricing.find(p => (p.milkType === order.milkType) || (p.name === order.milkType));
    const rate = order.pricePerLitre || (priceEntry ? (priceEntry.pricePerLitre || priceEntry.price) : 0);
    const start = new Date(order.requestedStartDate || order.startDate);
    const end = new Date(order.requestedEndDate || order.endDate);
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const qty = parseFloat(order.dailyQuantity) || 0;
    return (rate * qty * days).toFixed(0);
  };

  const getUnit = (item) => {
    if (item?.product?.unit) return item.product.unit;
    const milkType = item?.milkType || item;
    const p = pricing.find(x => (x.name === milkType) || (x.milkType === milkType));
    if (p && p.unit) return p.unit;
    if (milkType && (milkType.toLowerCase().includes('milk') || milkType.toLowerCase().includes('chaas'))) return 'L';
    return 'Qty';
  };



  const openTrackOrder = async (id, orderCategory) => {
    setTrackModal({ open: true, data: null, loading: true });
    try {
      const res = await api.get(`/delivery/track?orderType=${orderCategory}&orderId=${id}`);
      setTrackModal({ open: true, data: res.data, loading: false });
    } catch (e) {
      console.error(e);
      setTrackModal({ open: false, data: null, loading: false });
      showToast('Failed to load tracking info', 'error');
    }
  };

  const downloadBill = (group) => {
    const doc = new jsPDF();
    const invoiceNo = `INV-${group.id.toString().substring(0, 6).toUpperCase()}`;
    const dateGenerated = new Date().toLocaleDateString('en-GB');
    
    // We assume all items in a group share the same start/end dates.
    const firstItem = group.items[0] || group;
    const start = new Date(firstItem.finalStartDate || firstItem.requestedStartDate || firstItem.startDate);
    const end = new Date(firstItem.finalEndDate || firstItem.requestedEndDate || firstItem.endDate);
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    doc.setFontSize(20); doc.setTextColor(22, 101, 52);
    doc.text('Farm Fresh Milk Invoice', 14, 22);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Invoice #: ${invoiceNo}`, 14, 30);
    doc.text(`Date Generated: ${dateGenerated}`, 14, 35);
    doc.setFontSize(12); doc.setTextColor(15, 23, 42);
    doc.text('Billed To:', 14, 45);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Name: ${group.customerName || 'Customer'}`, 14, 52);
    doc.text(`Phone: ${group.phone || 'N/A'}`, 14, 58);
    doc.text(`Address: ${group.address || 'N/A'}`, 14, 64);
    doc.setFontSize(12); doc.setTextColor(15, 23, 42);
    doc.text('Order Info:', 110, 45);
    doc.setFontSize(10); doc.setTextColor(22, 163, 74);
    doc.text(`Status: PAID`, 110, 52);
    doc.setTextColor(100);
    doc.text(`Period: ${start.toLocaleDateString('en-GB')} to ${end.toLocaleDateString('en-GB')}`, 110, 58);
    
    const tableBody = group.items.map(item => {
      const priceEntry = pricing.find(p => (p.milkType === item.milkType) || (p.name === item.milkType));
      const rate = item.pricePerLitre || (priceEntry ? (priceEntry.pricePerLitre || priceEntry.price) : 0);
      const unit = getUnit(item);
      const itemTotal = item.totalAmount || calcEstimatedTotal(item);
      return [`${item.orderCategory === 'trial' ? 'Single Day' : 'Monthly'} - ${item.milkType}`, `${item.dailyQuantity} ${unit}`, days, `Rs. ${rate}`, `Rs. ${itemTotal}`];
    });

    const totalAmt = group.totalGroupAmount;
    autoTable(doc, {
      startY: 75,
      head: [['Item', 'Qty/Day', 'Days', 'Rate/Unit', 'Total']],
      body: tableBody,
      headStyles: { fillColor: [220, 252, 227], textColor: [22, 101, 52] },
      foot: [['', '', '', 'Grand Total:', `Rs. ${totalAmt}`]],
      footStyles: { fillColor: [239, 246, 255], textColor: [22, 101, 52], fontStyle: 'bold' },
      theme: 'grid'
    });
    const finalY = doc.lastAutoTable.finalY || 100;
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text('Thank you for choosing Farm Fresh Milk!', 14, finalY + 20);
    doc.text('This is a computer generated invoice.', 14, finalY + 26);
    doc.save(`${invoiceNo}.pdf`);
  };


  const allOrdersList = [
    ...subscriptions.map(s => ({ ...s, orderCategory: 'subscription' })),
    ...trials.map(t => ({ ...t, orderCategory: 'trial' }))
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const calcEstimatedTotalNum = (order) => {
    if (order.totalAmount) return parseFloat(order.totalAmount);
    const priceEntry = pricing.find(p => (p.milkType === order.milkType) || (p.name === order.milkType));
    const rate = order.pricePerLitre || (priceEntry ? (priceEntry.pricePerLitre || priceEntry.price) : 0);
    const start = new Date(order.requestedStartDate || order.startDate || Date.now());
    const end = new Date(order.requestedEndDate || order.endDate || Date.now());
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const qty = parseFloat(order.dailyQuantity) || 0;
    return rate * qty * days;
  };

  const groupedOrders = Object.values(allOrdersList.reduce((acc, order) => {
    const dateField = order.requestedStartDate || order.startDate;
    const dateStr = dateField ? dateField.split('T')[0] : 'nodate';
    const key = `${dateStr}_${order.status}_${order.paymentStatus || 'NOPAY'}_${order.orderCategory}`;
    if (!acc[key]) {
        acc[key] = { 
          ...order, 
          items: [],
          ids: [], 
          totalGroupAmount: 0 
        };
    }
    acc[key].items.push(order);
    acc[key].ids.push(order.id);
    acc[key].totalGroupAmount += calcEstimatedTotalNum(order);
    return acc;
  }, {}));

  const pendingAction = groupedOrders.filter(o => o.status === 'AWAITING_CUSTOMER' || o.status === 'AWAITING_PAYMENT');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)', fontFamily: '"Inter", sans-serif' }}>
      <AlertPopup />
      {toast.text && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', padding: '16px 24px', borderRadius: '12px', zIndex: 9999, fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          {toast.text}
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '28px 32px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
            Back to Products
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>My Orders</h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Track your milk orders and deliveries</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <NotificationCenter />
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>{groupedOrders.length}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Total Orders</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <SpecialAlertsBanner userRole="USER" />
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '18px', flexWrap: 'wrap', boxShadow: '0 4px 12px rgba(15,23,42,0.06)' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.15rem' }}>Door Delivery QR</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Print this once and paste it on your door for secure delivery confirmation.</p>
            {doorQr.token && (
              <button onClick={copyDoorQrToken} style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem' }}>
                Token: {doorQr.token.slice(0, 10)}...{doorQr.token.slice(-6)}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div id="door-qr-print-source" style={{ background: 'white', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              {doorQr.token ? <QRCodeSVG value={doorQr.token} size={96} level="H" /> : <div style={{ width: 96, height: 96, display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: '12px' }}>{doorQr.loading ? 'Loading' : 'No QR'}</div>}
            </div>
            <button onClick={printDoorQr} disabled={!doorQr.token} style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: doorQr.token ? '#0f172a' : '#94a3b8', color: 'white', cursor: doorQr.token ? 'pointer' : 'not-allowed', fontWeight: 800 }}>
              Print QR
            </button>
          </div>
        </div>

        {pendingAction.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', borderRadius: '16px', padding: '20px 28px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 10px 30px rgba(124,58,237,0.3)' }}>
            <span style={{ fontSize: '2rem' }}>🔔</span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>Action Required!</div>
              <div style={{ opacity: 0.9, fontSize: '0.9rem' }}>{pendingAction.length} order(s) need your attention — review below.</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>
            <p style={{ fontSize: '1.1rem' }}>Loading your orders...</p>
          </div>
        ) : groupedOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🛒</div>
            <h2 style={{ color: '#0f172a', marginBottom: '8px' }}>No Orders Yet</h2>
            <p style={{ color: '#64748b' }}>Go back to products and place your first order!</p>
            <button onClick={onBack} style={{ marginTop: '20px', padding: '12px 32px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>Browse Products</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {groupedOrders.map(group => {
              const statusInfo = STATUS_COLORS[group.status] || { bg: '#f1f5f9', color: '#475569', label: group.status };
              const isAwaitingCustomer = group.status === 'AWAITING_CUSTOMER';
              const isAwaitingPayment = group.status === 'AWAITING_PAYMENT';
              const isRejected = group.status === 'REJECTED' || group.status === 'CANCELLED';
              const startDate = group.requestedStartDate || group.startDate;
              const endDate = group.requestedEndDate || group.endDate;

              return (
                <div key={group.id} style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: isAwaitingCustomer ? '0 0 0 2px #7c3aed, 0 10px 30px rgba(124,58,237,0.15)' : isAwaitingPayment ? '0 0 0 2px #3b82f6, 0 10px 30px rgba(59,130,246,0.15)' : '0 4px 6px -1px rgba(0,0,0,0.05)' }}>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      {group.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.3rem' }}>{group.orderCategory === 'trial' ? '⏱' : '📅'}</span>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                            {item.milkType} — {item.dailyQuantity} {getUnit(item)}/day
                          </h3>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: statusInfo.bg, color: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: group.orderCategory === 'trial' ? '#fef9c3' : '#dcfce7', color: group.orderCategory === 'trial' ? '#854d0e' : '#166534' }}>
                          {group.orderCategory === 'trial' ? 'Single Day' : 'Subscription'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {group.customerName} · {group.phone} · {group.address}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Rs. {group.totalGroupAmount}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{group.totalAmount ? 'Total Amount' : 'Est. Amount'}</div>
                    </div>
                  </div>

                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: (isAwaitingCustomer || isAwaitingPayment || isRejected) ? '20px' : '0' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>Requested Dates</div>
                        <div style={{ fontWeight: '700', color: isAwaitingCustomer ? '#94a3b8' : '#0f172a', textDecoration: isAwaitingCustomer ? 'line-through' : 'none' }}>
                          {startDate ? new Date(startDate).toLocaleDateString('en-GB') : '—'} to {endDate ? new Date(endDate).toLocaleDateString('en-GB') : '—'}
                        </div>
                      </div>
                      {isAwaitingCustomer && group.offeredStartDate && (
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#7c3aed', marginBottom: '4px', textTransform: 'uppercase' }}>Admin Proposed</div>
                          <div style={{ fontWeight: '800', color: '#7c3aed' }}>
                            {new Date(group.offeredStartDate).toLocaleDateString('en-GB')} to {new Date(group.offeredEndDate).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      )}
                      {group.paymentStatus && (
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>Payment</div>
                          <div style={{ fontWeight: '700', color: group.paymentStatus === 'PAID' ? '#16a34a' : '#f59e0b' }}>
                            {group.paymentStatus === 'PAID' ? 'PAID' : 'Pending'}
                          </div>
                        </div>
                      )}
                    </div>

                    {isAwaitingCustomer && (
                      <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: '14px', padding: '20px', border: '1px solid #c4b5fd' }}>
                        <div style={{ fontWeight: '800', color: '#5b21b6', marginBottom: '6px' }}>Admin wants to change your delivery dates</div>
                        {group.adminNote && (
                          <div style={{ color: '#6d28d9', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '16px' }}>Reason: "{group.adminNote}"</div>
                        )}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => respondToOffer(group.ids, 'ACCEPT')} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }}>
                            Accept New Dates
                          </button>
                          <button onClick={() => respondToOffer(group.ids, 'REJECT')} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }}>
                            Reject and Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isAwaitingPayment && (
                      <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: '14px', padding: '20px', border: '1px solid #93c5fd' }}>
                        <div style={{ fontWeight: '800', color: '#1e40af', marginBottom: '16px' }}>Order approved! Complete your payment to confirm delivery.</div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => { setPayModal({ open: true, id: group.id, ids: group.ids, amount: group.totalGroupAmount }); setPayMethod('ONLINE'); }} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }}>
                            Pay Online (UPI/Card)
                          </button>
                          <button onClick={() => { setPayModal({ open: true, id: group.id, ids: group.ids, amount: group.totalGroupAmount }); setPayMethod('CASH'); }} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }}>
                            Pay Cash
                          </button>
                        </div>
                      </div>
                    )}

                    {group.status === 'ACTIVE' && group.paymentStatus === 'PAID' && (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {group.deliveryStatus === 'AWAITING_USER_CONFIRMATION' && (
                          <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #ecfeff, #ccfbf1)', borderRadius: '14px', border: '2px solid #14b8a6', boxShadow: '0 4px 12px rgba(20,184,166,0.16)' }}>
                            <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Delivery Confirmation Pending</div>
                            <div style={{ fontSize: '12px', color: '#115e59', marginTop: '3px' }}>Your door QR was scanned. Confirm from the popup after checking delivered items.</div>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            {doorQr.token ? (
                              <QRCodeSVG value={doorQr.token} size={90} level="H" />
                            ) : (
                              <div style={{ width: 90, height: 90, display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: '11px' }}>
                                {doorQr.loading ? 'Loading' : 'No QR'}
                              </div>
                            )}
                            <span style={{ fontSize: '10px', color: '#64748b', marginTop: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}>Door QR Token</span>
                            {doorQr.token && (
                              <button onClick={copyDoorQrToken} style={{ marginTop: '5px', border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }}>
                                Copy token
                              </button>
                            )}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button onClick={() => openTrackOrder(group.id, group.orderCategory)} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}>
                              🚴 Track Order Live
                            </button>
                            <button onClick={() => downloadBill(group)} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>
                              📄 Download Invoice
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {isRejected && (
                      <div style={{ background: '#fef2f2', borderRadius: '14px', padding: '16px 20px', border: '1px solid #fca5a5', color: '#991b1b', fontWeight: '600' }}>
                        This order was cancelled. You may place a new order from the products page.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {payModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '36px', maxWidth: '440px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Complete Payment</h2>
            <p style={{ margin: '0 0 28px 0', color: '#64748b' }}>Total: <strong style={{ color: '#0f172a', fontSize: '1.3rem' }}>Rs. {payModal.amount}</strong></p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
              <button onClick={() => setPayMethod('ONLINE')} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: payMethod === 'ONLINE' ? '2px solid #3b82f6' : '2px solid #e2e8f0', background: payMethod === 'ONLINE' ? '#eff6ff' : 'white', cursor: 'pointer', fontWeight: '700', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '2rem' }}>💳</span>
                <span>Online (UPI/Card)</span>
              </button>
              <button onClick={() => setPayMethod('CASH')} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: payMethod === 'CASH' ? '2px solid #f59e0b' : '2px solid #e2e8f0', background: payMethod === 'CASH' ? '#fffbeb' : 'white', cursor: 'pointer', fontWeight: '700', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '2rem' }}>💵</span>
                <span>Pay Cash</span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setPayModal({ open: false, id: null, amount: 0 })} style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitPayment} disabled={paying} style={{ flex: 2, padding: '14px', background: payMethod === 'ONLINE' ? '#3b82f6' : '#f59e0b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.7 : 1 }}>
                {paying ? 'Processing...' : `Confirm Payment`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track Order Modal */}
      {trackModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '20px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800' }}>🚴 Track Order</div>
                {trackModal.data && (
                  <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '4px' }}>{trackModal.data.customerName} · {trackModal.data.milkType} · {trackModal.data.dailyQuantity} {getUnit(trackModal.data)}/day</div>
                )}
              </div>
              <button onClick={() => setTrackModal({ open: false, data: null, loading: false })} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
              {trackModal.loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                  <div>Loading tracking info...</div>
                </div>
              ) : trackModal.data ? (
                <>
                  {trackModal.data.deliveryBoyName && (
                    <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚴</div>
                      <div>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>Your Delivery Partner</div>
                        <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '15px' }}>{trackModal.data.deliveryBoyName}</div>
                      </div>
                    </div>
                  )}
                  {trackModal.data.awaitingUserConfirmation && (
                    <div style={{ marginBottom: '20px', padding: '16px 20px', background: 'linear-gradient(135deg, #ecfeff, #ccfbf1)', borderRadius: '16px', border: '2px solid #14b8a6', boxShadow: '0 4px 12px rgba(20,184,166,0.16)' }}>
                      <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Awaiting Your Confirmation</div>
                      <div style={{ fontSize: '12px', color: '#115e59', marginTop: '4px' }}>The delivery boy scanned your door QR and selected delivered items. Use the confirmation popup to approve or report an issue.</div>
                    </div>
                  )}
                  <div style={{ position: 'relative' }}>
                    {trackModal.data.timeline.map((step, idx) => {
                      const isLast = idx === trackModal.data.timeline.length - 1;
                      const isCurrent = step.done && (isLast || !trackModal.data.timeline[idx + 1]?.done);
                      return (
                        <div key={step.key} style={{ display: 'flex', gap: '16px', paddingBottom: isLast ? 0 : '24px', position: 'relative' }}>
                          {!isLast && <div style={{ position: 'absolute', left: '19px', top: '40px', bottom: 0, width: '2px', background: step.done ? '#3b82f6' : '#e2e8f0' }} />}
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', zIndex: 1, background: step.done ? (isCurrent ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : '#dbeafe') : '#f1f5f9', boxShadow: isCurrent ? '0 4px 12px rgba(59,130,246,0.4)' : 'none', border: step.done ? 'none' : '2px dashed #cbd5e1' }}>
                            {step.done ? (isCurrent ? step.icon : '✓') : step.icon}
                          </div>
                          <div style={{ flex: 1, paddingTop: '8px' }}>
                            <div style={{ fontWeight: isCurrent ? '800' : step.done ? '600' : '500', color: step.done ? '#0f172a' : '#94a3b8', fontSize: '15px' }}>{step.label}</div>
                            {isCurrent && <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', marginTop: '2px' }}>● Current Status</div>}
                            {step.note && <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px' }}>⏳ {step.note}</div>}
                            {step.deliveryBoyName && step.done && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>👤 {step.deliveryBoyName}</div>}
                            {step.key === 'out_for_delivery' && isCurrent && !trackModal.data.isQrScanned && (
                              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#ecfeff', borderRadius: '8px', border: '1px dashed #14b8a6' }}>
                                <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: '700', textTransform: 'uppercase' }}>Door QR Required</div>
                                <div style={{ fontSize: '10px', color: '#115e59' }}>Delivery partner will scan your printed door QR before confirmation.</div>
                              </div>
                            )}
                            {step.timestamp && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{new Date(step.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {trackModal.data.deliveryStatus === 'Delivered' && (
                    <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', borderRadius: '12px', textAlign: 'center', border: '1px solid #86efac' }}>
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>✅</div>
                      <div style={{ fontWeight: '700', color: '#15803d' }}>Your milk order has been delivered successfully!</div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserOrderTracking;
