'use client';

import React from 'react';

export default function WhatsAppTestPage() {
  const [phone, setPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<any>(null);
  const [result, setResult] = React.useState<any>(null);

  // Check env var status on mount
  React.useEffect(() => {
    fetch('/api/test-whatsapp')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ ready: false, error: 'Could not reach API' }));
  }, []);

  const sendTest = async () => {
    if (!phone) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#07050f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '2.5rem', boxShadow: '0 0 60px #7c3aed10' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ color: '#e879f9', fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 6 }}>WhatsApp Integration</p>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Test WhatsApp Notifications</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6 }}>Send a test message to verify your Twilio setup.</p>
        </div>

        {/* Env Status */}
        {status && (
          <div style={{ marginBottom: '1.5rem', background: status.ready ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${status.ready ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 12, padding: '1rem' }}>
            <p style={{ color: status.ready ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              {status.ready ? '✅ Twilio credentials configured' : '❌ Twilio credentials missing'}
            </p>
            {Object.entries(status).filter(([k]) => k !== 'ready' && k !== 'error').map(([key, val]: any) => (
              <p key={key} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '2px 0', fontFamily: 'monospace' }}>
                {key}: <span style={{ color: val.startsWith('✅') ? '#4ade80' : '#f87171' }}>{val}</span>
              </p>
            ))}
          </div>
        )}

        {/* Phone Input */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Your WhatsApp Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+919876543210"
            disabled={!status?.ready}
            style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', opacity: status?.ready ? 1 : 0.5 }}
          />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6 }}>
            ⚠️ You must first join the Twilio sandbox by sending <strong style={{ color: 'rgba(255,255,255,0.5)' }}>"join &lt;sandbox-word&gt;"</strong> to +1 415 523 8886 on WhatsApp.
          </p>
        </div>

        {/* Send Button */}
        <button
          onClick={sendTest}
          disabled={loading || !phone || !status?.ready}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading || !phone || !status?.ready ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #c026d3, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading || !phone || !status?.ready ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
        >
          {loading ? '⏳ Sending...' : '📱 Send Test Message'}
        </button>

        {/* Result */}
        {result && (
          <div style={{ marginTop: '1.5rem', background: result.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 12, padding: '1rem' }}>
            <p style={{ color: result.success ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 14, marginBottom: result.success ? 4 : 8 }}>
              {result.success ? '✅ Message sent successfully!' : '❌ Failed'}
            </p>
            {result.messageSid && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace' }}>SID: {result.messageSid}</p>}
            {result.error && <p style={{ color: '#f87171', fontSize: 13 }}>{result.error}</p>}
            {result.hint && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>💡 {result.hint}</p>}
          </div>
        )}

        {/* Footer instructions */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Testing steps:</strong><br />
            1. Add your Twilio credentials to <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 4 }}>.env.local</code><br />
            2. Restart the dev server<br />
            3. Join Twilio sandbox on your phone<br />
            4. Enter your number above and click Send
          </p>
        </div>
      </div>
    </div>
  );
}
