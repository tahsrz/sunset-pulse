# Guided Seller Request Rehearsal

The local Sell My Home and Buy and Sell paths now prepare a real version 3 request in memory. The preview uses a simulated outcome and has no save transport. The public form still sends version 2 requests. Find a Home remains a walkthrough without buyer persistence.

## Try It Locally

Run `npm run preview:home-journey --workspace apps/pulse` in the isolated checkout and open the loopback URL it prints. Follow the [prototype walkthrough](guided-home-journey-prototype-2026-11-04.md) with fictional details.

1. On the last step select **Show Loading, Then an Error** in **Preview Controls** and choose **Preview My Request**. The button reads **Loading…** and the contact fields are disabled while preparation is pending.
2. Find **Last Prepared Request ID** in **Preview Controls** after the error. Switch to **Show Loading, Then Complete** and retry without editing. The ID stays the same.
3. Go back to review, edit a mortgage answer and repeat. The changed request receives a new ID. The details panel displays the version, byte count and ID. Refresh or reset to clear the draft.
4. Enter `quit` in the launcher terminal when finished.

## Code and Integration

`useSellerJourneySubmission.ts` acquires its submit guard before hashing. It keeps the fingerprint and ID in memory across uncertain outcomes. It uses a 15-second default deadline, aborts on unmount and discards late replies. A validated receipt seals the attempt until reset, even when the optional consultation offer fails validation. `GuidedJourneyShell.tsx` disables the current fields while preparation is pending.

The existing scheduler and consultation picker are on the reviewed seller feature stack in PR #101 (`042057e1` at review). Attach the adapters on that base after the existing writer and owner reader support v3. Preserve the feature form's honeypot, campaign attribution, consent and receipt handling.

```ts
const submission = useSellerJourneySubmission({
  transport: existingV3Adapter,
  parseBookingOffer: (value) => {
    const result = sellerBookingOfferSchema.safeParse(value);
    return result.success ? result.data : null;
  },
});
```

`existingV3Adapter` denotes the future adapter to the existing intake endpoint. It must forward the abort signal and return the HTTP result and parsed body. Render the existing `SellerConsultationPicker` only for a validated offer. Booking uses the existing scheduler and reminder flow independently of the saved request.

## Verification

- 48 focused tests passed, including 12 submission cases for duplicate clicks, unchanged retries, material edits, timeout, unmount and receipt or booking outcomes. Scoped TypeScript and ESLint passed.
- The isolated browser walkthrough exercised request preparation, retry identity, a changed mortgage answer, disabled fields, all three journeys, property prefill and manual recovery. It recorded four read-only lookup POSTs and zero save requests.
- The save and booking adapters were tested with injected responses. Hosted persistence and calendar booking remain integration checks for the reviewed seller feature stack.
