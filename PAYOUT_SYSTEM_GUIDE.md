# Platform Payout System - Implementation Guide

## Overview
The platform acts as a middleman using Stripe, implementing an 88/12 revenue split:
- **88%** → Choreographer (distributed via Stripe Transfer)
- **12%** → Platform (kept in platform's Stripe balance)

## Payment Flow

### 1. Client Payment
```
Client → Platform's Stripe Account (via Payment Intent)
↓
Funds captured and stored in platform's Stripe balance (escrow)
```

**Endpoint:** `POST /api/stripe/checkout`
- Client initiates payment for a session
- Creates Stripe checkout session
- Payment processed to platform's main Stripe account

### 2. Session Completion & Payout Scheduling
```
Session Completed → System calculates 88/12 split
↓
Payout record created with Friday date
↓
Reservation marked as "completed"
```

**Endpoint:** `POST /api/choreographer/sessions/complete`
- Choreographer marks session as completed
- System automatically calculates split amounts:
  - `choreographerEarnings = total * 0.88`
  - `platformFee = total * 0.12`
- Creates a `Payout` record with status "pending"
- Schedules payout for next Friday (9 AM)

### 3. Friday Payout Processing
```
Friday arrives → Admin runs payout processor
↓
For each scheduled payout:
  - Verify choreographer has Stripe Connect account
  - Create Stripe Transfer (platform → choreographer's account)
  - Mark payout as "completed"
↓
Platform keeps 12% in its Stripe balance
```

**Endpoint:** `POST /api/admin/payouts/process`
- Admin (or cron job) triggers payout processing
- Processes all payouts with `payoutDate <= now`
- Creates Stripe Transfers to choreographer connected accounts
- Updates payout records with transfer IDs

## Database Models

### User Model (Extended)
```typescript
// Stripe Connect fields
stripeConnectAccountId?: string        // Choreographer's Stripe account ID
stripeConnectStatus?: 'not_connected'  // Connection status
                   | 'pending'
                   | 'verified'
                   | 'restricted'
bankAccountVerified?: boolean          // Bank account verified
totalEarnings?: number                 // Total earned (pending + completed)
totalPayoutsReceived?: number          // Sum of paid out amounts
```

### Reservation Model (Extended)
```typescript
// Payout tracking fields
payoutStatus: 'pending'       // Not yet scheduled
            | 'scheduled'     // Scheduled for Friday
            | 'processing'    // Being processed
            | 'completed'     // Transferred to choreographer
            | 'failed'        // Transfer failed
            | 'refunded'      // Refunded to client

choreographerEarnings?: number  // 88% of total
platformFee?: number            // 12% of total
payoutScheduledDate?: Date      // Friday at 9 AM
payoutId?: ObjectId             // Reference to Payout record
```

### Payout Model (New)
```typescript
interface IPayout {
  choreographerId: ObjectId       // Choreographer receiving payout
  reservationId: ObjectId         // Associated session
  amount: number                  // 88% of session price
  currency: string                // Usually 'usd'
  status: 'pending'
        | 'processing'
        | 'completed'
        | 'failed'
  stripeTransferId?: string       // Stripe Transfer ID after processing
  payoutDate: Date                // Target payout date (Friday)
  processedAt?: Date              // When actually processed
  errorMessage?: string           // Error details if failed
  metadata?: {
    choreographerName?: string
    clientName?: string
    sessionDate?: string
  }
}
```

## API Endpoints

### Client Endpoints

#### 1. Checkout (Existing)
```
POST /api/stripe/checkout
```
- Creates Stripe checkout session
- Client pays full amount to platform
- Funds held in platform's Stripe balance

#### 2. View Sessions (Update with payout info)
```
GET /api/client/sessions
```
- View reservation status and payment info
- Shows payment status and scheduled payout details

### Choreographer Endpoints

#### 1. Connect Stripe Account
```
POST /api/choreographer/stripe-connect
```
Creates Stripe Connect account for choreographer.

**Response:**
```json
{
  "success": true,
  "accountId": "acct_xxxxx",
  "onboardingUrl": "https://connect.stripe.com/onboarding/acct_xxxxx",
  "message": "Complete onboarding to enable payouts"
}
```

**Flow:**
- Creates Stripe Express account
- Generates onboarding link
- Returns link for choreographer to complete setup

#### 2. Check Connect Status
```
GET /api/choreographer/stripe-connect
```
Retrieves current Stripe Connect status.

**Response Example:**
```json
{
  "connected": true,
  "status": "verified",
  "chargesEnabled": true,
  "payoutsEnabled": true
}
```

#### 3. Complete Session
```
POST /api/choreographer/sessions/complete
```
Mark session as completed and schedule payout.

**Request:**
```json
{
  "reservationId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session marked as completed. Payout scheduled for Friday.",
  "reservation": { ... },
  "payout": {
    "id": "507f1f77bcf86cd799439012",
    "choreographerEarnings": 880.00,
    "platformFee": 120.00,
    "payoutDate": "2026-04-03T09:00:00Z"
  }
}
```

#### 4. View Pending Payouts
```
GET /api/choreographer/sessions/pending-payouts
```
Lists all payouts for choreographer.

**Response:**
```json
{
  "payouts": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "amount": 880.00,
      "status": "pending",
      "payoutDate": "2026-04-03T09:00:00Z",
      "reservationId": { ... }
    }
  ],
  "summary": {
    "total": 10,
    "pending": 3,
    "completed": 7,
    "totalEarnings": 8800.00
  }
}
```

### Admin Endpoints

#### 1. Process Payouts
```
POST /api/admin/payouts/process
```
Execute Friday payout run.

**Response:**
```json
{
  "summary": {
    "total": 5,
    "processed": 5,
    "failed": 0
  },
  "results": [
    {
      "payoutId": "507f1f77bcf86cd799439012",
      "choreographerId": "507f1f77bcf86cd799439001",
      "status": "completed",
      "stripeTransferId": "tr_xxxxx",
      "amount": 880.00
    }
  ]
}
```

#### 2. Payout Status
```
GET /api/admin/payouts/process
```
Get payout statistics and next scheduled run.

**Response:**
```json
{
  "stats": {
    "pending": 3,
    "processing": 0,
    "completed": 47,
    "failed": 0,
    "totalPending": 2640.00,
    "nextPayoutRun": "2026-04-04T09:00:00Z"
  }
}
```

## Setup Instructions

### 1. Environment Variables
```env
STRIPE_SECRET_KEY=sk_live_xxxxx          # Platform's main Stripe key
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx     # Client-side key
STRIPE_WEBHOOK_SECRET=whsec_xxxxx        # For webhook verification
APP_URL=https://yourapp.com              # For Stripe redirects
```

### 2. Stripe Account Setup
**Main Account (Platform):**
- Set up standard Stripe account
- Enable Stripe Connect for Express accounts
- Configure webhook endpoint: `POST /api/stripe/webhook`
  - Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`

### 3. Database Migrations
Run migrations to add new fields to User and Reservation models.

### 4. Choreographer Onboarding
1. Choreographer navigates to dashboard
2. Sees "Connect Stripe" button
3. Clicks button → redirected to Stripe Connect onboarding
4. Completes bank verification
5. Returns to dashboard with verified status

### 5. Automate Friday Payouts
**Option A: Vercel Cron (Recommended)**
Create `/api/cron/weekly-payouts`:
```typescript
export async function POST(request: Request) {
  // Only on Friday at 9 AM UTC
  const now = new Date();
  if (now.getDay() !== 5 || now.getUTCHours() !== 9) {
    return new Response('Not Friday 9 AM UTC', { status: 400 });
  }

  // Call payout processor
  const response = await fetch(`${process.env.APP_URL}/api/admin/payouts/process`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.ADMIN_SECRET}` }
  });
  
  return response;
}
```

**Option B: External Cron Service**
Use EasyCron or similar to call `/api/admin/payouts/process` every Friday at 9 AM.

**Option C: Manual Trigger**
Admin dashboard button to manually trigger payout processing.

## Revenue Flow Visualization

```
┌─────────────────────────────────────────────────────┐
│ CLIENT PAYS $1000 FOR SESSION                       │
└──────────────────┬──────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Platform's Stripe    │
        │ Account: $1000       │
        │ (Escrow/Holding)     │
        └──────────────────────┘
                   ↓
        SESSION COMPLETED
        Calculate Split:
        - 88% = $880
        - 12% = $120
                   ↓
        ┌──────────────────────┐
        │ FRIDAY PAYOUT RUN    │
        │ via Stripe Transfers │
        └──────────────────────┘
                   ↓
        ┌──────────────────────────────┐
        │ Choreographer's Stripe       │
        │ Connected Account: +$880     │
        └──────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Platform Stripe      │
        │ Retains: $120       │
        │ (Revenue/Profit)    │
        └──────────────────────┘
```

## Error Handling

### Common Errors & Solutions

**"Choreographer has no Stripe connected account"**
- Choreographer must complete Stripe Connect onboarding first
- Send them to `/api/choreographer/stripe-connect` endpoint

**"Transfer failed: Insufficient funds"**
- Platform doesn't have enough balance
- This shouldn't happen if payment was successfully captured
- Check Stripe dashboard for issues

**"Charges not enabled on account"**
- Choreographer's Stripe account isn't fully verified
- They need to complete bank verification in Stripe Dashboard

## Testing

### Local Testing
```bash
# Start Stripe CLI listener
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger charge.succeeded
stripe trigger checkout.session.completed

# Test choreographer payout flow
curl -X POST http://localhost:3000/api/choreographer/sessions/complete \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=<token>" \
  -d '{"reservationId": "<reservation_id>"}'
```

### Production Checklist
- [ ] Stripe Connect enabled on main account
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Choreographers can complete Stripe connection
- [ ] Admin payout endpoint secured with authentication
- [ ] Cron job / automation configured for Friday payouts
- [ ] Error alerting configured for failed transfers
