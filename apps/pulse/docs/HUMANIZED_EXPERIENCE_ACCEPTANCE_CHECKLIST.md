# Humanized Experience Acceptance Walkthroughs

Use this checklist to review the remaining local acceptance work for the Fieldbook seller experience. It covers the seller daily workspace, seller journey, setup guide, client progress sharing, and optional Jamie voice capture. These are manual acceptance checks, separate from automated or hosted CI.

## Before you start

- [ ] Use a local or isolated test database. Confirm the local app is not pointed at production before changing a seller case or publishing progress.
- [ ] Prepare one disposable seller request with a verified test owner account, a separate verified test client account whose email matches that request, and fictional contact details.
- [ ] Add obvious private sentinel text to the test case's internal notes and conversation history, such as `PRIVATE-TEST-NOTE-DO-NOT-SHARE`. Keep one test document link private and one approved test link available to select.
- [ ] Use a case with no real customer data. Do not send an email, SMS, or other seller communication during this walkthrough.
- [ ] Start the local app from `C:\Users\Taz\SunsetPulse\apps\pulse` with `npm run dev`, then open `http://localhost:3000`. Sign in as the test owner. Keep a separate browser profile available for the test client.
- [ ] Playwright uses the ignored `.next-e2e` build directory so its build does not share `.next` with the normal app. If Next stalls before opening the browser, stop the local run and record the error; do not wait on a hosted deployment. Do not delete either build directory while a local server is running. These walkthroughs do not need Vercel.

Record the date, app commit, database environment (local/test only), browser/device, and results below. Do not include credentials, access tokens, or real seller information in notes or screenshots.

- Run date:
- App commit:
- Local/test database:
- Browser and device:

## 1. Seller daily workspace at phone and desktop sizes

Open `/today` as the test owner.

- [ ] At 390px wide, confirm **Seller business** and the next seller action are visible without horizontal scrolling.
- [ ] Open **Schedule response** for the disposable request. Confirm the dialog fits within the viewport, can be closed with Escape, and closing does not change or discard unrelated drafts.
- [ ] Repeat at 1440px wide. Confirm the same action and dialog remain usable and no horizontal scrolling appears.
- [ ] Confirm the request links to the right seller record and the schedule action preserves the exact request and time-zone details shown by the app.

Pass when both widths work, the dialog stays on-screen, and opening/closing it causes no write.

## 2. Saved seller journey

From `/today` or `/seller-inbox`, open the disposable request's seller case at `/seller-cases/<test-lead-id>`.

- [ ] At 1440px and 390px, find **Where things stand** and confirm every displayed stage is based on saved records.
- [ ] Confirm an accepted appointment is shown as planned until the consultation-held milestone is explicitly recorded.
- [ ] Confirm the next action points to the existing inbox, planner, or milestone control appropriate to the case.
- [ ] If the test fixture has a later saved stage and an earlier missing stage, confirm the suggested action follows the latest verified stage rather than sending the owner backward.
- [ ] Use only the disposable case for any milestone changes. Confirm the saved date and evidence appear in the journey after refresh.

Pass when planned and recorded states are distinct, dates match saved records, and no unsaved action is presented as complete.

## 3. Seller setup guide

Open `/seller-setup` as the test owner.

- [ ] At 390px and 1440px, review **Your day and timezone**, **Your seller website**, **Your reminders**, and **Your first seller request**.
- [ ] Compare each Ready, Needs action, or Unavailable label with the saved account settings and records. Refresh and confirm the labels still reflect server state.
- [ ] Follow each available setup link and confirm it opens the existing setting or account control.
- [ ] Confirm an incomplete or unavailable read is not presented as an empty, completed setup.
- [ ] Confirm **Operator details** is collapsed by default. Expand it and check that it explains stored job/configuration state without exposing secrets.
- [ ] If email sending is disabled in this test account, confirm the manual verified-mailbox path remains visible and usable.

Pass when no local checkbox can claim setup is complete and refreshing uses the saved status.

## 4. Owner publication, client visibility, and revocation

Use only the disposable case and test client account. Open its seller case as the owner.

- [ ] In **Shared progress**, choose **Review client update**. Add a fictional summary and select only approved test milestones, checklist items, and document links.
- [ ] Confirm the private sentinel note, private conversation, and unselected document do not appear in the client preview.
- [ ] Choose **Preview exact update**. Read the preview and confirm it matches exactly what the client should receive. Change one field, then confirm the previous review is invalidated and a new preview is required.
- [ ] Confirm publishing is disabled until **I reviewed this exact client update and its document links** is checked. Publish the reviewed test update.
- [ ] In the separate test client browser profile, sign in at `/seller-portal` with the test client's verified email. Confirm no update is visible before owner access is enabled.
- [ ] As the owner, choose **Review verified access**, read the confirmation, and enable access only for the matching test account.
- [ ] Refresh `/seller-portal` as the client. Confirm the exact approved update, selected milestones/checklist, and chosen document links appear, while private notes, conversations, and unselected links remain absent.
- [ ] As the owner, choose **Review revocation** and revoke test access. Refresh the client's `/seller-portal` and confirm the shared progress is no longer available.
- [ ] Return to the owner case and confirm the saved publication/access state reflects the revocation.

Pass when publication requires an exact preview and explicit review, access requires a separate owner confirmation, and revocation removes client visibility. Do not use a real seller account or real client email.

## 5. Jamie case context and optional microphone capture

Use the disposable seller case on a physical device with a browser that supports microphone capture. Do not use real contact details or send the resulting draft.

- [ ] From the case, choose **Help me prepare with Jamie**. Confirm Jamie identifies the selected test case and does not display a different seller's information.
- [ ] Verify the private sentinel note, conversation text, email address, phone number, document URL, and other private case details do not appear in Jamie's case context.
- [ ] Start microphone capture only by explicitly pressing its control. Confirm the browser permission is requested at that moment, the UI shows capture is active, and Stop ends it.
- [ ] Review the transcript before use. Edit it, then use the explicit action to add the reviewed text to the composer. Confirm the draft can also be dismissed.
- [ ] Confirm capture or transcript review alone does not send a message, change a milestone, publish progress, or create a planner item. Leave the composer unsubmitted.
- [ ] Repeat with microphone permission denied, if practical. Confirm the typed workflow remains available and no capture is implied.

Pass when recording is opt-in, visibly stoppable, editable before use, and has no side effect beyond a temporary draft.

## Acceptance record

| Walkthrough | Viewport/device | Result | Notes or issue link |
| --- | --- | --- | --- |
| Daily workspace | 390px and 1440px | Not run | |
| Seller journey | 390px and 1440px | Not run | |
| Setup guide | 390px and 1440px | Not run | |
| Owner publication and client access | Owner and client test profiles | Not run | |
| Jamie microphone capture | Physical device and browser | Not run | |

Clean up the disposable test case and any local screenshots when the walkthrough is complete. Keep only the acceptance result and actionable defects; do not retain transcripts or private client data.

