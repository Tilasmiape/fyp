# MongoDB Compass - Payments Collection Setup

## ✅ Your Payment System is Connected to MongoDB!

The payment system now stores all data in your **"payments"** collection.

---

## 🔌 MongoDB Connection Verified

- **Database**: `stepoutstudio` 
- **Collection**: `payments`
- **Documents**: All Payout records stored here
- **Status**: ✅ Ready to use

---

## 👀 View Payments in MongoDB Compass

### **Step 1: Open MongoDB Compass**
- Launch MongoDB Compass on your computer
- Connect to your local MongoDB (usually automatic)

### **Step 2: Navigate to Payments Collection**
```
Database: stepoutstudio
         ↓
         Collections
         ↓
         payments  ← Click here
```

### **Step 3: View Payment Records**

You should see documents like:
```json
{
  "_id": "ObjectId(...)",
  "choreographerId": "ObjectId(...)",
  "reservationId": "ObjectId(...)",
  "amount": 880,
  "currency": "usd",
  "status": "pending",
  "payoutDate": "2026-04-04T09:00:00.000Z",
  "metadata": {
    "choreographerName": "John Dancer",
    "clientName": "Jane Smith",
    "sessionDate": "2026-03-30"
  },
  "createdAt": "2026-03-30T10:30:00.000Z",
  "updatedAt": "2026-03-30T10:30:00.000Z"
}
```

---

## 📊 Payment Fields in MongoDB

| Field | Type | Description |
|-------|------|-------------|
| `choreographerId` | ObjectId | Reference to choreographer |
| `reservationId` | ObjectId | Reference to session |
| `amount` | Number | Payout amount (88% of session) |
| `currency` | String | Currency code (`usd`) |
| `status` | String | `pending` → `processing` → `completed` or `failed` |
| `stripeTransferId` | String | Stripe transfer ID after processing |
| `payoutDate` | Date | Scheduled payout date (Friday) |
| `processedAt` | Date | When transfer was completed |
| `metadata` | Object | Choreographer/client/session info |
| `createdAt` | Date | Document created timestamp |
| `updatedAt` | Date | Last updated timestamp |

---

## 🧪 Test the Connection

### **Create a Test Payment**

**Method 1: Via API** (Recommended)

```bash
# Make sure you're signed in as admin first
# Then in browser console or Postman:

curl -X POST http://localhost:3000/api/admin/payments/test \
  -H "Content-Type: application/json" \
  -b "authToken=YOUR_TOKEN"
```

**Method 2: View Existing Payments**

```bash
# Get all payments
curl -X GET http://localhost:3000/api/admin/payments \
  -b "authToken=YOUR_TOKEN"

# Filter by status
curl -X GET "http://localhost:3000/api/admin/payments?status=pending" \
  -b "authToken=YOUR_TOKEN"
```

---

## 🔍 MongoDB Compass Queries

### **View All Pending Payments**

In MongoDB Compass "Filter" tab, enter:
```json
{ "status": "pending" }
```

### **View Payments for Specific Choreographer**

```json
{ "choreographerId": ObjectId("USER_ID_HERE") }
```

### **View Payments by Date Range**

```json
{
  "payoutDate": {
    "$gte": new Date("2026-03-01"),
    "$lte": new Date("2026-03-31")
  }
}
```

### **Sort by Amount (Highest First)**

In MongoDB Compass "Sort" tab:
```json
{ "amount": -1 }
```

---

## 💰 Real Payment Flow - MongoDB Records

### **When Client Pays:**
```
POST /api/stripe/checkout
  ↓
Reservation.paymentStatus = "paid"
```

### **When Choreographer Completes Session:**
```
POST /api/choreographer/sessions/complete
  ↓
Create Payout document in "payments" collection
  ↓
{
  "status": "pending",
  "amount": 880,
  "payoutDate": "2026-04-04T09:00:00Z"  ← (Next Friday)
}
```

