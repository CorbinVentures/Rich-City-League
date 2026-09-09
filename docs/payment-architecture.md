# Payment architecture

The repository does not contain Stripe, another payment SDK, provider credentials, or a provider webhook secret. Payment processing is therefore **not operational** and must not be represented as paid based on browser input.

The database already models the registration relationship in `payments.registration_id`, stores only amount/currency/provider identifiers, and restricts payment reads and writes with Supabase RLS. The application may display the current server-side payment status, but no client is allowed to set a successful status.

## External blocker

- **Service:** A payment provider (Stripe is the recommended choice, but has not been silently added).
- **Required configuration:** Provider account, server-side secret, webhook signing secret, public checkout configuration, and deployment secrets in the server/Vercel environment.
- **Remaining work:** Add a server-only checkout endpoint that creates an idempotent provider checkout, persist the provider checkout/payment identifier, and add a server-only webhook endpoint that verifies signatures, re-fetches the provider event, and performs an idempotent status update. Never accept raw card data or client-submitted payment status.

Until those secrets and provider decisions are supplied, registrations remain usable without falsely claiming that payment collection is complete.
