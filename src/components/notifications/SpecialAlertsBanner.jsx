import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const SpecialAlertsBanner = ({ onNavigateTab, userRole = null }) => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [dismissingId, setDismissingId] = useState(null);

  const fetchSpecialAlerts = async () => {
    try {
      const res = await api.get('/alerts/special-alerts');
      setAlerts(res.data || []);
    } catch (err) {
      // Ignore polling errors
    }
  };

  useEffect(() => {
    fetchSpecialAlerts();
    const interval = setInterval(fetchSpecialAlerts, 15000);
    const handleUpdate = () => fetchSpecialAlerts();
    window.addEventListener("refresh-notifications", handleUpdate);
    window.addEventListener("delivery-status-updated", handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-notifications", handleUpdate);
      window.removeEventListener("delivery-status-updated", handleUpdate);
    };
  }, []);

  const handleDismiss = async (alertId) => {
    setDismissingId(alertId);
    try {
      await api.put(`/alerts/${alertId}/dismiss`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    } finally {
      setDismissingId(null);
    }
  };

  const handleAction = async (alert) => {
    // Dismiss or keep as viewed
    try {
      await api.put(`/alerts/${alert.id}/read`);
    } catch (e) {}

    // Determine target tab from actionUrl or actionType
    let targetTab = null;
    if (alert.actionUrl && alert.actionUrl.includes('?tab=')) {
      targetTab = alert.actionUrl.split('?tab=')[1].split('&')[0];
    } else if (alert.actionType === 'ASSIGN_NOW') {
      targetTab = 'reassignment-queue';
    } else if (alert.actionType === 'VIEW_DELIVERIES') {
      targetTab = userRole === 'DELIVERY_BOY' ? 'my-deliveries' : 'delivery';
    } else if (alert.actionType === 'VIEW_DELIVERY') {
      targetTab = userRole === 'DELIVERY_BOY' ? 'my-deliveries' : 'orders';
    } else if (alert.actionType === 'VIEW_REQUEST') {
      targetTab = 'delivery-leaves';
    }

    if (targetTab && onNavigateTab) {
      onNavigateTab(targetTab);
      return;
    }

    const isCustomer = userRole === 'USER' || (!window.location.pathname.includes('milk-admin') && userRole !== 'DELIVERY_BOY');

    if (isCustomer && (alert.actionType === 'TRACK_DELIVERY' || alert.actionType === 'VIEW_DELIVERY' || alert.type?.includes('DELIVERY'))) {
      const orderId = alert.orderId || alert.entityId;
      const orderType = alert.orderType || 'trial';
      window.dispatchEvent(
        new CustomEvent('open-delivery-tracking', {
          detail: { orderId, orderType }
        })
      );
      navigate(`/admin/products?tab=track${orderId ? `&orderId=${orderId}&orderType=${orderType}` : ''}`);
      return;
    }

    if (alert.actionUrl) {
      if (isCustomer && alert.actionUrl.includes('/admin/products')) {
        const orderId = alert.orderId || alert.entityId;
        const orderType = alert.orderType || 'trial';
        window.dispatchEvent(
          new CustomEvent('open-delivery-tracking', {
            detail: { orderId, orderType }
          })
        );
      }
      navigate(alert.actionUrl);
      return;
    }

    if (alert.actionType === 'ASSIGN_NOW') {
      navigate('/milk-admin/dashboard?tab=reassignment-queue');
    } else if (alert.actionType === 'VIEW_DELIVERIES') {
      navigate(userRole === 'DELIVERY_BOY' ? '/milk-admin/dashboard?tab=my-deliveries' : '/milk-admin/dashboard?tab=delivery');
    } else if (alert.actionType === 'VIEW_DELIVERY') {
      if (userRole === 'DELIVERY_BOY' || window.location.pathname.includes('milk-admin')) {
        navigate('/milk-admin/dashboard?tab=my-deliveries');
      } else {
        const orderId = alert.orderId || alert.entityId;
        const orderType = alert.orderType || 'trial';
        window.dispatchEvent(
          new CustomEvent('open-delivery-tracking', {
            detail: { orderId, orderType }
          })
        );
        navigate(`/admin/products?tab=track${orderId ? `&orderId=${orderId}&orderType=${orderType}` : ''}`);
      }
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {alerts.map((alert) => {
        const isReassignmentReq = alert.type === 'REASSIGNMENT_REQUIRED';
        const isDateChanged = alert.type === 'DELIVERY_DATE_CHANGED';
        const isNewAssigned = alert.type === 'DELIVERY_ASSIGNED';
        const isIssueOrFailed = alert.type === 'DELIVERY_ISSUE' || alert.type === 'DELIVERY_FAILED';

        // Style themes
        let bg = '#fffbeb';
        let border = '#fde68a';
        let text = '#92400e';
        let btnBg = '#d97706';
        let btnColor = 'white';

        if (isReassignmentReq || isIssueOrFailed) {
          bg = '#fef2f2';
          border = '#fecaca';
          text = '#991b1b';
          btnBg = '#dc2626';
        } else if (isNewAssigned) {
          bg = '#f0fdf4';
          border = '#bbf7d0';
          text = '#166534';
          btnBg = '#16a34a';
        }

        const actionText =
          alert.actionType === 'ASSIGN_NOW'
            ? 'Assign Now'
            : alert.actionType === 'VIEW_DELIVERIES'
            ? 'View Deliveries'
            : 'View Delivery';

        return (
          <div
            key={alert.id}
            style={{
              background: bg,
              border: `1.5px solid ${border}`,
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '260px' }}>
              <span style={{ fontSize: '26px', flexShrink: 0 }}>
                {isReassignmentReq
                  ? '⚠️'
                  : isDateChanged
                  ? '📅'
                  : isNewAssigned
                  ? '🔔'
                  : '⚠️'}
              </span>
              <div>
                <div style={{ fontWeight: '800', color: text, fontSize: '15px' }}>
                  {alert.title}
                </div>
                <div
                  style={{
                    color: text,
                    fontSize: '13.5px',
                    marginTop: '3px',
                    whiteSpace: 'pre-line',
                    lineHeight: '1.45',
                  }}
                >
                  {alert.message}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => handleAction(alert)}
                style={{
                  background: btnBg,
                  color: btnColor,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap',
                }}
              >
                {actionText}
              </button>

              <button
                onClick={() => handleDismiss(alert.id)}
                disabled={dismissingId === alert.id}
                title="Dismiss Alert"
                style={{
                  background: 'transparent',
                  border: `1px solid ${border}`,
                  color: text,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SpecialAlertsBanner;
