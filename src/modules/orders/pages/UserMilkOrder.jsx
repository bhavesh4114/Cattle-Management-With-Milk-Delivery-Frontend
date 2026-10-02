import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const UserMilkOrder = () => {
  const [orderType, setOrderType] = useState('Monthly'); // 'Trial', 'Monthly'
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    pincode: '',
    milkType: 'Cow Milk',
    dailyQuantity: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    notes: ''
  });

  const [pricing, setPricing] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [trials, setTrials] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ text: '', type: '' });
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null });
  const [editModal, setEditModal] = useState({ isOpen: false, data: null, type: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, type: '' });
  const [trackModal, setTrackModal] = useState({ isOpen: false, data: null, loading: false });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [priceRes, subRes, trialRes] = await Promise.all([
        api.get('/api/milk-module/pricing/price-list').catch(() => ({ data: [] })),
        api.get('/api/milk-module/subscription/my-subscriptions').catch(() => ({ data: [] })),
        api.get('/api/milk-module/trial/my-trials').catch(() => ({ data: [] }))
      ]);
      setPricing(priceRes.data);
      setSubscriptions(subRes.data);
      setTrials(trialRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dailyQuantity || Number(form.dailyQuantity) <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    setLoading(true);
    try {
      if (orderType === 'Trial') {
        await api.post('/api/milk-module/trial/submit-request', form);
        showToast('Trial request sent successfully!');
      } else {
        await api.post('/api/milk-module/subscription/submit-request', form);
        showToast('Monthly subscription request sent!');
      }
      setForm({
        customerName: '',
        phone: '',
        address: '',
        milkType: 'Cow Milk',
        dailyQuantity: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        notes: ''
      });
      setShowForm(false);
      fetchData();
    } catch (error) {
      showToast('Failed to submit request', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (id, type) => {
    setDeleteModal({ isOpen: true, id, type });
  };

  const confirmDelete = async () => {
    const { id, type } = deleteModal;
    try {
      if (type === 'trial') {
        await api.delete(`/api/milk-module/trial/${id}`);
      } else {
        await api.delete(`/api/milk-module/subscription/${id}`);
      }
      showToast(`${type} deleted successfully!`);
      setDeleteModal({ isOpen: false, id: null, type: '' });
      fetchData();
    } catch (e) {
      console.error(e);
      showToast('Failed to delete', 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const { id, type, customerName, dailyQuantity, milkType, address, phone, requestedStartDate, requestedEndDate, startDate, endDate, notes } = editModal.data;
      if (type === 'trial') {
        await api.put(`/api/milk-module/trial/${id}`, { customerName, dailyQuantity, milkType, address, phone, startDate, endDate, notes });
      } else {
        await api.put(`/api/milk-module/subscription/${id}`, { customerName, dailyQuantity, milkType, address, phone, requestedStartDate, requestedEndDate, notes });
      }
      showToast(`${type} updated successfully!`);
      setEditModal({ isOpen: false, data: null, type: '' });
      fetchData();
    } catch (e) {
      console.error(e);
      showToast('Failed to update', 'error');
    }
  };

  const respondToOffer = async (id, decision) => {
    try {
      await api.post(`/api/milk-module/subscription/${id}/user-respond`, { decision });
      showToast(`Offer ${decision.toLowerCase()}ed`);
      fetchData();
    } catch (e) {
      console.error(e);
      showToast("Failed to process your response", "error");
    }
  };

  const processPayment = async (id, method) => {
    try {
      const res = await api.post(`/api/milk-module/subscription/${id}/pay`, { method });
      if (method === 'ONLINE') {
        // Mock Online Payment verification
        await api.post('/api/milk-module/subscription/verify-payment', {
          subscriptionId: id,
          transactionId: 'TXN' + Date.now(),
          status: 'SUCCESS'
        });
        showToast("Online payment successful!");
      } else {
        showToast("Cash payment recorded as pending.");
      }
      fetchData();
    } catch (e) {
      console.error(e);
      showToast("Payment failed", "error");
    }
  };

  const getPriceForType = (type) => {
    const p = pricing.find(x => x.milkType === type);
    return p ? p.pricePerLitre : 0;
  };

  const getUnit = (milkType) => {
    const p = pricing.find(x => (x.name === milkType) || (x.milkType === milkType));
    if (p && p.unit) return p.unit;
    if (milkType && (milkType.toLowerCase().includes('milk') || milkType.toLowerCase().includes('chaas'))) return 'L';
    return 'Qty';
  };

  const openTrackOrder = async (id, orderType) => {
    setTrackModal({ isOpen: true, data: null, loading: true });
    try {
      const res = await api.get(`/api/delivery/track/${orderType}/${id}`);
      setTrackModal({ isOpen: true, data: res.data, loading: false });
    } catch (e) {
      console.error(e);
      setTrackModal({ isOpen: false, data: null, loading: false });
      showToast('Failed to load tracking info', 'error');
    }
  };

  const downloadBill = (s) => {
    const doc = new jsPDF();
    const invoiceNo = `INV-MILK-${s.id.toString().substring(0, 6).toUpperCase()}`;
    const dateGenerated = new Date().toLocaleDateString('en-GB');

    // Title
    doc.setFontSize(20);
    doc.setTextColor(22, 101, 52);
    doc.text('Farm Fresh Milk Invoice', 14, 22);

    // Invoice Info
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice #: ${invoiceNo}`, 14, 30);
    doc.text(`Date Generated: ${dateGenerated}`, 14, 35);

    // Billed To & Info
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Billed To:', 14, 45);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Name: ${s.customerName || 'Customer'}`, 14, 52);
    doc.text(`Phone: ${s.phone || 'N/A'}`, 14, 58);
    doc.text(`Address: ${s.address || 'N/A'}`, 14, 64);

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Subscription Info:', 110, 45);
    doc.setFontSize(10);
    doc.setTextColor(22, 163, 74);
    doc.text(`Status: PAID`, 110, 52);
    doc.setTextColor(100);
    const sDate = new Date(s.finalStartDate || s.requestedStartDate).toLocaleDateString('en-GB');
    const eDate = new Date(s.finalEndDate || s.requestedEndDate).toLocaleDateString('en-GB');
    doc.text(`Period: ${sDate} to ${eDate}`, 110, 58);

    // Table
    const days = ((new Date(s.finalEndDate || s.requestedEndDate) - new Date(s.finalStartDate || s.requestedStartDate)) / (1000 * 60 * 60 * 24) + 1).toFixed(0);
    const rate = s.pricePerLitre || getPriceForType(s.milkType);

    const tableData = [
      [`Monthly Subscription - ${s.milkType}`, `${s.dailyQuantity} ${getUnit(s.milkType)}`, days, `Rs. ${rate}`, `Rs. ${s.totalAmount}`]
    ];

    autoTable(doc, {
      startY: 75,
      head: [['Item Description', 'Quantity/Day', 'Days', 'Rate/Unit', 'Total Amount']],
      body: tableData,
      headStyles: { fillColor: [220, 252, 227], textColor: [22, 101, 52] },
      foot: [['', '', '', 'Grand Total Paid:', `Rs. ${s.totalAmount}`]],
      footStyles: { fillColor: [239, 246, 255], textColor: [22, 101, 52], fontStyle: 'bold' },
      theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY || 100;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for choosing Farm Fresh Milk!', 14, finalY + 20);
    doc.text('This is a computer generated invoice and does not require a physical signature.', 14, finalY + 26);

    doc.save(`${invoiceNo}.pdf`);
  };

  return (
    <div style={{ width: '100%', padding: 0, paddingBottom: '40px' }}>
      {toast.text && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          {toast.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'linear-gradient(135deg, #14532d, #22c55e)', padding: '24px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Milk Delivery Service</h2>
          <p style={{ margin: 0, opacity: 0.9 }}>Get farm-fresh milk delivered to your doorstep</p>
        </div>
        <button
          onClick={() => {
            if (!showForm) {
              setForm({
                customerName: '',
                phone: '',
                address: '',
                pincode: '',
                milkType: 'Cow Milk',
                dailyQuantity: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
                notes: ''
              });
            }
            setShowForm(!showForm);
          }}
          style={{ background: 'white', color: '#14532d', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        >
          {showForm ? 'View My Orders' : '+ New Request'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', width: '100%' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: '#1e293b', fontSize: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>Request Milk Delivery</h3>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <button type="button" onClick={() => setOrderType('Monthly')} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: orderType === 'Monthly' ? '2px solid #22c55e' : '1px solid #cbd5e1', background: orderType === 'Monthly' ? '#dcfce3' : 'white', color: orderType === 'Monthly' ? '#166534' : '#475569', cursor: 'pointer' }}>
              📅 Monthly Subscription
            </button>
            <button type="button" onClick={() => setOrderType('Trial')} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: orderType === 'Trial' ? '2px solid #22c55e' : '1px solid #cbd5e1', background: orderType === 'Trial' ? '#dcfce3' : 'white', color: orderType === 'Trial' ? '#166534' : '#475569', cursor: 'pointer' }}>
              ⏱ Trial Milk
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Name</label>
                <input type="text" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Enter your full name" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Phone</label>
                <input type="text" required minLength="10" maxLength="10" pattern="\d{10}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="Enter your 10-digit mobile number" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Delivery Address</label>
                <textarea required rows="2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Enter your complete home address for delivery" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Pincode</label>
                <input type="text" required minLength="6" maxLength="6" pattern="\d{6}" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="6-digit Pincode" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Milk Type & Pricing</label>
              <select value={form.milkType} onChange={(e) => setForm({ ...form, milkType: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                <option value="Cow Milk">Cow Milk (₹{getPriceForType('Cow Milk')}/L)</option>
                <option value="Buffalo Milk">Buffalo Milk (₹{getPriceForType('Buffalo Milk')}/L)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Daily Quantity (Litres)</label>
              <input type="number" step="0.5" required value={form.dailyQuantity} onChange={(e) => setForm({ ...form, dailyQuantity: e.target.value })} placeholder="e.g. 2" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>

            {orderType === 'Monthly' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Start Date</label>
                  <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>End Date</label>
                  <input type="date" required value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </>
            )}

            {orderType === 'Trial' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Trial Start Date</label>
                  <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Trial End Date</label>
                  <input type="date" required value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '12px', borderRadius: '8px', color: '#475569', fontSize: '14px' }}>
                  ℹ️ You have selected a trial. Payments for the trial period can be made upon admin approval.
                </div>
              </>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Additional Notes (Optional)</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Please ring the bell" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
              <button type="submit" disabled={loading} style={{ width: '100%', background: '#16a34a', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

          {/* Subscriptions */}
          <div>
            <h3 style={{ fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>My Subscriptions</h3>
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', background: '#dcfce3', color: '#166534' }}>Type & Qty</th>
                    <th style={{ padding: '12px 16px', background: '#dcfce3', color: '#166534' }}>Dates</th>
                    <th style={{ padding: '12px 16px', background: '#dcfce3', color: '#166534' }}>Total Amount</th>
                    <th style={{ padding: '12px 16px', background: '#dcfce3', color: '#166534' }}>Status</th>
                    <th style={{ padding: '12px 16px', background: '#dcfce3', color: '#166534' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 'bold' }}>{s.dailyQuantity} {getUnit(s.milkType)}/day</div>
                        <div style={{ color: '#64748b' }}>{s.milkType}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {s.status === 'AWAITING_CUSTOMER' ? (
                          <>
                            <del style={{ color: '#94a3b8' }}>{new Date(s.requestedStartDate).toLocaleDateString('en-GB')} to {new Date(s.requestedEndDate).toLocaleDateString('en-GB')}</del>
                            <br />
                            <span style={{ color: '#d97706', fontWeight: 'bold' }}>{new Date(s.offeredStartDate).toLocaleDateString('en-GB')} to {new Date(s.offeredEndDate).toLocaleDateString('en-GB')}</span>
                          </>
                        ) : (
                          s.finalStartDate ? `${new Date(s.finalStartDate).toLocaleDateString('en-GB')} to ${new Date(s.finalEndDate).toLocaleDateString('en-GB')}` : `${new Date(s.requestedStartDate).toLocaleDateString('en-GB')} to ${new Date(s.requestedEndDate).toLocaleDateString('en-GB')}`
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                        {s.totalAmount ? `₹${s.totalAmount}` : (
                          <span style={{ color: '#64748b', fontWeight: 'normal' }}>
                            Est. ₹{(
                              ((new Date(s.requestedEndDate) - new Date(s.requestedStartDate)) / (1000 * 60 * 60 * 24) + 1) * s.dailyQuantity * getPriceForType(s.milkType)
                            ).toFixed(0)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block',
                            background: s.status === 'ACTIVE' ? '#dcfce3' : s.status === 'AWAITING_PAYMENT' ? '#dbeafe' : s.status === 'AWAITING_CUSTOMER' ? '#ffedd5' : s.status === 'REJECTED' || s.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7',
                            color: s.status === 'ACTIVE' ? '#166534' : s.status === 'AWAITING_PAYMENT' ? '#1d4ed8' : s.status === 'AWAITING_CUSTOMER' ? '#c2410c' : s.status === 'REJECTED' || s.status === 'CANCELLED' ? '#b91c1c' : '#d97706'
                          }}>
                            {s.status.replace(/_/g, ' ')}
                          </span>
                          <span style={{
                            padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block',
                            background: s.paymentStatus === 'PAID' ? '#dcfce3' : s.paymentStatus === 'FAILED' ? '#fee2e2' : '#f1f5f9',
                            color: s.paymentStatus === 'PAID' ? '#166534' : s.paymentStatus === 'FAILED' ? '#b91c1c' : '#475569'
                          }}>
                            {s.paymentStatus.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {s.status === 'AWAITING_CUSTOMER' && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                            <button onClick={() => respondToOffer(s.id, 'ACCEPT')} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Accept</button>
                            <button onClick={() => respondToOffer(s.id, 'REJECT')} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Reject</button>
                          </div>
                        )}
                        {s.status === 'AWAITING_PAYMENT' && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                            <button onClick={() => processPayment(s.id, 'ONLINE')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Pay Online</button>
                            <button onClick={() => processPayment(s.id, 'CASH')} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Pay Cash</button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <button onClick={() => setViewModal({ isOpen: true, data: s })} title="View" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 0 }}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </button>
                          <button onClick={() => setEditModal({ isOpen: true, type: 'subscription', data: { ...s, type: 'subscription' } })} title="Edit" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f59e0b', padding: 0 }}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button onClick={() => handleCancel(s.id, 'subscription')} title="Delete/Cancel" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                          {s.paymentStatus === 'PAID' && (
                            <button onClick={() => downloadBill(s)} title="Download Invoice/Bill" style={{ background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              Download Bill
                            </button>
                          )}
                          {s.status === 'ACTIVE' && (
                            <button onClick={() => openTrackOrder(s.id, 'sub')} title="Track Delivery" style={{ background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🚴 Track
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subscriptions.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No subscriptions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trials */}
          <div>
            <h3 style={{ fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>My Trial Requests</h3>
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', background: '#dcfce3', color: '#166534' }}>Type & Qty</th>
                    <th style={{ padding: '12px 16px', background: '#dcfce3', color: '#166534' }}>Dates</th>
                    <th style={{ padding: '12px 16px', background: '#dcfce3', color: '#166534' }}>Status</th>
                    <th style={{ padding: '12px 16px', background: '#dcfce3', color: '#166534' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {trials.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 'bold' }}>{t.dailyQuantity} {getUnit(t.milkType)}/day</div>
                        <div style={{ color: '#64748b' }}>{t.milkType}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {t.startDate ? `${new Date(t.startDate).toLocaleDateString('en-GB')} to ${new Date(t.endDate).toLocaleDateString('en-GB')}` : 'Pending Admin'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block',
                            background: t.status === 'ACTIVE' ? '#dcfce3' : t.status === 'REJECTED' || t.status === 'CANCELLED' ? '#fee2e2' : t.status === 'COMPLETED' ? '#dcfce3' : '#fef3c7',
                            color: t.status === 'ACTIVE' ? '#166534' : t.status === 'REJECTED' || t.status === 'CANCELLED' ? '#b91c1c' : t.status === 'COMPLETED' ? '#166534' : '#d97706'
                          }}>
                            {t.status.replace(/_/g, ' ')}
                          </span>

                          {t.status === 'ACTIVE' && (
                            <button onClick={() => showToast("Please pay the driver upon delivery", "success")} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '12px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Pay Now</button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <button onClick={() => setViewModal({ isOpen: true, data: t })} title="View" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 0 }}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </button>
                          <button onClick={() => setEditModal({ isOpen: true, type: 'trial', data: { ...t, type: 'trial' } })} title="Edit" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f59e0b', padding: 0 }}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button onClick={() => handleCancel(t.id, 'trial')} title="Delete/Cancel" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {trials.length === 0 && (
                    <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No trials found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewModal.isOpen && viewModal.data && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: '#1e293b', fontSize: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Order Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', color: '#334155' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <strong style={{ color: '#475569' }}>Customer:</strong> <span>{viewModal.data.customerName}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <strong style={{ color: '#475569' }}>Phone:</strong> <span>{viewModal.data.phone}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <strong style={{ color: '#475569' }}>Address:</strong> <span>{viewModal.data.address}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <strong style={{ color: '#475569' }}>Milk Type:</strong> <span>{viewModal.data.milkType}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <strong style={{ color: '#475569' }}>Quantity:</strong> <span>{viewModal.data.dailyQuantity} {getUnit(viewModal.data.milkType)}/day</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <strong style={{ color: '#475569' }}>Dates:</strong>
                <span>
                  {viewModal.data.requestedStartDate
                    ? `${new Date(viewModal.data.requestedStartDate).toLocaleDateString('en-GB')} to ${new Date(viewModal.data.requestedEndDate).toLocaleDateString('en-GB')}`
                    : `${new Date(viewModal.data.startDate).toLocaleDateString('en-GB')} to ${new Date(viewModal.data.endDate).toLocaleDateString('en-GB')}`
                  }
                </span>
              </div>
              {viewModal.data.notes && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                  <strong style={{ color: '#475569' }}>Notes:</strong> <span>{viewModal.data.notes}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '32px', textAlign: 'right' }}>
              <button onClick={() => setViewModal({ isOpen: false, data: null })} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {editModal.isOpen && editModal.data && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: '#1e293b', fontSize: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Edit Order</h3>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Customer Name</label>
                  <input type="text" value={editModal.data.customerName || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, customerName: e.target.value } })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Phone</label>
                  <input type="text" value={editModal.data.phone || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, phone: e.target.value } })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Address</label>
                <textarea rows="2" value={editModal.data.address || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, address: e.target.value } })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Milk Type</label>
                  <select value={editModal.data.milkType || 'Cow Milk'} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, milkType: e.target.value } })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <option value="Cow Milk">Cow Milk</option>
                    <option value="Buffalo Milk">Buffalo Milk</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Quantity / Day</label>
                  <input type="number" step="0.5" value={editModal.data.dailyQuantity || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, dailyQuantity: e.target.value } })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Start Date</label>
                  <input type="date" value={(editModal.data.type === 'trial' ? editModal.data.startDate : editModal.data.requestedStartDate)?.split('T')[0] || ''} onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                    if (editModal.data.type === 'trial') setEditModal({ ...editModal, data: { ...editModal.data, startDate: val } });
                    else setEditModal({ ...editModal, data: { ...editModal.data, requestedStartDate: val } });
                  }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>End Date</label>
                  <input type="date" value={(editModal.data.type === 'trial' ? editModal.data.endDate : editModal.data.requestedEndDate)?.split('T')[0] || ''} onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                    if (editModal.data.type === 'trial') setEditModal({ ...editModal, data: { ...editModal.data, endDate: val } });
                    else setEditModal({ ...editModal, data: { ...editModal.data, requestedEndDate: val } });
                  }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Notes (Optional)</label>
                <input type="text" value={editModal.data.notes || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, notes: e.target.value } })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setEditModal({ isOpen: false, data: null, type: '' })} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
            </div>
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#1e293b', fontSize: '20px' }}>Confirm Action</h3>
            <p style={{ color: '#475569', marginBottom: '24px' }}>Are you sure you want to delete this {deleteModal.type}?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setDeleteModal({ isOpen: false, id: null, type: '' })} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Yes, I'm sure</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚴 Order Tracking Modal */}
      {trackModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '20px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800' }}>🚴 Track Order</div>
                {trackModal.data && (
                  <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '4px' }}>
                    {trackModal.data.customerName} · {trackModal.data.milkType} · {trackModal.data.dailyQuantity}L/day
                  </div>
                )}
              </div>
              <button onClick={() => setTrackModal({ isOpen: false, data: null, loading: false })} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
              {trackModal.loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                  <div>Loading tracking info...</div>
                </div>
              ) : trackModal.data ? (
                <>
                  {/* Delivery Boy Info */}
                  {trackModal.data.deliveryBoyName && (
                    <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚴</div>
                      <div>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>Your Delivery Partner</div>
                        <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '15px' }}>{trackModal.data.deliveryBoyName}</div>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div style={{ position: 'relative' }}>
                    {trackModal.data.timeline.map((step, idx) => {
                      const isLast = idx === trackModal.data.timeline.length - 1;
                      const isCurrent = step.done && (isLast || !trackModal.data.timeline[idx + 1]?.done);
                      return (
                        <div key={step.key} style={{ display: 'flex', gap: '16px', paddingBottom: isLast ? 0 : '24px', position: 'relative' }}>
                          {/* Line */}
                          {!isLast && (
                            <div style={{ position: 'absolute', left: '19px', top: '40px', bottom: 0, width: '2px', background: step.done ? '#3b82f6' : '#e2e8f0' }} />
                          )}
                          {/* Circle */}
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', zIndex: 1,
                            background: step.done ? (isCurrent ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#dbeafe') : '#f1f5f9',
                            boxShadow: isCurrent ? '0 4px 12px rgba(59,130,246,0.4)' : 'none',
                            border: step.done ? 'none' : '2px dashed #cbd5e1'
                          }}>
                            {step.done ? (isCurrent ? step.icon : '✓') : step.icon}
                          </div>
                          {/* Text */}
                          <div style={{ flex: 1, paddingTop: '8px' }}>
                            <div style={{ fontWeight: isCurrent ? '800' : step.done ? '600' : '500', color: step.done ? '#0f172a' : '#94a3b8', fontSize: '15px' }}>
                              {step.label}
                            </div>
                            {isCurrent && (
                              <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', marginTop: '2px' }}>● Current Status</div>
                            )}
                            {step.note && (
                              <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px' }}>⏳ {step.note}</div>
                            )}
                            {step.deliveryBoyName && step.done && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>👤 {step.deliveryBoyName}</div>
                            )}
                            {step.timestamp && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                {new Date(step.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivered message */}
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

export default UserMilkOrder;
