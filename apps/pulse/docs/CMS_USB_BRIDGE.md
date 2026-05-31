# CMS USB Bridge

This bridge is designed for a read-only Verifone RubyCi/Commander-style CMS connection.

## Target Flow

1. Plug the approved USB/serial/export device into the local Sunset Pulse machine.
2. Run the local bridge beside the Next.js app.
3. The bridge checks in at `/api/cms/usb`.
4. Sanitized transaction/export batches are submitted to `/api/cms/ingest`.
5. The dashboard at `/admin/cms` updates bridge status and accepted batch counts.

## Local Commands

```powershell
npm run dev --workspace=apps/pulse -- -p 3001
cd apps/pulse
python scripts/cms_usb_bridge.py --mock
python scripts/cms_usb_bridge.py --port COM7 --watch
python scripts/cms_usb_bridge.py --file scratch/transset-sample.json
```

Set `CMS_BRIDGE_TOKEN` in the app and bridge environment to require a shared token.

## Safety Boundary

The bridge must not capture PAN, track data, PIN data, EMV payloads, authorization messages, or payment-control commands. Sunset Pulse should receive only sanitized transaction exports, department/tender summaries, operational journal events, and bridge health.

## Next Production Tasks

- Identify the actual Windows device path/COM port after USB attach.
- Confirm whether RubyCi exports arrive as serial messages, mounted files, or back-office scheduled report files.
- Add the parser for that exact export format.
- Persist accepted batches to MongoDB or Supabase instead of local state.
