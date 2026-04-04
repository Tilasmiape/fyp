# Quick Reference - Stripe Payout System

## Payment Flow Summary

```
┌─ CLIENT INITIATES PAYMENT ─────────────────────────────────────────┐
│  POST /api/stripe/checkout                                         │
│  - Reservation ID provided                                         │
│  - Stripe Checkout Session created                                │
│  - Client redirected to Stripe payment page                       │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
         [ CLIENT PAYS WITH CARD ON STRIPE ]
                         │
                         ↓
┌─ PAYMENT WEBHOOK ──────────────────────────────────────────────────┐
│  POST /api/stripe/webhook                                          │
│  Event: checkout.session.completed                                 │
│  - Reservation.paymentStatus = "paid"                             │
│  - Reservation.paidAt = now                                        │
│  - Reservation.status = "confirmed"                               │
│  - Platform Stripe Account: +$1000 (escrowed)                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
         [ SESSION HAPPENS - CHOREOGRAPHER TEACHES ]
                         │
                         ↓
┌─ SESSION COMPLETION ───────────────────────────────────────────────┐
│  POST /api/choreographer/sessions/complete                          │
│  - Choreographer marks session complete                            │
│  - Compute splits:                                                 │
│      choreographerEarnings = $1000 × 0.88 = $880                  │
│      platformFee = $1000 × 0.12 = $120                            │
│  - Create Payout record:                                          │
│      status: "pending"                                             │
│      payoutDate: next Friday 9 AM                                 │
│  - Update Reservation:                                             │
│      payoutStatus = "scheduled"                                    │
│      payoutScheduledDate = Friday 9 AM                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                    [ WAIT FOR FRIDAY ]
                         │
                         ↓
┌─ FRIDAY PAYOUT RUN ────────────────────────────────────────────────┐
│  GET /api/cron/payouts (automatic @ 9 AM UTC)                     │
│  or manually                                                        │
│  POST /api/admin/payouts/process                                   │
│                                                                    │
│  For each pending payout:                                          │
│  1. Verify choreographer has Stripe Connect account               │
│  2. Create Stripe Transfer:                                       │
│     Platform Account → Choreographer's Account ($880)             │
│  3. Update Payout: status = "completed", stripeTransferId = ...  │
│  4. Update User: totalPayoutsReceived += $880                    │
│  5. Platform keeps $120 in Stripe balance                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
        [ CHOREOGRAPHER'S BANK ACCOUNT +$880 ]
        [ PLATFORM STRIPE BALANCE +$120 ]
```

## API Endpoints Quick Reference

### Client Payment
```
POST /api/stripe/checkout
Request:  { reservationId: "..." }
Response: { url: "https://checkout.stripe.com/..." }
```

### Choreographer Setup
```
POST /api/choreographer/stripe-connect
Response: { accountId: "acct_...", onboardingUrl: "..." }

GET /api/choreographer/stripe-connect
Response: {
  connected: true,
  status: "verified",
  chargesEnabled: true,
  payoutsEnabled: true
}
```

### Choreographer Session Complete
```
POST /api/choreographer/sessions/complete
Request:  { reservationId: "..." }
Response: {
  payout: {
    choreographerEarnings: 880,
    platformFee: 120,
    payoutDate: "2026-04-04T09:00:00Z"
  }
}

GET /api/choreographer/sessions/pending-payouts
Response: {
  payouts: [...],
  summary: {
    pending: 3,
    completed: 7,
    totalEarnings: 8800
  }
}
```

### Admin Payout Processing
```
POST /api/admin/payouts/process
Headers: { "X-Admin-Key": "..." } (or Cookie auth)
Response: {
  summary: { total: 5, processed: 5, failed: 0 },
  results: [...]
}

GET /api/admin/payouts/process
Response: {
  stats: {
    pending: 3,
    completed: 47,
    totalPending: 2640,
    nextPayoutRun: "2026-04-04T09:00:00Z"
  }
}
```

## Database Fields

### User
```typescript
stripeConnectAccountId: string
stripeConnectStatus: 'not_connected' | 'pending' | 'verified' | 'restricted'
bankAccountVerified: boolean
totalEarnings: number           // $880 pending from above example
totalPayoutsReceived: number   // Amount already paid out
```

### Reservation
```typescript
paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
payoutStatus: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed'
choreographerEarnings: 880      // 88% of total
platformFee: 120                // 12% of total
payoutScheduledDate: Date       // Friday 9 AM
payoutId: ObjectId              // Reference to Payout
stripePaymentIntentId: string   // From Stripe
paidAt: Date                    // When client paid
```

### Payout (new collection)
```typescript
choreographerId: ObjectId
reservationId: ObjectId
amount: 880                     // Choreographer earnings
currency: 'usd'
status: 'pending' | 'processing' | 'completed' | 'failed'
stripeTransferId: string        // After processing
payoutDate: Date                // Scheduled for Friday
processedAt?: Date              // When actually processed
errorMessage?: string           // If failed
```

## Key Calculations

### 88/12 Split
```javascript
function calculateSplit(total) {
  return {
    choreographerEarnings: Math.round(total * 0.88 * 100) / 100,
    platformFee: total - (Math.round(total * 0.88 * 100) / 100)
  }
}

// Example: $1000 payment
// choreographerEarnings: $880.00
// platformFee: $120.00
```

### Stripe Amounts (in cents)
```javascript
const amountInCents = Math.round($880 * 100) = 88000 cents
```

### Next Friday
```javascript
function getNextFriday(fromDate) {
  const date = new Date(fromDate);
  const day = date.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilFriday);
  date.setHours(9, 0, 0, 0);
  return date;
}
```

## Environment Variables Needed

```env
# Stripe Live Keys (not test)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin authentication
ADMIN_API_KEY=<strong-random-key>
CRON_SECRET=<strong-random-key>

# App config
APP_URL=https://yourdomain.com
JWT_SECRET=<change-from-default>
```

## Testing Checklist

```
□ Client can pay for session (Stripe Checkout)
□ Webhook updates reservation to "paid"
□ Choreographer can connect Stripe account
□ Choreographer can complete session
□ Payout record created with correct splits
□ Payout scheduled for Friday
□ Admin can manually trigger payouts
□ Stripe Transfer created with correct amount
□ Payout marked as "completed"
□ Choreographer's bank account updated (+$880)
□ Platform balance increased (+$120)
```

## Monitoring

### Success Indicators
- ✅ Payment success rate > 99%
- ✅ Transfer success rate > 99%
- ✅ Payout processing time < 10 seconds per transfer
- ✅ Average Friday payouts processed within 1 hour

### Error Cases to Handle
- ❌ Choreographer account not verified
- ❌ Insufficient funds in platform account
- ❌ Stripe API rate limiting
- ❌ Network timeout during transfer
- ❌ Invalid choreographer account

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Payment not confirming | Check webhook endpoint in Stripe Dashboard |
| Choreographer can't connect | Ensure Stripe Connect enabled on main account |
| Transfer failing | Verify choreographer account status in Stripe Dashboard |
| Cron not running | Check vercel.json in repo root, verify deployed |
| Wrong split amounts | Check calculation in `/lib/stripe.ts` |
| Missing payouts | Check choreographer has `stripeConnectAccountId` set |

## Useful Stripe CLI Commands

```bash
# Listen for webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger charge.succeeded
stripe trigger payment_intent.payment_failed

# Check recent events
stripe logs tail

# Monitor transfers (production)
stripe logs tail --filter="type:transfer"
```

---

**Last Updated:** 2026-03-30
