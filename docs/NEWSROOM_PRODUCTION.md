# RCH newsroom production readiness

RCH has scheduled editorial and sports-wire jobs, but model-backed stories cannot publish without a server-side OpenAI API key. This is **an operations credential**, not a value to commit to Git or set with `NEXT_PUBLIC_`.

## Required production configuration

1. In Vercel > `rich-city-league` > Settings > Environment Variables, add `OPENAI_API_KEY` as a **Sensitive** value, scoped to **Production**. Use a key that has access to the Responses API and web search.
2. Keep `CRON_SECRET`, Supabase project URL and server service key present. Do not print, check in, or send their values in logs.
3. Optionally specify `OPENAI_NEWSROOM_MODEL` and `OPENAI_SPORTS_WIRE_MODEL` for models your API project can access. Defaults are `gpt-5.6-terra` and `gpt-5.6-luna` respectively.
4. Redeploy production after changing environment variables.
5. Invoke the **authorized** `GET /api/cron/health` endpoint with `Authorization: Bearer <CRON_SECRET>` from an approved private diagnostic client. Check that `aiModelConfigured` and `databaseConfigured` are true. Never open this endpoint in a public browser or paste the secret into chat.
6. Observe the next scheduled run of `/api/cron/newsroom/daily` and `/api/cron/sports-wire` in Vercel runtime logs. Confirm one real, sourced publication appears in Supabase and on `/news` or in the social feed.

The newsroom is intentionally strict: an article is published only when it has sufficient trustworthy sources and passes editorial validation. Empty news searches are legitimate skips rather than incidents.

If the API responds with a model-not-found or permission error, verify the model IDs enabled on the OpenAI API project. Do not lower source quality or publish unsourced fallback stories to mask an outage.