### **When Friday Payout Runs:**
```
GET /api/cron/payouts (Friday 9 AM UTC)
  ↓
For each pending payment:
  1. Create Stripe Transfer
  2. Save stripeTransferId
  3. Set status to "completed"
  ↓
Document in MongoDB updates to:
{
  "status": "completed",
  "stripeTransferId": "tr_1234567890",
  "processedAt": "2026-04-04T09:15:00Z"
}
```

---

## 📈 Aggregation Examples

### **Total Payouts by Status**

In MongoDB Compass Aggregation tab:

```javascript
[
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      totalAmount: { $sum: "$amount" }
    }
  },
  { $sort: { totalAmount: -1 } }
]
```

### **Average Payout Amount**

```javascript
[
  {
    $group: {
      _id: null,
      avgAmount: { $avg: "$amount" },
      totalAmount: { $sum: "$amount" },
      count: { $sum: 1 }
    }
  }
]
```

### **Top Earning Choreographers**

```javascript
[
  {
    $match: { status: "completed" }
  },
  {
    $group: {
      _id: "$choreographerId",
      totalEarnings: { $sum: "$amount" },
      payoutCount: { $sum: 1 }
    }
  },
  { $sort: { totalEarnings: -1 } },
  { $limit: 10 }
]
```

---

## ✅ Verification Checklist

Check these to ensure everything is connected:

- [ ] Opened MongoDB Compass
- [ ] Connected to local MongoDB
- [ ] Can see `stepoutstudio` database
- [ ] Can see `payments` collection
- [ ] Collection is empty or shows documents
- [ ] API endpoint `/api/admin/payments` works
- [ ] Can create test payment
- [ ] Test payment appears in Compass immediately

---

## 🚀 Next: Test Full Payment Flow

### **Step 1: Create a Reservation**
1. Login as client
2. Browse choreographers
3. Request a session

### **Step 2: Accept Reservation**
1. Login as choreographer
2. Accept the session

### **Step 3: Pay for Session**
1. Login as client
2. Go to `/client/sessions`
3. Click **"💳 Pay Now"**
4. Use test card: `4242 4242 4242 4242`
5. ✅ Check MongoDB - document appears in `payments` collection!

### **Step 4: Mark Complete**
1. Login as choreographer
2. Go to `/choreographer/sessions`
3. Click **"✓ Mark Complete"**
4. ✅ Check MongoDB - `Payout` document created with `status: "pending"`

### **Step 5: Process Payout**
1. Login as admin
2. Go to `/admin/payouts`
3. Click **"💰 Process Payouts Now"**
4. ✅ Check MongoDB - Payout updated with `status: "completed"` and Stripe transfer ID!

---

## 🔐 Data Security in MongoDB

Your payment data is stored with:
- **Indexes** for fast queries (choreographerId, reservationId, status)
- **Unique constraint** on reservationId (one payout per session)
- **Timestamps** for audit trail (createdAt, updatedAt, processedAt)
- **Encryption** of sensitive fields (stripeTransferId)

---

## 📞 Troubleshooting

### **"Can't see 'payments' collection"**
- Restart dev server: `npm run dev`
- Wait for first data to be created
- Refresh MongoDB Compass

### **"Documents aren't updating"**
- Check server logs for errors
- Verify API endpoints return 200 status
- Ensure authToken cookie is set

### **"Connection refused"**
- Make sure MongoDB is running
- Check: `mongod --version`
- Start MongoDB if stopped

---

## 📋 Collection Schema Summary

```javascript
db.payments.insertOne({
  choreographerId: ObjectId,          // FK to users
  reservationId: ObjectId,             // FK to reservations (unique)
  amount: Number,                      // 88% of session price
  currency: String,                    // "usd"
  status: String,                      // enum: pending|processing|completed|failed
  stripeTransferId: String,            // From Stripe API
  stripeTransferReversalId: String,    // If reversed
  payoutDate: Date,                    // Scheduled for Friday
  processedAt: Date,                   // When actually processed
  errorMessage: String,                // If failed
  metadata: {                          // For reference
    choreographerName: String,
    clientName: String,
    sessionDate: String
  },
  createdAt: Date,                     // Index
  updatedAt: Date                      // Index
})
```

---

**Your payments collection is live and ready! 🎉**
