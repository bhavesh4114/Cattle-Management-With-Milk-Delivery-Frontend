import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const TYPE_ICONS = {
  NEW_BOOKING: '🛒',
  BOOKING_CONFIRMED: '🎉',
  LEAVE_REQUEST: '🏖️',
  LEAVE_APPROVED: '✅',
  DELIVERY_ASSIGNED: '🛵',
  DELIVERY_REASSIGNED: '🔄',
  REASSIGNMENT_REQUIRED: '⚠️',
  DELIVERY_DATE_CHANGED: '📅',
  DELIVERY_OUT_FOR_DELIVERY: '🚚',
  DELIVERY_COMPLETED: '✅',
  DELIVERY_COMPLETED_ADMIN: '✅',
  DELIVERY_FAILED: '❌',
  DELIVERY_CANCELLED: '🚫',
  DELIVERY_ISSUE: '⚠️',
  GENERAL: '🔔',
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

const NotificationCenter = ({ onNavigateTab }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('ALL'); // 'ALL' or 'UNREAD'
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/alerts/unread-count');
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      // Ignore auth/polling errors
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/alerts/notifications?limit=30');
      setNotifications(res.data || []);
      const unread = (res.data || []).filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/alerts/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/alerts/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleActionClick = async (notif, e) => {
    e.stopPropagation();
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    // If an actionUrl or actionType is set, route appropriately
    if (notif.actionUrl) {
      if (notif.actionUrl.includes('?tab=')) {
        const tab = notif.actionUrl.split('?tab=')[1];
        if (onNavigateTab) {
          onNavigateTab(tab);
          return;
        }
      }
      navigate(notif.actionUrl);
      return;
    }

    if (notif.actionType === 'ASSIGN_NOW') {
      if (onNavigateTab) onNavigateTab('reassignment-queue');
      else navigate('/milk-admin/dashboard?tab=reassignment-queue');
    } else if (notif.actionType === 'VIEW_DELIVERIES' || notif.actionType === 'VIEW_DELIVERY') {
      if (notif.role === 'DELIVERY_BOY' || window.location.pathname.includes('milk-admin')) {
        if (onNavigateTab) onNavigateTab('my-deliveries');
        else navigate('/milk-admin/dashboard?tab=my-deliveries');
      } else {
        navigate('/admin/products');
      }
    } else if (notif.actionType === 'VIEW_REQUEST') {
      if (onNavigateTab) onNavigateTab('delivery-leaves');
      else navigate('/milk-admin/dashboard?tab=delivery-leaves');
    }
  };

  const displayedList = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: isOpen ? '#f1f5f9' : 'transparent',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          color: '#1e293b',
        }}
        title="Notifications"
        aria-label="Notifications"
      >
        <span style={{ fontSize: '20px' }}>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: 'white',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 6px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(239,68,68,0.4)',
              animation: 'pulse 2s infinite',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '520px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '8px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <button
              onClick={() => setFilter('ALL')}
              style={{
                background: filter === 'ALL' ? '#1e3a8a' : 'white',
                color: filter === 'ALL' ? 'white' : '#64748b',
                border: '1px solid',
                borderColor: filter === 'ALL' ? '#1e3a8a' : '#e2e8f0',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              style={{
                background: filter === 'UNREAD' ? '#1e3a8a' : 'white',
                color: filter === 'UNREAD' ? 'white' : '#64748b',
                border: '1px solid',
                borderColor: filter === 'UNREAD' ? '#1e3a8a' : '#e2e8f0',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '380px' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                Loading notifications...
              </div>
            ) : displayedList.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                <div style={{ fontWeight: '600', color: '#334155', fontSize: '14px' }}>
                  All caught up!
                </div>
                <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                  No {filter === 'UNREAD' ? 'unread ' : ''}notifications right now.
                </div>
              </div>
            ) : (
              displayedList.map((notif) => {
                const icon = TYPE_ICONS[notif.type] || '🔔';
                const hasAction = Boolean(notif.actionType || notif.actionUrl);
                const actionLabel =
                  notif.actionType === 'ASSIGN_NOW'
                    ? 'Assign Now'
                    : notif.actionType === 'VIEW_REQUEST'
                    ? 'View Request'
                    : notif.actionType === 'VIEW_DELIVERIES'
                    ? 'View Deliveries'
                    : 'View Delivery';

                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid #f8fafc',
                      background: notif.isRead ? 'white' : '#f0f7ff',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: notif.isRead ? '#f1f5f9' : '#dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '3px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: notif.isRead ? '600' : '700',
                            color: '#1e293b',
                            fontSize: '13.5px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {notif.title || notif.type.replace(/_/g, ' ')}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            flexShrink: 0,
                          }}
                        >
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '12.5px',
                          color: '#475569',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                          marginBottom: hasAction ? '8px' : '0',
                        }}
                      >
                        {notif.message}
                      </div>

                      {/* Action CTA Button */}
                      {hasAction && (
                        <div style={{ marginTop: '6px' }}>
                          <button
                            onClick={(e) => handleActionClick(notif, e)}
                            style={{
                              padding: '5px 12px',
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                            }}
                          >
                            {actionLabel}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#2563eb',
                          flexShrink: 0,
                          marginTop: '6px',
                        }}
                        title="Unread"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
