import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Validate Stripe key format
if (stripeSecretKey && !stripeSecretKey.startsWith('sk_')) {
  console.warn(
    '⚠️  STRIPE_SECRET_KEY appears invalid. Using mock Stripe for development.\n' +
    '  Get a real key from: https://dashboard.stripe.com/apikeys'
  );
}

if (!stripeSecretKey || stripeSecretKey.includes('PASTE') || stripeSecretKey.includes('YOUR_ACTUAL')) {
  console.warn(
    '⚠️  STRIPE_SECRET_KEY is not configured.\n' +
    '  1. Go to: https://dashboard.stripe.com/apikeys\n' +
    '  2. Copy your Secret Key (starts with sk_test_)\n' +
    '  3. Paste in .env.local: STRIPE_SECRET_KEY=sk_test_...'
  );
}

let stripe: Stripe | null = null;

try {
  if (stripeSecretKey && stripeSecretKey.startsWith('sk_')) {
    stripe = new Stripe(stripeSecretKey);
  }
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

export const requireStripe = () => {
  if (!stripe) {
    throw new Error(
      'Stripe is not configured.\n' +
      '❌ Current key: ' + (stripeSecretKey.substring(0, 20) + '...') + '\n\n' +
      '✅ Steps to fix:\n' +
      '1. Go to: https://dashboard.stripe.com/apikeys (log in first)\n' +
      '2. Copy your Secret Key (starts with sk_test_)\n' +
      '3. Update .env.local: STRIPE_SECRET_KEY=sk_test_YOUR_REAL_KEY\n' +
      '4. Restart: npm run dev'
    );
  }
  return stripe;
};

/**
 * Calculate split amounts: 88% choreographer, 12% platform
 */
export const calculatePayoutSplit = (totalAmount: number) => {
  const choreographerEarnings = Math.round(totalAmount * 0.88 * 100) / 100;
  const platformFee = totalAmount - choreographerEarnings;
  return {
    choreographerEarnings,
    platformFee,
  };
};

/**
 * Calculate next Friday from a given date
 */
export const getNextFriday = (fromDate: Date = new Date()): Date => {
  const date = new Date(fromDate);
  const day = date.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7; // 5 is Friday
  date.setDate(date.getDate() + daysUntilFriday);
  date.setHours(9, 0, 0, 0); // Set to 9 AM
  return date;
};

/**
 * Transfer funds from platform account to choreographer's connected account
 */
export const createTransferToChoreo = async (
  stripeClient: Stripe,
  choreographerConnectedAccountId: string,
  amountInCents: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {}
) => {
  try {
    const transfer = await stripeClient.transfers.create({
      amount: amountInCents,
      currency,
      destination: choreographerConnectedAccountId,
      metadata: {
        ...metadata,
        type: 'session_payout',
      },
    });
    return transfer;
  } catch (error) {
    console.error('Error creating Stripe transfer:', error);
    throw error;
  }
};

export default stripe;

