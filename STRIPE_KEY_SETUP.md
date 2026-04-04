# ⚡ Stripe Test API Key Setup

## The Problem
Your `.env.local` has a **placeholder** Stripe key:
```
❌ STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnop
```

This is not a real key, so payments fail with: `Invalid API Key provided`

---

## ✅ The Solution (5 minutes)

### **Step 1: Create/Login to Stripe**
- Go to: https://dashboard.stripe.com
- Create account (if needed) or log in
- Takes ~2 minutes

### **Step 2: Get Your Test API Key**

**Location in Stripe Dashboard:**
```
Dashboard → Developers → API Keys → Standard Keys (Test Mode)
```

**You'll see TWO keys:**

1. **Publishable Key** (starts with `pk_test_`)
   - Safe to share, not sensitive
   
2. **Secret Key** (starts with `sk_test_`)
   - ⚠️ KEEP SECRET - never share!
   - This is what you need

**Real key looks like:**
```
sk_test_51Hl1234567890AbcDefGhIjKlMnOpQrStUvWxYz
```

### **Step 3: Copy & Update `.env.local`**

**File:** `d:\OneDrive\Desktop\step-out\.env.local`

**Replace this:**
```env
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnop
```

**With your actual key:**
```env
STRIPE_SECRET_KEY=sk_test_51Hl1234567890AbcDefGhIjKlMnOpQrStUvWxYz
```

### **Step 4: Restart Server**

**In Terminal:**
```bash
# Stop current server
Ctrl+C

# Restart
npm run dev
```

---

## 🧪 Test It Works

After restarting:

1. Go to: http://localhost:3000/client/sessions
2. Click **"💳 Pay Now"** button
3. You should see Stripe Checkout page (not an error)

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Requires Auth: `4000 0025 0000 3155`

Use any future date (e.g., 12/25) and any 3-digit CVC.

---

## 🔍 How to Find Your Keys

### Screenshots:
1. Stripe Dashboard
   ```
   Left sidebar: Developers
                    ↓
              API Keys
                    ↓
         (Test Mode toggle ON)
   ```

2. You'll see:
   ```
   ┌─────────────────────────────────┐
   │ PUBLISHABLE KEY                 │
   │ pk_test_51234...                │ ← Don't need this
   └─────────────────────────────────┘
   
   ┌─────────────────────────────────┐
   │ SECRET KEY                      │
   │ sk_test_51234...      [Reveal]  │ ← COPY THIS
   └─────────────────────────────────┘
   ```

3. Click **[Reveal]** if hidden
4. Copy the secret key (starts with `sk_test_`)

---

## ⚠️ Common Mistakes

❌ **Wrong:**
```env
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnop  # Placeholder
```

✅ **Right:**
```env
STRIPE_SECRET_KEY=sk_test_51Hl1234567890AbcDefGhIjKlMnOpQrStUvWxYz  # Real 48-char key
```

❌ Using publishable key (pk_test_) for secret
✅ Always use secret key (sk_test_) for backend

---

## 🚀 After Testing

### Webhook Setup (Optional but recommended):

**Install Stripe CLI:**
```bash
# https://stripe.com/docs/stripe-cli
```

**Listen for webhooks:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Copy webhook secret and add to `.env.local`:**
```env
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890abcdefgh
```

---

## 📋 Verification Checklist

After updating keys:

1. [ ] Stop dev server (Ctrl+C)
2. [ ] Update `.env.local` with real `sk_test_` key
3. [ ] Restart: `npm run dev`
4. [ ] Server shows "Stripe initialized" ✅
5. [ ] Go to `/client/sessions`
6. [ ] Click Pay button
7. [ ] See Stripe Checkout (not error)
8. [ ] Test with card `4242 4242 4242 4242`

---

## 🆘 Still Getting Errors?

**If you see:** `Invalid API Key provided`
- ❌ Key is still placeholder
- ✅ Get real key from dashboard
- ✅ Restart server after updating `.env.local`

**If you see:** `Missing STRIPE_SECRET_KEY`
- ❌ `.env.local` not being read
- ✅ Make sure file exists: `d:\OneDrive\Desktop\step-out\.env.local`
- ✅ Restart server

**If you see:** `Invalid source map`
- This is just a Stripe library warning - safe to ignore
- Payment should still work if API key is correct

---

**Your real Stripe key is 48+ characters long. Placeholder keys are short!**

Get it now: https://dashboard.stripe.com/apikeys
