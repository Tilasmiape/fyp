'use client';

import React, { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentModalProps {
  clientSecret: string;
  onClose: () => void;
}

export default function PaymentModal({ clientSecret, onClose }: PaymentModalProps) {
  // ✅ Must be a function, not the string itself
  const fetchClientSecret = useCallback(() => Promise.resolve(clientSecret), [clientSecret]);

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <style>{`
        .payment-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .payment-modal-box {
          width: min(600px, 100%);
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
        }
        .payment-modal-header {
          padding: 16px 24px;
          border-bottom: 1px solid #e7e9f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .payment-modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }
        .payment-modal-close {
          border: none;
          background: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          line-height: 1;
        }
        .payment-modal-body {
          padding: 24px;
          min-height: 400px;
        }
      `}</style>

      <div className="payment-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2 className="payment-modal-title">Secure Payment</h2>
          <button className="payment-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="payment-modal-body">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}  
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}