# RCH Sites — Organization Hub, Phase 1

**Scope:** Adults-only contact/interest inquiries for independent RCH Sites websites. This is not a youth registration, CRM import or confirmed service enrollment.

## Operator UX

- Visitor opens a verified published microsite and selects **Ask** / **Send an inquiry**.
- Visitor signs into an existing verified adult RCH account, selects one of Training, Program / tryouts, Camp / event, or General, and consents to share only their verified account email.
- RCH stores a tenant-owned private inquiry; no unverified email address, free-text message, DOB, minor name, medical note, phone number, guardian relation, money or roster fields.
- Website Studio > **Organization inbox** is a compact management screen with New / Contacted / Closed and email follow-up. Only active approved organization owners/managers with verified adult RCH accounts can see it.
- A person can submit one request to the same organization per UTC day, with a global cap of eight requests/day, to reduce spam. A database UNIQUE constraint covers concurrent duplicate submissions.
- Marking an inquiry **Contacted** or **Closed** records a responsible staff profile and review time.
- The organization can reply through its own email client using the supplied mailto link; no background emails or silent outbound automated communications are sent.

## Authorization/privacy boundaries

- Both API GET and staff status POST revalidate active RCH user, confirmed email, adult status through the existing verified-adult RPC, MFA assurance where enrolled, organization membership with owner/manager role, and organization approval.
- Public submissions require the actual published RCH site slug and eligible, verified active organization. Each record's tenant UUID is **derived on the server**, never trusted from a form field.
- RLS is enabled and **all anon/authenticated table permissions are revoked**; only the authenticated server endpoint's validated service-role use can insert/list/update this table.
- The staff inbox fetches one specific organization UUID and caps responses at 100. Updates constrain both inquiry UUID and organization UUID.
- Data lives in \`rch_site_inquiries\`; it does not affect core RCH social posts, leagues, court rankings, network memberships, bookings, PayPal links, website subscriptions or payments.
- No minor athlete data is collected or displayed. For a real AAU registration product, build and test separate verified guardian consent, records, retention, export and deletion flows before release.

## Release checklist

- [ ] Complete migration-sequence and authorization pgTAP tests
- [ ] Application TypeScript, ESLint, build and Vitest
- [ ] Vercel preview Ready
- [ ] Apply migration to production with verification before merge
- [ ] Merge only with all current-commit checks green
- [ ] Verify production deployment of matching merge SHA is Ready
- [ ] Follow up with a real adult-account-to-organization smoke test when an approved test organization is available
