import React, { useState } from 'react';
import api from '../../services/api';

const RescheduleDeliveryModal = ({ isOpen, onClose, delivery, onRescheduled }) => {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !delivery) return null;

  const currentScheduled = delivery.deliveryDate || delivery.startDate || delivery.order?.startDate;
  const currentFormatted = currentScheduled
    ? new Date(currentScheduled).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Not set';

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!newDate) {
      setError('Please select a new delivery date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const assignmentId = delivery.id;
      const orderType = delivery.orderType || (delivery.requestedStartDate ? 'sub' : 'trial');
      const orderId = delivery.orderId || delivery.id;

      let res;
      if (assignmentId && !isNaN(assignmentId)) {
        res = await api.put(`/delivery/assignment/${assignmentId}/reschedule`, {
          newDate,
          reason,
        });
      } else {
        res = await api.put(`/delivery/reschedule/${orderType}/${orderId}`, {
          newDate,
          reason,
        });
      }

      if (onRescheduled) {
        onRescheduled(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to reschedule:', err);
      setError(err.response?.data?.message || 'Failed to update delivery date.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📅</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>
              Reschedule Delivery Date
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirm} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Customer / Order:
            </div>
            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14.5px' }}>
              {delivery.customerName || delivery.order?.customerName || 'Customer'} (Order #{delivery.orderId || delivery.id})
            </div>
          </div>

          <div
            style={{
              background: '#f1f5f9',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', color: '#475569' }}>Current Scheduled Date:</span>
            <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
              {currentFormatted}
            </span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontWeight: '600',
                color: '#334155',
                fontSize: '13.5px',
                marginBottom: '6px',
              }}
            >
              New Delivery Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontWeight: '600',
                color: '#334155',
                fontSize: '13.5px',
                marginBottom: '6px',
              }}
            >
              Reason / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Customer requested postponement, Weather delay"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#92400e',
              marginBottom: '20px',
            }}
          >
            ℹ️ Changing this date will automatically notify the Admin, assigned Delivery Boy, and Customer with special dashboard alerts.
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.3)',
              }}
            >
              {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleDeliveryModal;
