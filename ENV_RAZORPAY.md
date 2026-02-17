# Razorpay environment variables

Add these to your `.env` file for ticket payments and refunds.

## Backend (vybeme_backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `RAZORPAY_KEY_ID` | Razorpay API Key (from Dashboard → Settings → API Keys) | `rzp_test_xxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay API Secret (same page as Key ID) | `xxxxxxxxxxxx` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret (Dashboard → Webhooks → Add endpoint → Secret) | `xxxxxxxxxxxx` |

- **Create order** and **verify payment** use `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
- **Webhook** (refunds, payment events) must be configured in Razorpay Dashboard with URL:  
  `https://your-api-domain.com/api/webhooks/razorpay`  
  and the **Secret** stored as `RAZORPAY_WEBHOOK_SECRET`. Subscribe to at least: `payment.captured`, `refund.processed` (or `refund.created`).

## Web (vybeme_web)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as backend Key ID (public; used in browser for Checkout) | `rzp_test_xxxx` |

Use the **same** Key ID as in the backend so that orders created by the backend can be opened in Checkout with this key.

## Summary – copy into `.env`

**Backend (.env):**
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Web (.env.local):**
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```
