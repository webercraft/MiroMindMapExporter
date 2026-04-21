'use client';
import { FC, useState, useEffect } from 'react';
import { fetchApi } from '../utils/fetchApi';

interface Plan {
  name: string;
  price: string;
  period: string;
  credits: number;
  paymentLink: string;
  features: string[];
  highlighted: boolean;
}

const plans: Plan[] = [
  {
    name: 'Pro',
    price: '$10',
    period: 'month',
    credits: 100,
    paymentLink: process.env.NEXT_PUBLIC_PAYMENT_LINK || '',
    features: [
      '100 export/import credits per month',
      'All formats (CSV, JSON, OPML, PDF, PNG, SVG)',
      'Priority support',
      'Unlimited board size',
    ],
    highlighted: true,
  },
];

export const Upgrade: FC<{ onBack: () => void; hasPaid?: boolean }> = ({ onBack, hasPaid = false }) => {
  const [error, setError] = useState<string>('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Fetch current Miro user ID
  useEffect(() => {
    miro.board.getUserInfo().then((info) => setUserId(info.id)).catch(() => {});
  }, []);

  const handleSubscription = async () => {
    setSubscriptionLoading(true);
    try {
      const response = await fetchApi('/api/billing');
      const billdata = await response.json();
      window.open(billdata.data.url, '_blank');
    } catch (e) {
      setError('Failed to open billing portal. Please try again.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!plan.paymentLink) {
      setError('This plan is not configured yet. Please contact support.');
      return;
    }
    try {
      const userInfo = await miro.board.getUserInfo();
      const userId = userInfo.id;
      window.open(`${plan.paymentLink}?client_reference_id=${userId}&utm_source=miro-app-panel`, '_blank');
    } catch {
      // Fallback if getUserInfo fails
      window.open(`${plan.paymentLink}?utm_source=miro-app-panel`, '_blank');
    }
  };

  return (
    <div style={{ padding: '20px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#555',
          }}
        >
          ← Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>
            {hasPaid ? 'Subscription Settings' : 'Upgrade Your Plan'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            {hasPaid ? 'Manage your active subscription' : 'Choose a plan that fits your needs'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '6px',
          border: '1px solid #f5c6cb',
          marginBottom: '16px',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Plan Cards — only shown when not yet paid */}
      {!hasPaid && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {plans.map((plan) => (
          <div
            key={plan.name}
            style={{
              border: plan.highlighted ? '2px solid #4262ff' : '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '18px',
              backgroundColor: plan.highlighted ? '#f5f7ff' : '#ffffff',
              position: 'relative',
              boxShadow: plan.highlighted ? '0 2px 12px rgba(66,98,255,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            {plan.highlighted && (
              <div style={{
                position: 'absolute',
                top: '-11px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#4262ff',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 12px',
                borderRadius: '20px',
                letterSpacing: '0.5px',
              }}>
                MOST POPULAR
              </div>
            )}

            {/* Plan header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>{plan.name}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                  {plan.credits === -1 ? 'Unlimited credits' : `${plan.credits} credits / month`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: plan.highlighted ? '#4262ff' : '#1a1a2e' }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: '12px', color: '#888' }}>/{plan.period}</span>
              </div>
            </div>

            {/* Features */}
            <ul style={{ margin: '0 0 14px 0', padding: 0, listStyle: 'none' }}>
              {plan.features.map((f) => (
                <li key={f} style={{ fontSize: '13px', color: '#444', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#28a745', fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => handleUpgrade(plan)}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: plan.highlighted ? '#4262ff' : '#f0f0f0',
                color: plan.highlighted ? '#ffffff' : '#333',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {`Get ${plan.name}`}
            </button>
          </div>
        ))}
          </div>

      <p style={{ textAlign: 'center', fontSize: '11px', color: '#aaa', marginTop: '20px' }}>
        Secure payments powered by Stripe. Cancel anytime.
      </p>
        </>
      )}

      {hasPaid && (
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={handleSubscription}
            disabled={subscriptionLoading}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#333',
              fontWeight: 600,
              fontSize: '14px',
              cursor: subscriptionLoading ? 'not-allowed' : 'pointer',
              opacity: subscriptionLoading ? 0.7 : 1,
            }}
          >
            {subscriptionLoading ? 'Opening...' : '⚙ Manage Subscription'}
          </button>
        </div>
      )}

      {/* Support info — always visible */}
      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
        <p style={{ margin: '0 0 6px 0' }}>
          If you are facing any issue then contact us at{' '}
          <a href="mailto:webercraftofficial@gmail.com" style={{ color: '#4262ff', textDecoration: 'none', fontWeight: 600 }}>
            webercraftofficial@gmail.com
          </a>
        </p>
        {userId && (
          <p style={{ margin: 0, color: '#888' }}>
            User ID: <span style={{ fontFamily: 'monospace', userSelect: 'all', color: '#555' }}>{userId}</span>
          </p>
        )}
      </div>
    </div>
  );
};
