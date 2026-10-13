import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import UserOrderTracking from './UserOrderTracking';
import MilkDeliveryRequestsCustomer from '../../milk-admin/pages/requests/MilkDeliveryRequestsCustomer';
import AlertPopup from '../components/AlertPopup';
import NotificationCenter from '../../../components/notifications/NotificationCenter';
import SpecialAlertsBanner from '../../../components/notifications/SpecialAlertsBanner';
import ErrorBoundary from '../../../components/ErrorBoundary';
import { MessageCircle } from 'lucide-react';
import SupportChatModal from '../../chat/components/SupportChatModal';
import chatApi from '../../../services/chatApi';

const INITIAL_DISCOUNTS = [
  {
    id: 1,
    code: "WELCOME50",
    description: "50% Off on First Single Trial Order",
    discountType: "PERCENTAGE",
    value: 50,
    minOrderAmount: 100,
    maxDiscount: 150,
    validUntil: "2026-12-31",
    status: "ACTIVE",
    targetProductName: "",
    redemptionsCount: 42
  },
  {
    id: 2,
    code: "FRESH10",
    description: "10% Off on Monthly Cow Milk Subscriptions",
    discountType: "PERCENTAGE",
    value: 10,
    minOrderAmount: 1500,
    maxDiscount: 300,
    validUntil: "2026-11-30",
    status: "ACTIVE",
    targetProductName: "Cow Milk",
    redemptionsCount: 88
  },
  {
    id: 3,
    code: "DIWALI100",
    description: "Flat Rs. 100 Off on Bulk Festival Milk Deliveries",
    discountType: "FLAT",
    value: 100,
    minOrderAmount: 800,
    maxDiscount: 100,
    validUntil: "2026-11-15",
    status: "ACTIVE",
    targetProductName: "",
    redemptionsCount: 19
  },
  {
    id: 4,
    code: "SUMMER20",
    description: "Summer Chaas & Milk Special Offer",
    discountType: "PERCENTAGE",
    value: 20,
    minOrderAmount: 500,
    maxDiscount: 200,
    validUntil: "2026-06-30",
    status: "EXPIRED",
    targetProductName: "Fresh Chaas",
    redemptionsCount: 114
  }
];

