# Environment Variables Setup

## Required Variables for Stripe Payout System

### Stripe Configuration
```env
# Your Stripe account API keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx

# Webhook signing secret (from https://dashboard.stripe.com/webhooks)
# Create webhook for: http://yourdomain.com/api/stripe/webhook
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Currency code
STRIPE_CURRENCY=usd
```

### Application Configuration
```env
# URL of your application (for redirects)
APP_URL=https://yourdomain.com

# Change in production!
JWT_SECRET=your-super-secret-key-change-in-prod
```

### Admin API Key (for Cron Jobs)
```env
# Generate a strong random key for cron job authentication
# Use: openssl rand -base64 32
# This is used by automated payout processor
ADMIN_API_KEY=your-secure-random-key-here

# Vercel cron job secret
CRON_SECRET=your-cron-secret-key
```

### Database
```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

## Setup Steps

### 1. Generate Secure Keys
```bash
# Generate Admin API Key
openssl rand -base64 32

# Generate Cron Secret
openssl rand -base64 32
```

### 2. Stripe Account Setup

#### Main Account Configuration
1. Go to https://dashboard.stripe.com/settings
2. Under "Connected accounts", enable Stripe Connect (Express accounts)
3. Go to API Keys page and copy:
   - `STRIPE_SECRET_KEY` (Secret key)
   - `STRIPE_PUBLISHABLE_KEY` (Publishable key)

#### Webhook Configuration
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
   - `transfer.created` (optional monitoring)
   - `transfer.failed` (optional monitoring)
5. Copy the signing secret as `STRIPE_WEBHOOK_SECRET`

### 3. Vercel Configuration (if using Vercel)

Add to `vercel.json`:
```json
{
  "env": [
    {
      "key": "STRIPE_SECRET_KEY",
      "value": "sk_live_xxxxxxxxxxxxx"
    },
    {
      "key": "STRIPE_PUBLISHABLE_KEY",
      "value": "pk_live_xxxxxxxxxxxxx"
    },
    {
      "key": "STRIPE_WEBHOOK_SECRET",
      "value": "whsec_xxxxxxxxxxxxx"
    },
    {
      "key": "ADMIN_API_KEY",
      "value": "your-secure-random-key"
    },
    {
      "key": "CRON_SECRET",
      "value": "your-cron-secret-key"
    }
  ]
}
```

Or set them in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable for Production

### 4. Local Development (.env.local)

Create `.env.local`:
```env
# Stripe Test Mode Keys
STRIPE_SECRET_KEY=sk_test_51234567890abcdef
STRIPE_PUBLISHABLE_KEY=pk_test_1234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef
STRIPE_CURRENCY=usd

# Application
APP_URL=http://localhost:3000
JWT_SECRET=dev-secret-key-change-in-prod

# Admin
ADMIN_API_KEY=dev-admin-key-12345
CRON_SECRET=dev-cron-secret-12345

# Database (use test database)
MONGODB_URI=mongodb://localhost:27017/dance-platform-dev
```

### 5. Test Stripe Integration

#### Using Stripe CLI
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Listen for webhook events
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Create test payment
stripe trigger charge.succeeded

# Test transfer (if available in test mode)
stripe trigger transfer.created
```

#### Test Card Numbers
- Visa: `4242 4242 4242 4242`
- MasterCard: `5555 5555 5555 4444`
- Amex: `3782 822463 10005`

Use any future expiry date and any 3-digit CVC.

## Production Checklist

- [ ] `STRIPE_SECRET_KEY` set to live key (not test)
- [ ] `STRIPE_PUBLISHABLE_KEY` set to live key (not test)
- [ ] `STRIPE_WEBHOOK_SECRET` set to live webhook secret
- [ ] `ADMIN_API_KEY` set to strong random key
- [ ] `CRON_SECRET` set to strong random key
- [ ] `JWT_SECRET` changed from default value
- [ ] `APP_URL` set to production domain
- [ ] `MONGODB_URI` points to production database
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Vercel cron job enabled (`vercel.json` deployed)
- [ ] HTTPS enabled on all endpoints
- [ ] Error logging/monitoring configured

## Important Security Notes

1. **Never commit `.env` files** - they contain secrets
2. **Rotate `ADMIN_API_KEY` regularly** if compromised
3. **Use HTTPS only** in production
4. **Restrict IP addresses** to Vercel cron IPs if possible
5. **Monitor Stripe Connect account** for suspicious activity
6. **Set up Stripe alerts** for failed transfers
7. **Enable 2FA** on Stripe account
8. **Audit payout history** regularly

## Troubleshooting

### "Missing STRIPE_SECRET_KEY"
- Ensure `STRIPE_SECRET_KEY` is set in environment
- In development, check `.env.local`
- In production, check Vercel/hosting provider environment settings

### Webhook not firing
- Verify webhook URL is public (not localhost)
- Check Stripe Dashboard webhook delivery logs
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe settings
- Check application logs for errors

### Cron job not running
- Verify `vercel.json` is in project root and committed
- Check Vercel project settings for cron job configuration
- Verify `ADMIN_API_KEY` and `CRON_SECRET` in environment
- Check Vercel function logs for errors

### Transfers failing
- Verify choreographer's Stripe Connect account is verified
- Check for insufficient balance in platform account
- Verify `payoutsEnabled` status for choreographer account
- Check Stripe Dashboard for transfer failure reasons

## Support

For issues with Stripe integration:
- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Stripe Connect: https://stripe.com/docs/connect

For issues with cron jobs (Vercel):
- Vercel Crons: https://vercel.com/docs/crons
- Vercel Support: https://vercel.com/support
