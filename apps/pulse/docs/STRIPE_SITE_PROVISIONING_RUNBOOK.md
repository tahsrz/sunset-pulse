# Stripe Site Provisioning Runbook

Use this when a buyer completes site checkout but onboarding, billing state, or publication status looks stuck.

## Fast Triage

1. Confirm the buyer has a Checkout Session ID that starts with `cs_`.
2. Open `/onboarding/site?session_id=<session_id>` while signed in as the buyer or a support account that owns the session.
3. If the page says provisioning is catching up, wait 30-60 seconds and retry. The page can reconcile a launch kit from Stripe even if the webhook is delayed.
4. Check `/admin/site-reviews?agentId=<agent_id>` and `/admin/launch-kit?agentId=<agent_id>` for site status, billing status, review status, and provisioning audit.

## Replay Stripe Events

Replay from the Stripe Dashboard first when possible:

1. Open Stripe Dashboard.
2. Go to Developers -> Webhooks -> the Sunset Pulse endpoint.
3. Find the event by ID, usually `checkout.session.completed`, `customer.subscription.updated`, or `customer.subscription.deleted`.
4. Use Replay/Resend for the event.
5. Confirm the endpoint returns a 200 response.

For local CLI validation, only use test-mode secrets:

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
stripe trigger checkout.session.completed
```

Do not replay live events from local development. Use production Stripe Dashboard replay for live events so signature verification and production environment variables match.

## Inspect The Webhook Ledger

The webhook ledger prevents duplicate processing. Look for the event ID in:

- Supabase table: `stripe_webhook_events`
- Mongo model: `StripeWebhookEvent`

Expected statuses:

- `processing`: claimed but not completed. Investigate recent function logs.
- `succeeded`: processed; duplicate deliveries should be ignored.
- `failed`: processing failed after claim. Operators should receive a failure email.

If the event is `failed`, inspect `error_message`, fix the underlying issue, then replay the Stripe event.

## Verify Site State

A healthy paid site checkout should produce:

- `billingProfile.billingStatus`: `trialing`
- `billingProfile.trialEndsAt`: roughly 90 days after checkout
- `billingProfile.stripeCheckoutSessionId`: the `cs_` ID
- `billingProfile.stripeSubscriptionId`: the `sub_` ID
- `status`: `draft` until buyer setup and operator approval are complete
- `provisioningAudit[0].action`: `checkout.session.completed` or checkout onboarding reconciliation

Billing recovery behavior:

- If billing interrupted a live approved site and recovery passes buyer-safe checks, the site can return `active`.
- If billing interrupted a draft or incomplete setup, the site stays `draft` even after billing recovers.

## Run Grace Cron

Production cron endpoint:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.sunsetpulse.app/api/billing/grace-expiry/cron?limit=25"
```

Expected response shape:

```json
{
  "success": true,
  "data": {
    "message": "Site billing grace expiry check completed.",
    "scanned": 0,
    "expired": 0,
    "skipped": 0,
    "processed": []
  }
}
```

If sites expire, confirm buyer/operator grace-expired emails and review the launch-kit audit trail.

## Common Fixes

- Missing site after checkout: open `/onboarding/site?session_id=<session_id>` as the buyer to reconcile, then replay `checkout.session.completed` if needed.
- Duplicate webhook: no action if the ledger shows `succeeded`; duplicates are intentionally skipped.
- Failed webhook: fix the logged error, confirm alert email recipients, replay the Stripe event.
- Past-due but still live: this is expected during grace.
- Billing recovered but site still draft: confirm setup readiness and operator review approval.