const UserProducts = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ text: '', type: '' });
    const [showOrders, setShowOrders] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [targetTrackOrder, setTargetTrackOrder] = useState(null);
    const [showSupportChat, setShowSupportChat] = useState(false);
    const [userUnreadChatCount, setUserUnreadChatCount] = useState(0);

    useEffect(() => {
        const fetchChatUnread = async () => {
            try {
                const data = await chatApi.getUnreadCount();
                setUserUnreadChatCount(data?.total || 0);
            } catch {
                // silent
            }
        };
        fetchChatUnread();
        const interval = setInterval(fetchChatUnread, 15000);
        return () => clearInterval(interval);
    }, [showSupportChat]);

    // Discounts state synchronized from admin offers
    const [discounts, setDiscounts] = useState(() => {
        try {
            const saved = localStorage.getItem('milkAdminDiscounts');
            if (saved) {
                const parsed = JSON.parse(saved);
                return (parsed || []).filter(d => !d.isReferralReward || d.isPersonal);
            }
            return (INITIAL_DISCOUNTS || []).filter(d => !d.isReferralReward);
        } catch {
            return (INITIAL_DISCOUNTS || []).filter(d => !d.isReferralReward);
        }
    });
    const [selectedCouponCode, setSelectedCouponCode] = useState('');
    const [appliedCouponData, setAppliedCouponData] = useState(null);

    const fetchDiscounts = async () => {
        try {
            const [activeRes, myCouponsRes] = await Promise.all([
                api.get('/coupons/active').catch(() => ({ data: [] })),
                api.get('/coupons/my-coupons').catch(() => ({ data: [] })),
            ]);

            const publicCoupons = (activeRes.data || []).filter(c => !c.isReferralReward);
            const myCoupons = (myCouponsRes.data || [])
                .filter(uc => uc.status === 'ACTIVE' && uc.coupon)
                .map(uc => ({
                    ...uc.coupon,
                    isPersonal: true,
                    userCouponId: uc.id,
                }));

            const mergedMap = new Map();
            if (publicCoupons.length > 0 || myCoupons.length > 0) {
                publicCoupons.forEach(d => {
                    if (d.code) mergedMap.set(d.code.toUpperCase(), d);
                });
                myCoupons.forEach(d => {
                    if (d.code) mergedMap.set(d.code.toUpperCase(), d);
                });
            } else {
                (INITIAL_DISCOUNTS || []).forEach(d => {
                    if (d.code && !d.isReferralReward) mergedMap.set(d.code.toUpperCase(), d);
                });
            }

            const combined = Array.from(mergedMap.values());
            setDiscounts(combined);
            localStorage.setItem('milkAdminDiscounts', JSON.stringify(combined));
        } catch (err) {
            console.error('Failed to fetch coupons', err);
        }
    };

    useEffect(() => {
        fetchDiscounts();
        const handleDiscountsUpdated = (e) => {
            if (e.detail) {
                setDiscounts(e.detail);
            } else {
                fetchDiscounts();
            }
        };
        const handleStorage = (e) => {
            if (e.key === 'milkAdminDiscounts' && e.newValue) {
                try {
                    setDiscounts(JSON.parse(e.newValue));
                } catch {}
            }
        };
        window.addEventListener('milk-discounts-updated', handleDiscountsUpdated);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('milk-discounts-updated', handleDiscountsUpdated);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const activeDiscounts = useMemo(() => {
        return (discounts || []).filter(d => d.status === 'ACTIVE');
    }, [discounts]);

    // Primary percentage discount applied to catalog products
    const bestPercentDiscount = useMemo(() => {
        const percentList = activeDiscounts.filter(d => d.discountType === 'PERCENTAGE');
        if (percentList.length === 0) return null;
        return [...percentList].sort((a, b) => b.value - a.value)[0];
    }, [activeDiscounts]);

    // Calculate discounted price for any product (supporting specific product discounts)
    const getProductPriceInfo = (rawPrice, productName, productId) => {
        const originalPrice = parseFloat(rawPrice) || 0;

        // 1. Check if an active discount specifically targets this product
        const specificDiscount = activeDiscounts.find((d) => {
            if (!d.targetProductName) return false;
            const target = d.targetProductName.trim().toLowerCase();
            const curr = (productName || '').trim().toLowerCase();
            return target === curr || (productId && d.targetProductId === productId);
        });

        // 2. Otherwise use general discount (where targetProductName is empty or 'ALL')
        const generalDiscount = activeDiscounts
            .filter((d) => (!d.targetProductName || d.targetProductName === 'ALL') && d.discountType === 'PERCENTAGE')
            .sort((a, b) => b.value - a.value)[0] || bestPercentDiscount;

        const discountToApply = specificDiscount || generalDiscount;

        if (!discountToApply || discountToApply.value <= 0) {
            return {
                originalPrice,
                discountedPrice: originalPrice,
                hasDiscount: false,
                discountPercent: 0,
                discountAmount: 0,
                coupon: null,
                isSpecific: false
            };
        }

        let discount = 0;
        let percent = 0;
        if (discountToApply.discountType === 'PERCENTAGE') {
            percent = discountToApply.value;
            discount = (originalPrice * percent) / 100;
            if (discountToApply.maxDiscount && discount > discountToApply.maxDiscount) {
                discount = discountToApply.maxDiscount;
            }
        } else {
            // Flat amount
            discount = Math.min(originalPrice, discountToApply.value);
            percent = Math.round((discount / originalPrice) * 100);
        }

        const discountedPrice = Math.max(1, Math.round(originalPrice - discount));

        return {
            originalPrice,
            discountedPrice,
            hasDiscount: true,
            discountPercent: percent,
            discountAmount: originalPrice - discountedPrice,
            coupon: discountToApply,
            isSpecific: !!discountToApply.targetProductName
        };
    };

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

    const adminData = (() => {
        try {
            return JSON.parse(localStorage.getItem('adminData') || '{}');
        } catch { return {}; }
    })();

    const [orderType, setOrderType] = useState('Single'); // 'Single' or 'Subscription'
    const [form, setForm] = useState({
        quantity: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        customerName: adminData?.name || '',
        phone: adminData?.mobile || adminData?.phone || '',
        address: '',
        pincode: '',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Coupon states for checkout
    const [appliedCouponCode, setAppliedCouponCode] = useState('');
    const [couponInput, setCouponInput] = useState('');
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');

    const handleApplyCoupon = async (rawCode) => {
        const code = (rawCode || couponInput || '').trim().toUpperCase();
        setCouponError('');
        setCouponSuccess('');

        if (!code) {
            setCouponError('Please enter a coupon code.');
            return;
        }

        const days = orderType === 'Single' ? 1 : Math.max(1, Math.round(((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1));
        const baseDaily = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const baseTotal = baseDaily * days;

        // 1. Try server-side validation against database coupons (including referral rewards)
        try {
            const res = await api.post('/coupons/validate', {
                code,
                orderTotal: baseTotal,
                productName: cart.length === 1 ? cart[0].name : 'ALL',
            });

            if (res.data?.valid && res.data?.coupon) {
                const couponData = res.data.coupon;
                setAppliedCouponData(couponData);
                setAppliedCouponCode(couponData.code);
                setCouponInput(couponData.code);
                const msg = res.data?.message || `Coupon "${couponData.code}" applied successfully! 🎉 (₹${res.data.discountAmount || couponData.value} off)`;
                setCouponSuccess(msg);
                return;
            }
        } catch (apiErr) {
            const errMsg = apiErr.response?.data?.message;
            if (errMsg) {
                setCouponError(errMsg);
                return;
            }
        }

        // 2. Fallback to locally cached active discounts
        const found = discounts.find(d => (d.code || '').trim().toUpperCase() === code);
        if (!found) {
            setCouponError(`Coupon code "${code}" is invalid or does not exist.`);
            return;
        }

        if (found.status !== 'ACTIVE') {
            setCouponError(`Coupon "${code}" is currently inactive or expired.`);
            return;
        }

        // Check if coupon is restricted to a specific product
        if (found.targetProductName && found.targetProductName !== 'ALL') {
            const matchesInCart = cart.some(item => (item.name || '').trim().toLowerCase() === found.targetProductName.trim().toLowerCase());
            if (!matchesInCart) {
                setCouponError(`Coupon "${code}" is only valid for "${found.targetProductName}". Please add it to your cart first.`);
                return;
            }
        }

        // Check minimum order amount if set
        if (found.minOrderAmount && baseTotal < parseFloat(found.minOrderAmount)) {
            setCouponError(`Minimum order amount of ₹${found.minOrderAmount} required for this coupon.`);
            return;
        }

        setAppliedCouponData(found);
        setAppliedCouponCode(found.code);
        setCouponInput(found.code);
        setCouponSuccess(`Coupon "${found.code}" applied successfully! 🎉`);
    };

    const handleRemoveCoupon = () => {
        setAppliedCouponData(null);
        setAppliedCouponCode('');
        setCouponInput('');
        setCouponError('');
        setCouponSuccess('');
    };

    // Persist cart to localStorage and dispatch event whenever it changes
    useEffect(() => {
        localStorage.setItem('userProductCart', JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: cart.length } }));
    }, [cart]);

    const [activeOrders, setActiveOrders] = useState([]);

    useEffect(() => {
        fetchProducts();
        fetchMyOrders();
    }, []);

    const [hasActiveMonthlySub, setHasActiveMonthlySub] = useState(false);

    const fetchMyOrders = async () => {
        try {
            const [subRes, trialRes, ctxRes] = await Promise.all([
                api.get('/milk-module/subscription/my-subscriptions').catch(() => ({ data: [] })),
                api.get('/milk-module/trial/my-trials').catch(() => ({ data: [] })),
                api.get('/milk-delivery-requests/customer-context').catch(() => ({ data: {} }))
            ]);
            const all = [...(subRes.data || []), ...(trialRes.data || [])];
            setActiveOrders(all.filter(o => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status)));

            // Has active monthly subscription: verified from customer-context or active sub list
            const hasActive = !!ctxRes.data?.hasActiveSubscription || (subRes.data || []).some(s => s.status === 'ACTIVE');
            setHasActiveMonthlySub(hasActive);
        } catch (e) {
            console.error(e);
        }
    };

    // Watch query params: if tab=extra-delivery, open MilkDeliveryRequestsCustomer; if tab=track or tab=orders or orderId, open Tracking
    useEffect(() => {
        const tab = searchParams.get('tab');
        const qOrderId = searchParams.get('orderId');
        const qOrderType = searchParams.get('orderType');

        if (tab === 'cart') {
            setShowCart(true);
            setShowOrders(false);
            setShowRequests(false);
            setViewingProduct(null);
        } else if (tab === 'extra-delivery' || tab === 'requests') {
            setShowRequests(true);
            setShowOrders(false);
            setTargetTrackOrder(null);
        } else if (tab === 'track' || tab === 'orders' || qOrderId) {
            setShowOrders(true);
            setShowRequests(false);
            if (qOrderId) {
                setTargetTrackOrder({
                    orderId: parseInt(qOrderId, 10) || qOrderId,
                    orderType: qOrderType || 'trial'
                });
            }
        }
    }, [searchParams]);

    // Listen for custom 'open-extra-delivery-requests' event from alerts/notifications
    useEffect(() => {
        const handleOpenRequests = () => {
            setShowRequests(true);
            setShowOrders(false);
            setTargetTrackOrder(null);
        };

        window.addEventListener('open-extra-delivery-requests', handleOpenRequests);
        return () => window.removeEventListener('open-extra-delivery-requests', handleOpenRequests);
    }, []);

    // Listen for custom 'open-delivery-tracking' event from notifications or alerts
    useEffect(() => {
        const handleOpenTracking = (e) => {
            const { orderId, orderType } = e.detail || {};
            setShowOrders(true);
            setShowRequests(false);
            if (orderId) {
                setTargetTrackOrder({
                    orderId: parseInt(orderId, 10) || orderId,
                    orderType: orderType || 'trial'
                });
            }
        };

        window.addEventListener('open-delivery-tracking', handleOpenTracking);
        return () => window.removeEventListener('open-delivery-tracking', handleOpenTracking);
    }, []);

    // Listen for custom 'open-cart' event from topbar / navigation
    useEffect(() => {
        const handleOpenCart = () => {
            setShowCart(true);
            setShowOrders(false);
            setShowRequests(false);
            setViewingProduct(null);
        };

        window.addEventListener('open-cart', handleOpenCart);
        return () => window.removeEventListener('open-cart', handleOpenCart);
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products/active');
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
        const existingInCart = cart.find(p => p.id === product.id);
        if (existingInCart) {
            showToast('This product is already saved in the cart, you cannot add it again.', 'error');
            return;
        }

        const alreadyOrdered = activeOrders.find(o => o.productId === product.id || o.milkType === product.name);
        if (alreadyOrdered) {
            showToast('You already have an active order for this product. You cannot order it again until it is completed.', 'error');
            return;
        }

        setCart(prev => [...prev, { ...product, quantity: 1 }]);
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
        setCouponError('');
        setCouponSuccess('');
        setForm(prev => ({
            ...prev,
            customerName: adminData?.name || prev.customerName || '',
            phone: adminData?.mobile || adminData?.phone || prev.phone || '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        }));
        setSelectedProduct(true); // using this as a boolean to show checkout modal
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return;
        setSubmitting(true);
        try {
            const appliedCoupon = appliedCouponCode ? activeDiscounts.find(d => d.code.toUpperCase() === appliedCouponCode.toUpperCase()) : null;

            for (const item of cart) {
                let unitDiscount = 0;
                if (appliedCoupon) {
                    const isSpecific = appliedCoupon.targetProductName && appliedCoupon.targetProductName !== 'ALL';
                    const matches = !isSpecific || ((item.name || '').trim().toLowerCase() === appliedCoupon.targetProductName.trim().toLowerCase());
                    if (matches) {
                        if (appliedCoupon.discountType === 'PERCENTAGE') {
                            unitDiscount = (item.price * appliedCoupon.value) / 100;
                            if (appliedCoupon.maxDiscount && unitDiscount > appliedCoupon.maxDiscount) {
                                unitDiscount = appliedCoupon.maxDiscount;
                            }
                        } else if (appliedCoupon.discountType === 'FLAT') {
                            unitDiscount = Math.min(item.price, appliedCoupon.value);
                        }
                    }
                }
                const unitPrice = Math.max(0, Math.round((item.price - unitDiscount) * 100) / 100);
                const promoInfo = (appliedCoupon && unitDiscount > 0)
                    ? `[Coupon: ${appliedCoupon.code} Applied, Unit Price: Rs. ${unitPrice}] ` 
                    : '';
                const finalNotes = (promoInfo + (form.notes || '')).trim();

                if (orderType === 'Single') {
                    await api.post('/milk-module/trial/submit-request', {
                        customerName: form.customerName,
                        phone: form.phone,
                        address: form.address,
                        pincode: form.pincode,
                        milkType: item.name,
                        productId: item.id,
                        dailyQuantity: parseFloat(item.quantity),
                        startDate: form.startDate,
                        endDate: form.startDate,
                        notes: finalNotes
                    });
                } else {
                    await api.post('/milk-module/subscription/submit-request', {
                        customerName: form.customerName,
                        phone: form.phone,
                        address: form.address,
                        pincode: form.pincode,
                        milkType: item.name,
                        productId: item.id,
                        dailyQuantity: parseFloat(item.quantity),
                        startDate: form.startDate,
                        endDate: form.endDate,
                        notes: finalNotes
                    });
                }
            }
            if (appliedCouponCode) {
                try {
                    await api.post('/coupons/redeem', { code: appliedCouponCode });
                } catch (e) {
                    console.warn('Coupon redeem tracking notice', e);
                }
            }
            showToast(orderType === 'Single' ? 'Order placed successfully!' : 'Subscription requested!');
            setCart([]);
            setShowCart(false);
            setSelectedProduct(null);
            setAppliedCouponCode('');
            setAppliedCouponData(null);
            setCouponInput('');
            setCouponError('');
            setCouponSuccess('');
            // Show the orders tracking page
            setTimeout(() => setShowOrders(true), 1200);
        } catch (error) {
            console.error(error);
            showToast('Failed to place order', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (showRequests) {
        return (
            <ErrorBoundary onReset={() => setShowRequests(false)}>
                <MilkDeliveryRequestsCustomer onBack={() => setShowRequests(false)} />
            </ErrorBoundary>
        );
    }

    if (showOrders) {
        return (
            <UserOrderTracking
                onBack={() => {
                    setShowOrders(false);
                    setTargetTrackOrder(null);
                    setSearchParams({});
                }}
                initialTrackOrder={targetTrackOrder}
            />
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
            <AlertPopup />
            <SpecialAlertsBanner userRole="USER" />
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
                {activeDiscounts.length > 0 && (
                    <div style={{ marginTop: '14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7', fontSize: '0.9rem', fontWeight: '600' }}>
                        <span>🎉</span>
                        <span>
                            Special Offer Active: <strong>{bestPercentDiscount?.code || activeDiscounts[0].code}</strong> ({bestPercentDiscount ? `${bestPercentDiscount.value}% OFF` : activeDiscounts[0].description}) applied!
                        </span>
                    </div>
                )}
                <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <NotificationCenter />
                    {hasActiveMonthlySub && (
                        <button onClick={() => { setShowRequests(true); setShowCart(false); }} style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: '20px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)' }}>
                            🥛 Extra Delivery
                        </button>
                    )}
                    <button onClick={() => { setShowOrders(true); setShowCart(false); }} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📦 My Orders
                    </button>
                </div>
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
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                {(() => {
                                                    const cPrice = getProductPriceInfo(item.price, item.name, item.id);
                                                    if (cPrice.hasDiscount) {
                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: '700', color: '#16a34a', fontSize: '1.05rem' }}>₹{cPrice.discountedPrice}</span>
                                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through' }}>₹{cPrice.originalPrice}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return <span style={{ fontWeight: '600', color: '#3b82f6' }}>₹{item.price}</span>;
                                                })()}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                                                    <button onClick={() => updateCartQty(item.id, -1)} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                                    <span style={{ padding: '0 16px', fontWeight: '600' }}>{item.quantity}</span>
                                                    <button onClick={() => updateCartQty(item.id, 1)} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }}>
                                                ₹{getProductPriceInfo(item.price, item.name, item.id).discountedPrice * item.quantity}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <button onClick={() => removeFromCart(item.id)} style={{ padding: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {(() => {
                                const origTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                const discTotal = cart.reduce((sum, item) => sum + (getProductPriceInfo(item.price, item.name, item.id).discountedPrice * item.quantity), 0);
                                const savings = origTotal - discTotal;
                                return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '18px 24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '16px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                                Subtotal MRP: <span style={{ textDecoration: savings > 0 ? 'line-through' : 'none', fontWeight: '600' }}>₹{origTotal.toFixed(2)}</span>
                                            </div>
                                            {savings > 0 && (
                                                <div style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.95rem', marginTop: '2px' }}>
                                                    🎉 Offer Applied ({bestPercentDiscount?.code || 'DISCOUNT'}): You save ₹{savings.toFixed(2)}!
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                                            Payable Amount: <span style={{ color: '#16a34a' }}>₹{discTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                );
                            })()}

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                                {(() => {
                                    const vPrice = getProductPriceInfo(viewingProduct.price, viewingProduct.name, viewingProduct.id);
                                    if (vPrice.hasDiscount) {
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '2.4rem', fontWeight: '800', color: '#16a34a' }}>₹{vPrice.discountedPrice}</span>
                                                <span style={{ fontSize: '1.4rem', fontWeight: '600', color: '#94a3b8', textDecoration: 'line-through' }}>₹{vPrice.originalPrice}</span>
                                                <span style={{ padding: '4px 10px', background: '#dcfce7', color: '#15803d', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem' }}>
                                                    🏷️ {vPrice.discountPercent}% OFF ({vPrice.coupon?.code}{vPrice.isSpecific ? ` - Exclusive for ${viewingProduct.name}` : ''})
                                                </span>
                                                <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '600' }}>
                                                    You save ₹{vPrice.discountAmount} per unit!
                                                </span>
                                            </div>
                                        );
                                    }
                                    return <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#3b82f6' }}>₹{viewingProduct.price}</span>;
                                })()}
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
                                <button onClick={() => { 
                                    const existingInCart = cart.find(p => p.id === viewingProduct.id);
                                    const alreadyOrdered = activeOrders.find(o => o.productId === viewingProduct.id || o.milkType === viewingProduct.name);
                                    
                                    if (alreadyOrdered) {
                                        showToast('You already have an active order for this product. You cannot order it again until it is completed.', 'error');
                                        return;
                                    }
                                    
                                    if (!existingInCart) {
                                        setCart(prev => [...prev, { ...viewingProduct, quantity: 1 }]);
                                    }
                                    setViewingProduct(null); 
                                    setShowCart(false); 
                                    openCheckoutModal('Single'); 
                                }} style={{ flex: 1, padding: '16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', transition: 'background 0.2s ease', boxShadow: '0 10px 15px -3px rgba(15,23,42,0.3)' }}
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
                    {products.map(p => {
                        const priceInfo = getProductPriceInfo(p.price, p.name, p.id);
                        return (
                        <div key={p.id} style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)', transition: 'transform 0.3s ease, box-shadow 0.3s ease', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)'; }}>
                            <div style={{ position: 'relative', height: '130px', background: p.image ? `url(${p.image}) center/contain no-repeat #ffffff` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                {!p.image && <span style={{ fontSize: '36px', color: '#94a3b8' }}>🥛</span>}

                                {priceInfo.hasDiscount && (
                                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', padding: '3px 8px', borderRadius: '8px', fontWeight: '800', fontSize: '11px', boxShadow: '0 2px 6px rgba(22,163,74,0.3)', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 2 }}>
                                        🏷️ {priceInfo.discountPercent}% OFF{priceInfo.isSpecific ? ` (${p.name})` : ''}
                                    </div>
                                )}

                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '12px', fontWeight: '800', color: '#0f172a', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 2 }}>
                                    {priceInfo.hasDiscount ? (
                                        <>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: '600' }}>₹{priceInfo.originalPrice}</span>
                                            <span style={{ color: '#16a34a', fontWeight: '800', fontSize: '14px' }}>₹{priceInfo.discountedPrice}</span>
                                        </>
                                    ) : (
                                        <span>₹{p.price}</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>{p.name}</h3>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '3px 6px', borderRadius: '6px' }}>{p.size} {p.unit}</span>
                                </div>

                                {priceInfo.hasDiscount ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#16a34a' }}>₹{priceInfo.discountedPrice}</span>
                                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through' }}>₹{priceInfo.originalPrice}</span>
                                        <span style={{ fontSize: '10.5px', color: '#15803d', fontWeight: '700', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                                            Save ₹{priceInfo.discountAmount}
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '8px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '1.05rem', fontWeight: '700', color: '#3b82f6' }}>₹{p.price}</span>
                                    </div>
                                )}

                                <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {p.description || "Fresh and natural farm product."}
                                </p>
                                <button onClick={() => setViewingProduct(p)} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s ease' }}
                                    onMouseEnter={(e) => e.target.style.background = '#1e293b'}
                                    onMouseLeave={(e) => e.target.style.background = '#0f172a'}>
                                    View Details
                                </button>
                            </div>
                        </div>
                        );
                    })}
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
                            {(() => {
                                const days = orderType === 'Single' ? 1 : Math.max(1, Math.round(((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1));
                                const baseDaily = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                const baseTotal = baseDaily * days;

                                const activeCoupon = (appliedCouponData && appliedCouponData.code.toUpperCase() === (appliedCouponCode || '').toUpperCase())
                                    ? appliedCouponData
                                    : (appliedCouponCode ? activeDiscounts.find(d => d.code.toUpperCase() === appliedCouponCode.toUpperCase()) : null);

                                let discountAmount = 0;
                                let isTargetMatched = true;
                                if (activeCoupon) {
                                    const isSpecific = activeCoupon.targetProductName && activeCoupon.targetProductName !== 'ALL';
                                    const eligibleDaily = isSpecific
                                        ? cart.reduce((sum, item) => {
                                            const matches = (item.name || '').trim().toLowerCase() === activeCoupon.targetProductName.trim().toLowerCase();
                                            return matches ? sum + (item.price * item.quantity) : sum;
                                        }, 0)
                                        : baseDaily;
                                    const eligibleTotal = eligibleDaily * days;

                                    if (isSpecific && eligibleDaily === 0) {
                                        isTargetMatched = false;
                                    }

                                    if (eligibleTotal > 0) {
                                        if (activeCoupon.discountType === 'PERCENTAGE') {
                                            discountAmount = (eligibleTotal * activeCoupon.value) / 100;
                                            if (activeCoupon.maxDiscount && discountAmount > activeCoupon.maxDiscount * days) {
                                                discountAmount = activeCoupon.maxDiscount * days;
                                            }
                                        } else if (activeCoupon.discountType === 'FLAT') {
                                            discountAmount = Math.min(eligibleTotal, activeCoupon.value);
                                        }
                                    }
                                }

                                const finalPayable = Math.max(0, Math.round((baseTotal - discountAmount) * 100) / 100);

                                return (
                                    <>
                                        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontWeight: '500' }}>{cart.length} item(s) in order</p>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <span style={{ color: '#475569', fontSize: '0.95rem' }}>Items Subtotal (MRP)</span>
                                                <span style={{ fontWeight: '600', color: '#0f172a' }}>₹{baseTotal.toFixed(2)}</span>
                                            </div>

                                            {discountAmount > 0 && activeCoupon && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#16a34a', fontWeight: '600' }}>
                                                    <span>🏷️ Discount Applied ({activeCoupon.code}{activeCoupon.targetProductName && activeCoupon.targetProductName !== 'ALL' ? ` • ${activeCoupon.targetProductName}` : ''})</span>
                                                    <span>- ₹{discountAmount.toFixed(2)}</span>
                                                </div>
                                            )}

                                            {!isTargetMatched && activeCoupon && (
                                                <div style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.8rem', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>
                                                    ℹ️ Coupon <b>{activeCoupon.code}</b> is valid only for <b>{activeCoupon.targetProductName}</b>. Add it to your cart to get this discount.
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #cbd5e1' }}>
                                                <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>Total (Per Day)</span>
                                                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#3b82f6' }}>
                                                    ₹{((baseTotal - discountAmount) / days).toFixed(2)}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px', background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', justifyContent: 'center' }}>
                                                <span style={{ fontSize: '1rem', fontWeight: '800', color: orderType === 'Single' ? '#0f172a' : '#3b82f6' }}>
                                                    {orderType === 'Single' ? '✓ Single Day Order' : `✓ Monthly Subscription (${days} days)`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Coupon Code Input & Available Coupons */}
                                        <div style={{ marginTop: '16px', padding: '18px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>🏷️</span> Have a Coupon Code?
                                                </span>
                                                {appliedCouponCode && (
                                                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', background: '#dcfce7', padding: '3px 8px', borderRadius: '10px' }}>
                                                        ✓ Coupon Applied
                                                    </span>
                                                )}
                                            </div>

                                            {appliedCouponCode ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1.5px solid #86efac', padding: '12px 16px', borderRadius: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '1.4rem' }}>🎉</span>
                                                        <div>
                                                            <div style={{ fontWeight: '800', color: '#15803d', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
                                                                {activeCoupon?.code}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>
                                                                {activeCoupon?.discountType === 'PERCENTAGE' ? `${activeCoupon.value}% OFF` : `₹${activeCoupon.value} FLAT OFF`}
                                                                {activeCoupon?.targetProductName && activeCoupon.targetProductName !== 'ALL' ? ` (Only for ${activeCoupon.targetProductName})` : ' (All Products)'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveCoupon}
                                                        style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => e.target.style.background = '#fecaca'}
                                                        onMouseLeave={(e) => e.target.style.background = '#fee2e2'}
                                                    >
                                                        Remove ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        type="text"
                                                        value={couponInput}
                                                        onChange={(e) => {
                                                            setCouponInput(e.target.value.toUpperCase());
                                                            setCouponError('');
                                                            setCouponSuccess('');
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleApplyCoupon(couponInput);
                                                            }
                                                        }}
                                                        placeholder="Enter Coupon Code (e.g. WELCOME50)"
                                                        style={{
                                                            flex: 1,
                                                            padding: '11px 14px',
                                                            borderRadius: '10px',
                                                            border: '1.5px solid #cbd5e1',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '700',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                            outline: 'none',
                                                            background: 'white',
                                                            transition: 'border-color 0.2s'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                                                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApplyCoupon(couponInput)}
                                                        style={{
                                                            padding: '11px 20px',
                                                            background: '#16a34a',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '10px',
                                                            fontWeight: '700',
                                                            fontSize: '0.9rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.background = '#15803d'}
                                                        onMouseLeave={(e) => e.target.style.background = '#16a34a'}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            )}

                                            {/* Validation Feedback */}
                                            {couponError && (
                                                <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>⚠️</span> {couponError}
                                                </div>
                                            )}
                                            {couponSuccess && (
                                                <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>✓</span> {couponSuccess}
                                                </div>
                                            )}

                                            {/* Available Active Coupons Pills */}
                                            {activeDiscounts.length > 0 && (
                                                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span>🏷️</span> ACTIVE COUPONS (CLICK TO APPLY):
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        {activeDiscounts.filter(d => !d.isReferralCode).map(d => {
                                                            const isSelected = (appliedCouponCode?.toUpperCase() === d.code.toUpperCase());
                                                            const isSpecific = d.targetProductName && d.targetProductName !== 'ALL';
                                                            return (
                                                                <button
                                                                    key={d.id}
                                                                    type="button"
                                                                    onClick={() => handleApplyCoupon(d.code)}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        borderRadius: '8px',
                                                                        border: isSelected ? '2px solid #16a34a' : '1px dashed #86efac',
                                                                        background: isSelected ? '#16a34a' : 'white',
                                                                        color: isSelected ? 'white' : '#166534',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: '700',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <span>{isSelected ? '✓' : (d.isPersonal || d.isReferralReward ? '🎁' : '+')}</span>
                                                                    <span>{d.code}</span>
                                                                    <span style={{ opacity: 0.85, fontSize: '0.75rem' }}>
                                                                        ({d.discountType === 'PERCENTAGE' ? `${d.value}% OFF` : `₹${d.value} FLAT`}{d.isPersonal || d.isReferralReward ? ' • Reward' : ''}{isSpecific ? ` • ${d.targetProductName}` : ''})
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '20px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Estimated Total Payment</span>
                                            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
                                                ₹{finalPayable.toFixed(2)}
                                            </div>
                                            {discountAmount > 0 && (
                                                <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '600', marginTop: '4px' }}>
                                                    ✓ You save ₹{discountAmount.toFixed(2)} on this order!
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div style={{ flex: 1.5 }}>
                            <form id="orderForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Your Name</label>
                                        <input type="text" required readOnly={!!adminData?.name} value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: adminData?.name ? '#f1f5f9' : '#f8fafc', cursor: adminData?.name ? 'not-allowed' : 'text', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
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
            {/* Support Chat Modal */}
            <SupportChatModal
                isOpen={showSupportChat}
                onClose={() => setShowSupportChat(false)}
                role="USER"
            />
        </div>
    );
};

export default UserProducts;
