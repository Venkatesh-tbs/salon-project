/**
 * src/lib/env-check.ts
 *
 * Runtime validation for optional environment variables.
 * Call `checkEnvVars()` once at app startup (e.g. in layout.tsx).
 *
 * The app continues to work even if keys are missing —
 * Twilio and Razorpay fall back to dev mode automatically.
 */

const OPTIONAL_GROUPS = [
  {
    name: 'Twilio WhatsApp',
    vars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER'],
    fallback: 'WhatsApp notifications will be logged to console only.',
    setupUrl: 'https://console.twilio.com',
  },
  {
    name: 'Razorpay Payments',
    vars: ['RAZORPAY_KEY_ID', 'RAZORPAY_SECRET'],
    fallback: 'Payments will be mocked (dev mode). Real charges will NOT be processed.',
    setupUrl: 'https://dashboard.razorpay.com/app/keys',
  },
] as const;

export function checkEnvVars(): void {
  // Only run on the server
  if (typeof window !== 'undefined') return;

  for (const group of OPTIONAL_GROUPS) {
    const missing = group.vars.filter((v) => !process.env[v]);

    if (missing.length > 0) {
      console.warn(
        `\n⚠️  [ENV] ${group.name} — missing: ${missing.join(', ')}\n` +
        `   ↳ ${group.fallback}\n` +
        `   ↳ Setup: ${group.setupUrl}\n`
      );
    } else {
      console.log(`✅  [ENV] ${group.name} — configured`);
    }
  }
}
