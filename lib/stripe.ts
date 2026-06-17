import Stripe from 'stripe';

let stripeClient: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (stripeClient !== undefined) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    stripeClient = null;
    return null;
  }
  stripeClient = new Stripe(key);
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
}
