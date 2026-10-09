import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AlertPopup from '../components/AlertPopup';
import NotificationCenter from '../../../components/notifications/NotificationCenter';
import SpecialAlertsBanner from '../../../components/notifications/SpecialAlertsBanner';
import MilkDeliveryRequestsCustomer from '../../milk-admin/pages/requests/MilkDeliveryRequestsCustomer';


const STATUS_COLORS = {
  PENDING_ADMIN: { bg: '#fef3c7', color: '#92400e', label: 'Pending Admin' },
  AWAITING_CUSTOMER: { bg: '#ede9fe', color: '#5b21b6', label: 'Admin Changed Dates' },
  AWAITING_PAYMENT: { bg: '#dbeafe', color: '#1e40af', label: 'Awaiting Payment' },
  ACTIVE: { bg: '#dcfce7', color: '#166534', label: 'Active' },
  COMPLETED: { bg: '#f1f5f9', color: '#475569', label: 'Completed' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  REJECTED: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
};

const UserOrderTracking = ({ onBack, initialTrackOrder }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [trials, setTrials] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequests, setShowRequests] = useState(false);
  const [selectedSubForExtra, setSelectedSubForExtra] = useState(null);
  const [toast, setToast] = useState({ text: '', type: '' });
  const [payModal, setPayModal] = useState({ open: false, id: null, amount: 0 });
  const [payMethod, setPayMethod] = useState('ONLINE');
  const [paying, setPaying] = useState(false);
  const [trackModal, setTrackModal] = useState({ open: false, data: null, loading: false });
  const [doorQr, setDoorQr] = useState({ loading: true, token: "", user: null });
  const [trackTab, setTrackTab] = useState('timeline');
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  const [deliveryPayModal, setDeliveryPayModal] = useState({
    open: false,
    group: null,
    selectedOption: 'DELIVERED',
    customDays: 1,
    amount: 0,
    dailyCost: 0,
    deliveredCount: 0,
    totalDays: 1,
    method: 'ONLINE'
  });
  const [deliveryPaying, setDeliveryPaying] = useState(false);

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

  const handleCancelOrder = async (group) => {
    const isSingle = group.orderCategory === 'trial';
    const confirmMsg = `Are you sure you want to cancel this ${isSingle ? 'Single Day' : 'Subscription'} milk order?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.post('/milk-module/order/cancel', {
        orderCategory: group.orderCategory,
        ids: group.ids,
        reason: 'Cancelled by customer'
      });
      showToast('Order cancelled successfully.');
      fetchOrders();
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.message || 'Failed to cancel order', 'error');
    }
  };

  const handleDeleteCancelledOrder = async (group) => {
    if (!window.confirm("Remove this cancelled order from your list?")) return;
    try {
      for (const id of group.ids) {
        if (group.orderCategory === 'trial') {
          await api.delete(`/milk-module/trial/${id}`);
        } else {
          await api.delete(`/milk-module/subscription/${id}`);
        }
      }
      showToast('Order removed from list.');
      fetchOrders();
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.message || 'Failed to remove order', 'error');
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

  const openDeliveryPaymentModal = (group, overrideDeliveredCount = null) => {
    const item = group.items?.[0] || group;
    const priceEntry = pricing.find(p => (p.milkType === item.milkType) || (p.name === item.milkType));
    const unitPrice = parseFloat(item.pricePerLitre || (priceEntry ? (priceEntry.pricePerLitre || priceEntry.price) : 0) || 0);
    const qty = parseFloat(item.dailyQuantity) || 1;
    const dailyCost = Math.round(unitPrice * qty);
    
    const s = new Date(group.finalStartDate || group.requestedStartDate || group.startDate);
    const e = new Date(group.finalEndDate || group.requestedEndDate || group.endDate);
    const totalDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
    
    let deliveredCount = overrideDeliveredCount !== null ? overrideDeliveredCount : (group.deliveredCount || 2);
    if (trackModal.data && String(trackModal.data.orderId) === String(group.id) && trackModal.data.dailySchedule) {
      deliveredCount = trackModal.data.dailySchedule.deliveredCount || 1;
    }

    const defaultOption = deliveredCount > 0 ? 'DELIVERED' : 'DAILY';
    const initAmount = defaultOption === 'DELIVERED' ? (dailyCost * deliveredCount) : dailyCost;

    setDeliveryPayModal({
      open: true,
      group,
      dailyCost,
      totalDays,
      deliveredCount,
      unitPrice,
      qty,
      unit: getUnit(item),
      selectedOption: defaultOption,
      customDays: deliveredCount || 1,
      amount: initAmount,
      method: 'ONLINE'
    });
  };

  const handleDeliveryOptionChange = (option) => {
    const { dailyCost, deliveredCount, totalDays, customDays } = deliveryPayModal;
    let newAmount = dailyCost;
    if (option === 'DELIVERED') {
      newAmount = dailyCost * (deliveredCount || 1);
    } else if (option === 'DAILY') {
      newAmount = dailyCost * 1;
    } else if (option === 'WEEKLY') {
      newAmount = dailyCost * 7;
    } else if (option === 'MONTHLY') {
      newAmount = dailyCost * 30;
    } else if (option === 'CUSTOM') {
      newAmount = dailyCost * (customDays || 1);
    } else if (option === 'FULL') {
      newAmount = dailyCost * (totalDays || 1);
    }
    setDeliveryPayModal(prev => ({
      ...prev,
      selectedOption: option,
      amount: newAmount
    }));
  };

  const handleCustomDaysChange = (days) => {
    const validDays = Math.max(1, parseInt(days) || 1);
    const newAmount = deliveryPayModal.dailyCost * validDays;
    setDeliveryPayModal(prev => ({
      ...prev,
      customDays: validDays,
      amount: newAmount
    }));
  };

  const submitDeliveryPayment = async () => {
    if (!deliveryPayModal.group) return;
    setDeliveryPaying(true);
    try {
      const subId = deliveryPayModal.group.id;
      const { method, amount, selectedOption, customDays } = deliveryPayModal;

      await api.post(`/milk-module/subscription/${subId}/pay`, {
        method,
        amount,
        paymentType: selectedOption,
        daysCount: selectedOption === 'CUSTOM' ? customDays : undefined
      });

      if (method === 'ONLINE') {
        await api.post('/milk-module/subscription/verify-payment', {
          subscriptionId: subId,
          amount,
          paymentType: selectedOption,
          transactionId: 'TXN' + Date.now(),
          status: 'SUCCESS'
        });
      }

      showToast(method === 'ONLINE' ? `Online payment of Rs. ${amount} successful! ✓` : `Cash payment request of Rs. ${amount} recorded! ✓`);
      setDeliveryPayModal(prev => ({ ...prev, open: false, group: null }));
      fetchOrders();
      if (trackModal.open) {
        openTrackOrder(subId, 'subscription', trackTab);
      }
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.message || 'Payment failed', 'error');
    } finally {
      setDeliveryPaying(false);
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



  const [closedManually, setClosedManually] = useState(false);

  const closeTrackModal = () => {
    setClosedManually(true);
    setTrackModal({ open: false, data: null, loading: false });
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('orderId');
      url.searchParams.delete('orderType');
      const newQuery = url.searchParams.toString();
      const newUrl = url.pathname + (newQuery ? '?' + newQuery : '');
      window.history.replaceState({}, '', newUrl);
    } catch (e) {}
  };

  const openTrackOrder = async (id, orderCategory, defaultTab = 'timeline') => {
    if (!id) return;
    setClosedManually(false);
    setTrackTab(defaultTab);
    setScheduleFilter('ALL');
    setTrackModal({ open: true, data: null, loading: true });
    try {
      let cat = orderCategory;
      if (!cat) {
        const inTrial = trials.find(t => String(t.id) === String(id));
        if (inTrial) cat = 'trial';
        else {
          const inSub = subscriptions.find(s => String(s.id) === String(id));
          if (inSub) cat = 'subscription';
          else cat = 'trial';
        }
      }
      if (cat === 'sub') cat = 'subscription';

      const res = await api.get(`/delivery/track?orderType=${cat}&orderId=${id}`);
      setTrackModal({ open: true, data: res.data, loading: false });
    } catch (e) {
      console.error(e);
      // Fallback: try alternate category
      try {
        const altCat = orderCategory === 'trial' ? 'subscription' : 'trial';
        const res = await api.get(`/delivery/track?orderType=${altCat}&orderId=${id}`);
        setTrackModal({ open: true, data: res.data, loading: false });
        return;
      } catch (err2) {}
      setTrackModal({ open: false, data: null, loading: false });
      showToast('Failed to load tracking info', 'error');
    }
  };

  // Auto-open tracking when initialTrackOrder prop is provided
  useEffect(() => {
    if (initialTrackOrder?.orderId && !closedManually) {
      openTrackOrder(initialTrackOrder.orderId, initialTrackOrder.orderType || 'trial');
    }
  }, [initialTrackOrder]);

  // Listen to window event 'open-delivery-tracking'
  useEffect(() => {
    const handleOpenTracking = (e) => {
      const { orderId, orderType } = e.detail || {};
      if (orderId) {
        openTrackOrder(orderId, orderType || 'trial');
      }
    };
    window.addEventListener('open-delivery-tracking', handleOpenTracking);
    return () => window.removeEventListener('open-delivery-tracking', handleOpenTracking);
  }, [trials, subscriptions]);

  // Read URL search params directly on load
  useEffect(() => {
    if (loading || closedManually) return;
    const params = new URLSearchParams(window.location.search);
    const qOrderId = params.get('orderId');
    const qOrderType = params.get('orderType') || 'trial';
    if (qOrderId) {
      openTrackOrder(qOrderId, qOrderType);
    } else if (params.get('tab') === 'track' && !trackModal.open && !trackModal.data && !initialTrackOrder?.orderId) {
      const activeTrial = trials.find(t => ['ACTIVE', 'APPROVED'].includes(t.status));
      const activeSub = subscriptions.find(s => ['ACTIVE', 'APPROVED'].includes(s.status));
      const target = activeTrial ? { id: activeTrial.id, type: 'trial' } : (activeSub ? { id: activeSub.id, type: 'subscription' } : null);
      if (target) {
        openTrackOrder(target.id, target.type);
      }
    }
  }, [loading, trials, subscriptions, closedManually]);

  const handleCustomerConfirmReceipt = async (orderId, orderCategory) => {
    try {
      await api.post(`/delivery/${orderId}/confirm`, { orderType: orderCategory });
      showToast('Delivery confirmed & saved successfully! ✓');
      window.dispatchEvent(new CustomEvent('delivery-status-updated', { detail: { orderId, orderType: orderCategory } }));
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      closeTrackModal();
      fetchOrders();
    } catch (e) {
      if (e.response?.data?.message?.includes('No delivery is currently awaiting customer confirmation')) {
        showToast('Delivery already confirmed & saved! ✓');
        closeTrackModal();
        fetchOrders();
      } else {
        showToast(e.response?.data?.message || 'Failed to confirm delivery', 'error');
      }
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

  if (showRequests) {
    return (
      <MilkDeliveryRequestsCustomer
        onBack={() => {
          setShowRequests(false);
          setSelectedSubForExtra(null);
        }}
        initialSubscriptionId={selectedSubForExtra}
      />
    );
  }

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
              const isTrial = group.orderCategory === 'trial';
              const isDeliveredOrCompleted = isTrial
                ? (group.status === 'COMPLETED' || ['Delivered', 'DELIVERED', 'COMPLETED'].includes(group.deliveryStatus))
                : (group.status === 'COMPLETED');
              const statusInfo = isDeliveredOrCompleted ? STATUS_COLORS.COMPLETED : (STATUS_COLORS[group.status] || { bg: '#f1f5f9', color: '#475569', label: group.status });
              const isAwaitingCustomer = !isDeliveredOrCompleted && group.status === 'AWAITING_CUSTOMER';
              const isAwaitingPayment = !isDeliveredOrCompleted && group.status === 'AWAITING_PAYMENT';
              const isPendingAdmin = !isDeliveredOrCompleted && group.status === 'PENDING_ADMIN';
              const isRejected = !isDeliveredOrCompleted && (group.status === 'REJECTED' || group.status === 'CANCELLED');
              const isActive = !isDeliveredOrCompleted && group.status === 'ACTIVE';
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
                          {group.orderCategory === 'trial' ? 'Single Day' : `${Math.max(1, Math.round(((new Date(endDate || group.endDate)) - (new Date(startDate || group.startDate))) / (1000 * 60 * 60 * 24)) + 1)} Days Subscription`}
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
                    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: (isAwaitingCustomer || isAwaitingPayment || isPendingAdmin || isRejected) ? '20px' : '0' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>Requested Dates</div>
                        <div style={{ fontWeight: '700', color: isAwaitingCustomer ? '#94a3b8' : '#0f172a', textDecoration: isAwaitingCustomer ? 'line-through' : 'none' }}>
                          {startDate ? new Date(startDate).toLocaleDateString('en-GB') : '—'} to {endDate ? new Date(endDate).toLocaleDateString('en-GB') : '—'}
                          {group.orderCategory !== 'trial' && (
                            <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#4f46e5', fontWeight: '800' }}>
                              ({Math.max(1, Math.round(((new Date(endDate || group.endDate)) - (new Date(startDate || group.startDate))) / (1000 * 60 * 60 * 24)) + 1)} Days)
                            </span>
                          )}
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

                    {isPendingAdmin && (
                      <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '14px', padding: '16px 20px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.4rem' }}>⏳</span>
                          <div>
                            <div style={{ fontWeight: '800', color: '#92400e', fontSize: '0.95rem' }}>Waiting for Admin Review</div>
                            <div style={{ color: '#b45309', fontSize: '0.85rem' }}>Your order is in review. You can cancel it anytime before approval.</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelOrder(group)}
                          style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.25)' }}
                        >
                          ✕ Cancel Order
                        </button>
                      </div>
                    )}

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
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button onClick={() => { setPayModal({ open: true, id: group.id, ids: group.ids, amount: group.totalGroupAmount }); setPayMethod('ONLINE'); }} style={{ flex: 1, minWidth: '140px', padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }}>
                            Pay Online (UPI/Card)
                          </button>
                          <button onClick={() => { setPayModal({ open: true, id: group.id, ids: group.ids, amount: group.totalGroupAmount }); setPayMethod('CASH'); }} style={{ flex: 1, minWidth: '140px', padding: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }}>
                            Pay Cash
                          </button>
                          <button onClick={() => handleCancelOrder(group)} style={{ padding: '12px 18px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }}>
                            ✕ Cancel Order
                          </button>
                        </div>
                      </div>
                    )}

                    {isActive && (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {!['Delivered', 'DELIVERED', 'COMPLETED'].includes(group.deliveryStatus) && ['DELIVERY_PENDING_CUSTOMER_CONFIRMATION', 'AWAITING_USER_CONFIRMATION', 'ARRIVED', 'OUT_FOR_DELIVERY'].includes((group.deliveryStatus || '').toUpperCase().replace(/ /g, '_')) && (
                          <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #ecfeff, #ccfbf1)', borderRadius: '14px', border: '2px solid #14b8a6', boxShadow: '0 4px 12px rgba(20,184,166,0.16)' }}>
                            <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>🥛 Delivery Confirmation</div>
                            <div style={{ fontSize: '13px', color: '#115e59', marginTop: '4px', fontWeight: '600' }}>Your delivery has arrived/handed over. Please confirm that you received your delivery.</div>
                            <button
                              onClick={() => handleCustomerConfirmReceipt(group.id, group.orderCategory)}
                              style={{ marginTop: '12px', padding: '12px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}
                            >
                              ✅ Confirm Delivery Received
                            </button>
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
                            <button onClick={() => openTrackOrder(group.id, group.orderCategory, 'timeline')} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}>
                              🚴 Track Order Live
                            </button>
                            {group.orderCategory !== 'trial' && (
                              <button
                                onClick={() => openTrackOrder(group.id, group.orderCategory, 'schedule')}
                                style={{
                                  padding: '12px 16px',
                                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '10px',
                                  fontWeight: '700',
                                  fontSize: '0.9rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 10px rgba(99,102,241,0.25)',
                                }}
                              >
                                📅 View Daily Schedule & History
                              </button>
                            )}
                            {group.orderCategory !== 'trial' && (
                              <button
                                onClick={() => openDeliveryPaymentModal(group)}
                                style={{
                                  padding: '12px 16px',
                                  background: 'linear-gradient(135deg, #059669, #047857)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '10px',
                                  fontWeight: '700',
                                  fontSize: '0.9rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 10px rgba(5,150,105,0.3)',
                                }}
                              >
                                💳 Pay for Deliveries (Daily / Weekly / Monthly)
                              </button>
                            )}
                            {group.orderCategory !== 'trial' && (
                              <button
                                onClick={() => {
                                  setSelectedSubForExtra(group.id);
                                  setShowRequests(true);
                                }}
                                style={{
                                  padding: '12px 16px',
                                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '10px',
                                  fontWeight: '700',
                                  fontSize: '0.9rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 10px rgba(2,132,199,0.3)',
                                }}
                              >
                                🥛 Request Extra Delivery
                              </button>
                            )}
                            <button onClick={() => downloadBill(group)} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>
                              📄 Download Invoice
                            </button>
                            {group.deliveryStatus !== 'Delivered' && group.deliveryStatus !== 'Completed' && (
                              <button
                                onClick={() => handleCancelOrder(group)}
                                style={{ alignSelf: 'flex-start', padding: '6px 12px', background: 'transparent', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                              >
                                ✕ Cancel Order
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {isDeliveredOrCompleted && (
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                        {group.orderCategory !== 'trial' && (
                          <button
                            onClick={() => openTrackOrder(group.id, group.orderCategory, 'schedule')}
                            style={{
                              padding: '12px 20px',
                              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              fontWeight: '700',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 10px rgba(99,102,241,0.25)',
                            }}
                          >
                            📅 View Daily Schedule & History
                          </button>
                        )}
                        {group.orderCategory !== 'trial' && (
                          <button
                            onClick={() => openDeliveryPaymentModal(group)}
                            style={{
                              padding: '12px 20px',
                              background: 'linear-gradient(135deg, #059669, #047857)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              fontWeight: '700',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 10px rgba(5,150,105,0.25)',
                            }}
                          >
                            💳 Pay for Deliveries (Daily / Weekly / Monthly)
                          </button>
                        )}
                        {group.orderCategory !== 'trial' && (
                          <button
                            onClick={() => {
                              setSelectedSubForExtra(group.id);
                              setShowRequests(true);
                            }}
                            style={{
                              padding: '12px 20px',
                              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              fontWeight: '700',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 10px rgba(2,132,199,0.25)',
                            }}
                          >
                            🥛 Request Extra Delivery
                          </button>
                        )}
                        <button onClick={() => downloadBill(group)} style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.2)' }}>
                          📄 Download Invoice
                        </button>
                      </div>
                    )}

                    {isRejected && (
                      <div style={{ background: '#fef2f2', borderRadius: '14px', padding: '16px 20px', border: '1px solid #fca5a5', color: '#991b1b', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>This order was cancelled. You may place a new order from the products page.</div>
                        <button
                          onClick={() => handleDeleteCancelledOrder(group)}
                          style={{ padding: '8px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          title="Delete cancelled order from view"
                        >
                          🗑️ Remove
                        </button>
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

      {/* Flexible Delivery Payment Modal (Daily / Weekly / Monthly / Delivered) */}
      {deliveryPayModal.open && deliveryPayModal.group && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, backdropFilter: 'blur(5px)', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px', maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                  💳 Delivery Payment
                </h2>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {deliveryPayModal.group.milkType || deliveryPayModal.group.items?.[0]?.milkType} · {deliveryPayModal.qty} {deliveryPayModal.unit}/day · Rs. {deliveryPayModal.dailyCost}/day
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryPayModal(prev => ({ ...prev, open: false }))}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Delivered Status Banner */}
            <div style={{ marginBottom: '20px', padding: '14px 18px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Delivered So Far</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>
                  {deliveryPayModal.deliveredCount} Days Delivered
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>Delivered Value</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#15803d' }}>
                  Rs. {deliveryPayModal.dailyCost * deliveryPayModal.deliveredCount}
                </div>
              </div>
            </div>

            {/* Options Selection Label */}
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Choose Payment Cycle / Frequency
            </div>

            {/* Options Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
              
              {/* Option 1: Delivered */}
              <div
                onClick={() => handleDeliveryOptionChange('DELIVERED')}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  border: deliveryPayModal.selectedOption === 'DELIVERED' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: deliveryPayModal.selectedOption === 'DELIVERED' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#15803d' }}>🥛 All Delivered</span>
                  {deliveryPayModal.selectedOption === 'DELIVERED' && <span style={{ color: '#16a34a', fontWeight: '800' }}>✓</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{deliveryPayModal.deliveredCount} Days Delivered</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                  Rs. {deliveryPayModal.dailyCost * deliveryPayModal.deliveredCount}
                </div>
              </div>

              {/* Option 2: Daily */}
              <div
                onClick={() => handleDeliveryOptionChange('DAILY')}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  border: deliveryPayModal.selectedOption === 'DAILY' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: deliveryPayModal.selectedOption === 'DAILY' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#1d4ed8' }}>📅 Daily (1 Day)</span>
                  {deliveryPayModal.selectedOption === 'DAILY' && <span style={{ color: '#2563eb', fontWeight: '800' }}>✓</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Per day delivery</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                  Rs. {deliveryPayModal.dailyCost}
                </div>
              </div>

              {/* Option 3: Weekly */}
              <div
                onClick={() => handleDeliveryOptionChange('WEEKLY')}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  border: deliveryPayModal.selectedOption === 'WEEKLY' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  background: deliveryPayModal.selectedOption === 'WEEKLY' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#6d28d9' }}>🗓️ Weekly (7 Days)</span>
                  {deliveryPayModal.selectedOption === 'WEEKLY' && <span style={{ color: '#7c3aed', fontWeight: '800' }}>✓</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>1 week of delivery</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                  Rs. {deliveryPayModal.dailyCost * 7}
                </div>
              </div>

              {/* Option 4: Monthly */}
              <div
                onClick={() => handleDeliveryOptionChange('MONTHLY')}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  border: deliveryPayModal.selectedOption === 'MONTHLY' ? '2px solid #d97706' : '1px solid #e2e8f0',
                  background: deliveryPayModal.selectedOption === 'MONTHLY' ? '#fffbeb' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#b45309' }}>📆 Monthly (30 Days)</span>
                  {deliveryPayModal.selectedOption === 'MONTHLY' && <span style={{ color: '#d97706', fontWeight: '800' }}>✓</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>1 month of delivery</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                  Rs. {deliveryPayModal.dailyCost * 30}
                </div>
              </div>

              {/* Option 5: Custom Days */}
              <div
                onClick={() => handleDeliveryOptionChange('CUSTOM')}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  border: deliveryPayModal.selectedOption === 'CUSTOM' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  background: deliveryPayModal.selectedOption === 'CUSTOM' ? '#f0f9ff' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1' }}>🔢 Custom Days</span>
                  {deliveryPayModal.selectedOption === 'CUSTOM' && <span style={{ color: '#0284c7', fontWeight: '800' }}>✓</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCustomDaysChange(deliveryPayModal.customDays - 1); }}
                    style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: '800' }}
                  >-</button>
                  <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>{deliveryPayModal.customDays}d</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCustomDaysChange(deliveryPayModal.customDays + 1); }}
                    style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: '800' }}
                  >+</button>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  Rs. {deliveryPayModal.dailyCost * deliveryPayModal.customDays}
                </div>
              </div>

              {/* Option 6: Full Subscription */}
              <div
                onClick={() => handleDeliveryOptionChange('FULL')}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  border: deliveryPayModal.selectedOption === 'FULL' ? '2px solid #475569' : '1px solid #e2e8f0',
                  background: deliveryPayModal.selectedOption === 'FULL' ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>📦 Full Balance</span>
                  {deliveryPayModal.selectedOption === 'FULL' && <span style={{ color: '#475569', fontWeight: '800' }}>✓</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>All {deliveryPayModal.totalDays} days</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                  Rs. {deliveryPayModal.dailyCost * deliveryPayModal.totalDays}
                </div>
              </div>

            </div>

            {/* Payment Method Selector */}
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Choose Payment Method
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setDeliveryPayModal(prev => ({ ...prev, method: 'ONLINE' }))}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '14px',
                  border: deliveryPayModal.method === 'ONLINE' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: deliveryPayModal.method === 'ONLINE' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>💳</span>
                <span>Online (UPI/Card)</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryPayModal(prev => ({ ...prev, method: 'CASH' }))}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '14px',
                  border: deliveryPayModal.method === 'CASH' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  background: deliveryPayModal.method === 'CASH' ? '#fffbeb' : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>💵</span>
                <span>Pay Cash to Partner</span>
              </button>
            </div>

            {/* Final Amount & Action Buttons */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Amount to Pay</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' }}>
                  {deliveryPayModal.selectedOption.toLowerCase()} payment ({deliveryPayModal.method.toLowerCase()})
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                Rs. {deliveryPayModal.amount}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeliveryPayModal(prev => ({ ...prev, open: false }))}
                style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDeliveryPayment}
                disabled={deliveryPaying}
                style={{
                  flex: 2,
                  padding: '14px',
                  background: deliveryPayModal.method === 'ONLINE' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: deliveryPaying ? 'not-allowed' : 'pointer',
                  opacity: deliveryPaying ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {deliveryPaying ? 'Processing...' : `Confirm & Pay Rs. ${deliveryPayModal.amount}`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Track Order Modal */}
      {trackModal.open && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) closeTrackModal(); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}
        >
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: trackModal.data?.dailySchedule ? '640px' : '480px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '20px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800' }}>
                  {trackModal.data?.dailySchedule ? '📅 Subscription Delivery Details' : '🚴 Track Order'}
                </div>
                {trackModal.data && (
                  <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                    {trackModal.data.customerName} · {trackModal.data.productName || trackModal.data.milkType} · {trackModal.data.dailyQuantity} {getUnit(trackModal.data)}/day
                  </div>
                )}
              </div>
              <button onClick={closeTrackModal} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Subscription Tab Switcher (if dailySchedule available) */}
            {trackModal.data?.dailySchedule && (
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setTrackTab('timeline')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: 'none',
                    borderBottom: trackTab === 'timeline' ? '3px solid #2563eb' : '3px solid transparent',
                    background: trackTab === 'timeline' ? 'white' : 'transparent',
                    fontWeight: trackTab === 'timeline' ? '800' : '600',
                    color: trackTab === 'timeline' ? '#1e40af' : '#64748b',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  🚴 Today's Live Status
                </button>
                <button
                  type="button"
                  onClick={() => setTrackTab('schedule')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: 'none',
                    borderBottom: trackTab === 'schedule' ? '3px solid #6366f1' : '3px solid transparent',
                    background: trackTab === 'schedule' ? 'white' : 'transparent',
                    fontWeight: trackTab === 'schedule' ? '800' : '600',
                    color: trackTab === 'schedule' ? '#4f46e5' : '#64748b',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  📅 Daily Schedule ({trackModal.data.dailySchedule.deliveredCount}/{trackModal.data.dailySchedule.totalDays} Days)
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {trackModal.loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                  <div>Loading delivery details...</div>
                </div>
              ) : trackModal.data ? (
                <>
                  {/* TAB 1: TIMELINE / TODAY'S LIVE TRACKING */}
                  {(!trackModal.data.dailySchedule || trackTab === 'timeline') && (
                    <>
                      {trackModal.data.dailySchedule && (
                        <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '13px', color: '#334155' }}>
                            <strong>Subscription Progress:</strong> {trackModal.data.dailySchedule.deliveredCount} of {trackModal.data.dailySchedule.totalDays} Days Delivered
                          </div>
                          <button
                            type="button"
                            onClick={() => setTrackTab('schedule')}
                            style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            View All {trackModal.data.dailySchedule.totalDays} Days ➔
                          </button>
                        </div>
                      )}

                      {trackModal.data.deliveryBoyName && (
                        <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚴</div>
                            <div>
                              <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>Your Delivery Partner</div>
                              <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '15px' }}>{trackModal.data.deliveryBoyName}</div>
                            </div>
                          </div>
                          {trackModal.data.deliveryBoy?.mobile && (
                            <a href={`tel:${trackModal.data.deliveryBoy.mobile}`} style={{ background: '#2563eb', color: 'white', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              📞 {trackModal.data.deliveryBoy.mobile}
                            </a>
                          )}
                        </div>
                      )}

                      {(trackModal.data.canCustomerConfirm || trackModal.data.awaitingUserConfirmation || (!['Delivered', 'DELIVERED'].includes(trackModal.data.deliveryStatus) && ['DELIVERY_PENDING_CUSTOMER_CONFIRMATION', 'AWAITING_USER_CONFIRMATION', 'ARRIVED', 'OUT_FOR_DELIVERY'].includes((trackModal.data.deliveryStatus || '').toUpperCase().replace(/ /g, '_')))) && (
                        <div style={{ marginBottom: '20px', padding: '16px 20px', background: 'linear-gradient(135deg, #ecfeff, #ccfbf1)', borderRadius: '16px', border: '2px solid #14b8a6', boxShadow: '0 4px 12px rgba(20,184,166,0.16)' }}>
                          <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>🥛 Confirm Delivery Received</div>
                          <div style={{ fontSize: '12px', color: '#115e59', marginTop: '4px' }}>The delivery partner has reached / handed over your milk product. Please confirm that you received your delivery.</div>
                          <button
                            type="button"
                            onClick={() => handleCustomerConfirmReceipt(trackModal.data.orderId, trackModal.data.orderType)}
                            style={{ marginTop: '12px', width: '100%', padding: '12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            ✅ Confirm Delivery Received
                          </button>
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

                      {['Delivered', 'DELIVERED'].includes(trackModal.data.deliveryStatus) && (
                        <div style={{ marginTop: '20px', padding: '18px 20px', background: '#f0fdf4', borderRadius: '16px', textAlign: 'center', border: '1px solid #86efac', boxShadow: '0 4px 14px rgba(22,163,74,0.12)' }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                          <div style={{ fontWeight: '800', color: '#15803d', fontSize: '16px' }}>
                            {trackModal.data.dailySchedule ? "Today's delivery completed successfully!" : "Your milk order has been delivered successfully!"}
                          </div>
                          <div style={{ fontSize: '13px', color: '#166534', marginTop: '6px', marginBottom: '16px', lineHeight: '1.4' }}>
                            {trackModal.data.dailySchedule
                              ? `Delivery has been recorded. You can view all upcoming days in the Daily Schedule tab.`
                              : `Order delivery confirmed successfully and synced with Admin and Delivery partner.`
                            }
                          </div>
                          {trackModal.data.dailySchedule && (
                            <button
                              type="button"
                              onClick={() => setTrackTab('schedule')}
                              style={{
                                width: '100%',
                                padding: '12px 20px',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '800',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                marginBottom: '10px'
                              }}
                            >
                              📅 View All {trackModal.data.dailySchedule.totalDays} Days Schedule
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => closeTrackModal()}
                            style={{
                              width: '100%',
                              padding: '11px 20px',
                              background: '#f1f5f9',
                              color: '#475569',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: '700',
                              fontSize: '14px',
                              cursor: 'pointer'
                            }}
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* TAB 2: ALL DAYS DAILY SCHEDULE */}
                  {trackModal.data.dailySchedule && trackTab === 'schedule' && (
                    <div>
                      {/* Flexible Delivery Payment Banner */}
                      <div style={{ marginBottom: '16px', padding: '14px 18px', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: '16px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            💳 Flexible Delivery Payment (Daily / Weekly / Monthly)
                          </div>
                          <div style={{ fontSize: '12px', color: '#047857', marginTop: '3px' }}>
                            Delivered so far: <strong>{trackModal.data.dailySchedule.deliveredCount} Days</strong> (Rs. {(trackModal.data.billingSummary?.dailyRate || (parseFloat(trackModal.data.dailyQuantity) * 650) || 650) * trackModal.data.dailySchedule.deliveredCount})
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const found = subscriptions.find(s => String(s.id) === String(trackModal.data.orderId));
                            if (found) {
                              openDeliveryPaymentModal(found, trackModal.data.dailySchedule.deliveredCount);
                            } else {
                              const dummyGroup = {
                                id: trackModal.data.orderId,
                                milkType: trackModal.data.milkType,
                                dailyQuantity: trackModal.data.dailyQuantity,
                                pricePerLitre: trackModal.data.billingSummary?.dailyRate || 650,
                                startDate: trackModal.data.dailySchedule.startDate,
                                endDate: trackModal.data.dailySchedule.endDate,
                                totalAmount: trackModal.data.billingSummary?.totalAmount || 40300,
                                deliveredCount: trackModal.data.dailySchedule.deliveredCount
                              };
                              openDeliveryPaymentModal(dummyGroup, trackModal.data.dailySchedule.deliveredCount);
                            }
                          }}
                          style={{
                            padding: '9px 18px',
                            background: 'linear-gradient(135deg, #059669, #047857)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          💳 Pay for Deliveries ➔
                        </button>
                      </div>

                      {/* Stats cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Days</div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{trackModal.data.dailySchedule.totalDays}</div>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Delivered</div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>{trackModal.data.dailySchedule.deliveredCount}</div>
                        </div>
                        <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '12px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '700', textTransform: 'uppercase' }}>Remaining</div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>{trackModal.data.dailySchedule.remainingCount}</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: '16px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', height: '10px' }}>
                        <div
                          style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #10b981, #059669)',
                            width: `${Math.round((trackModal.data.dailySchedule.deliveredCount / trackModal.data.dailySchedule.totalDays) * 100)}%`,
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>

                      {/* Filter buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setScheduleFilter('ALL')}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            background: scheduleFilter === 'ALL' ? '#1e293b' : '#f1f5f9',
                            color: scheduleFilter === 'ALL' ? 'white' : '#475569',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          All ({trackModal.data.dailySchedule.days.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleFilter('DELIVERED')}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            background: scheduleFilter === 'DELIVERED' ? '#16a34a' : '#f1f5f9',
                            color: scheduleFilter === 'DELIVERED' ? 'white' : '#475569',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          ✅ Delivered ({trackModal.data.dailySchedule.deliveredCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleFilter('UPCOMING')}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            background: scheduleFilter === 'UPCOMING' ? '#2563eb' : '#f1f5f9',
                            color: scheduleFilter === 'UPCOMING' ? 'white' : '#475569',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          ⏳ Upcoming / Scheduled ({trackModal.data.dailySchedule.remainingCount})
                        </button>
                      </div>

                      {/* Day-by-day list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {trackModal.data.dailySchedule.days
                          .filter(day => {
                            if (scheduleFilter === 'DELIVERED') return day.status === 'DELIVERED';
                            if (scheduleFilter === 'UPCOMING') return day.status !== 'DELIVERED';
                            return true;
                          })
                          .map((day) => {
                            const isDelivered = day.status === 'DELIVERED';
                            const isToday = day.isToday;
                            const hasExtra = day.extraQty > 0;

                            let badgeBg = '#f1f5f9';
                            let badgeColor = '#64748b';
                            let badgeText = day.statusLabel || 'Scheduled';

                            if (isDelivered) {
                              badgeBg = '#dcfce7';
                              badgeColor = '#15803d';
                              badgeText = '✅ Delivered';
                            } else if (day.status === 'ASSIGNED_TODAY') {
                              badgeBg = '#eff6ff';
                              badgeColor = '#1d4ed8';
                              badgeText = '🚴 Assigned for Today';
                            } else if (day.status === 'IN_PROGRESS') {
                              badgeBg = '#fef3c7';
                              badgeColor = '#b45309';
                              badgeText = `🚚 ${day.statusLabel}`;
                            } else if (day.status === 'SKIPPED') {
                              badgeBg = '#fee2e2';
                              badgeColor = '#b91c1c';
                              badgeText = '⏭️ Skipped';
                            }

                            return (
                              <div
                                key={day.dayNumber}
                                style={{
                                  padding: '12px 16px',
                                  borderRadius: '14px',
                                  background: isToday ? '#eff6ff' : isDelivered ? '#f0fdf4' : '#ffffff',
                                  border: isToday ? '2px solid #3b82f6' : isDelivered ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  boxShadow: isToday ? '0 4px 12px rgba(59,130,246,0.15)' : 'none'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      background: isToday ? '#3b82f6' : isDelivered ? '#16a34a' : '#e2e8f0',
                                      color: isToday || isDelivered ? 'white' : '#475569',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '13px',
                                      fontWeight: '800'
                                    }}>
                                      {day.dayNumber}
                                    </span>
                                    <div>
                                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {day.formattedDate} <span style={{ color: '#64748b', fontWeight: '500', fontSize: '12px' }}>({day.dayName})</span>
                                        {isToday && (
                                          <span style={{ background: '#3b82f6', color: 'white', padding: '1px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' }}>
                                            TODAY
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                                        Quantity: <strong>{day.quantity} {day.unit}</strong>
                                        {hasExtra && (
                                          <span style={{ marginLeft: '6px', color: '#0284c7', fontWeight: '700' }}>
                                            (+{day.extraQty} {day.unit} Extra)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: badgeBg, color: badgeColor }}>
                                    {badgeText}
                                  </span>
                                </div>

                                {/* Extra info footer (if delivery boy or deliveredAt) */}
                                {(day.deliveryBoyName || day.deliveredAt || isToday) && (
                                  <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
                                    <div>
                                      {day.deliveryBoyName && <span>👤 Partner: <strong style={{ color: '#334155' }}>{day.deliveryBoyName}</strong></span>}
                                      {day.deliveredAt && <span style={{ marginLeft: day.deliveryBoyName ? '10px' : 0 }}>🕒 {new Date(day.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                    </div>
                                    {isToday && (
                                      <button
                                        type="button"
                                        onClick={() => setTrackTab('timeline')}
                                        style={{
                                          border: 'none',
                                          background: '#2563eb',
                                          color: 'white',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Track Live ➔
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
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
