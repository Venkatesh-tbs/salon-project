'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, X } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  amount: number;          // advance amount in ₹
  bookingId: string;
  customerName: string;
  serviceName: string;
  onSuccess: (paymentId: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-sdk')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayModal({
  isOpen,
  amount,
  bookingId,
  customerName,
  serviceName,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [paid, setPaid] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setPaid(false);
      setError(null);
    }
  }, [isOpen]);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Load Razorpay checkout SDK
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) throw new Error('Could not load payment SDK');

      // 2. Create order on backend
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          bookingId,
          notes: { customerName, serviceName },
        }),
      });
      const order = await res.json();

      if (!res.ok || !order.id) throw new Error(order.error || 'Could not create payment order');

      // 3. If dummy (dev mode), simulate success immediately
      if (order.dummy) {
        console.log('[Razorpay] Dev mode — simulating payment success');
        setPaid(true);
        setTimeout(() => onSuccess('pay_dummy_' + Date.now()), 1200);
        return;
      }

      // 4. Open Razorpay checkout
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const options = {
        key: keyId || '',
        amount: order.amount,
        currency: order.currency,
        name: 'Mens Salon',
        description: serviceName,
        order_id: order.id,
        prefill: { name: customerName },
        theme: { color: '#c026d3' },
        modal: {
          ondismiss: () => {
            setLoading(false);
            onClose();
          },
        },
        handler: async (response: any) => {
          // 5. Verify on backend
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verification = await verifyRes.json();
            if (verification.success) {
              setPaid(true);
              setTimeout(() => onSuccess(response.razorpay_payment_id), 1200);
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch {
            setError('Verification error. Please contact support.');
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(4,4,6,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm rounded-3xl border border-white/10 p-8 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
              boxShadow: '0 0 80px #c026d318, inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <AnimatePresence mode="wait">
              {paid ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
                  <p className="text-white/50 text-sm mt-2">Your booking is now confirmed.</p>
                </motion.div>
              ) : (
                <motion.div key="payment" className="space-y-6">
                  {/* Header */}
                  <div>
                    <p className="text-fuchsia-400 text-xs font-bold tracking-widest uppercase mb-1">Advance Payment</p>
                    <h3 className="text-xl font-bold text-white">{serviceName}</h3>
                  </div>

                  {/* Amount */}
                  <div
                    className="rounded-2xl border border-white/10 p-5 text-center"
                    style={{ background: 'rgba(192,38,211,0.06)' }}
                  >
                    <p className="text-white/50 text-xs mb-1">Amount to Pay</p>
                    <p className="text-4xl font-black text-white">₹{amount}</p>
                    <p className="text-white/30 text-xs mt-1">via UPI / Card / Net Banking</p>
                  </div>

                  {/* UPI badges */}
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {['GPay', 'PhonePe', 'Paytm', 'BHIM', 'Navi'].map((app) => (
                      <span
                        key={app}
                        className="px-3 py-1 rounded-full text-[10px] font-semibold text-white/60 border border-white/10"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        {app}
                      </span>
                    ))}
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm text-center bg-red-400/10 rounded-xl p-3 border border-red-400/20">
                      {error}
                    </p>
                  )}

                  {/* Pay button */}
                  <button
                    onClick={handlePay}
                    disabled={loading}
                    className="relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, #c026d3, #7c3aed)',
                      boxShadow: '0 0 30px #c026d330',
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </span>
                    ) : (
                      `Pay ₹${amount} Securely`
                    )}
                  </button>

                  <p className="text-center text-white/25 text-[10px]">
                    Secured by Razorpay · 256-bit SSL Encrypted
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
