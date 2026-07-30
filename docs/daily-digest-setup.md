# Daily digest email

Every morning, a summary of the previous day lands in your inbox: visitors, page
views, sign-ins, shares (with a per-target breakdown), answers keyed and letters
learned, each with a day-over-day change.

The code is deployed and running. It needs two things it cannot create itself: a
place to keep the counters, and something to send mail with. Until both exist the
endpoints answer honestly rather than failing, which is what they do today:

```
POST /api/pulse       -> {"ok":true,"stored":false}
GET  /api/digest?dry=1 -> {"ok":false,"reason":"analytics store not configured"}
```

---

## 1. A store for the counters

Vercel dashboard, project `ryans-morse-code-trainer`: **Storage → Marketplace →
Upstash (Redis)**, create a free database and connect it to the project. That sets
`KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically, which is all the code
looks for.

Redeploy, then confirm:

```bash
curl -s https://ditdah.me/api/pulse -X POST     # expect "stored":true
```

Counters start accruing from that moment; the first digest covers the first full
day after.

## 2. A mailer

[Resend](https://resend.com) has a free tier that is far more than a daily email
needs. Create an API key, then add to Vercel (Production):

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | your key |
| `CRON_SECRET` | any long random string |
| `DIGEST_TO` | `ryanbyrd@gmail.com` (the default, override to change) |
| `DIGEST_FROM` | optional, see below |

`CRON_SECRET` is what stops anyone who finds the URL from making it send mail:
Vercel's cron sends it as a bearer token, and the handler rejects anything else.

**About the from-address.** The default is Resend's `onboarding@resend.dev`,
which only delivers to the address that owns the Resend account. That is fine for
a personal digest and needs no DNS. To send from your own domain, verify
`ditdah.me` in Resend and set `DIGEST_FROM` to something like
`Ditdah <digest@ditdah.me>`. Worth doing anyway if you ever move the sign-in
emails off Supabase's built-in mailer, since that needs the same verified domain.

## 3. Check it

```bash
# Renders and collects without sending
curl -s "https://ditdah.me/api/digest?dry=1" -H "Authorization: Bearer $CRON_SECRET"

# A real send
curl -s "https://ditdah.me/api/digest" -H "Authorization: Bearer $CRON_SECRET"
```

The schedule lives in `vercel.json`: `0 14 * * *`, which is 08:00 in Denver
during daylight saving and 07:00 otherwise. Vercel's Hobby plan allows one cron
run per day and may fire it anywhere inside that hour.

---

## What is counted, and what is not

`/api/pulse` fires once per browsing session and is **not** gated on the
tracking-consent setting, because it records nothing about a person:

- **Page views** are a plain counter.
- **Visitors** are counted by hashing IP, user-agent and a salt that changes
  every day, then adding that to a set. The raw address is never written down,
  the hash cannot be linked across days, and once the salt rotates it cannot be
  recomputed. It answers "how many" without answering "who".
- **Sign-ins, shares, answers and letters learned** are plain counters too.
- Every daily key expires after 45 days.

Detailed per-letter learning events remain behind the tracking-consent toggle as
before, so the digest's "answers keyed" and "letters learned" rows only reflect
learners who opted in. Visitors, views, sign-ins and shares reflect everyone.

Set `PULSE_SALT` to a random string if you would rather not use the default.

---

## Reading it

- **Visitors far below page views** means people are returning through the day,
  which is what you want from a practice app.
- **Shares by target** tells you where to point any promotion.
- **Sign-ins near zero while visitors climb** suggests the account prompt is not
  landing; it is deliberately low-key, since the app works fine without one.
- A row of zeros right after setup usually means step 1 did not take. `curl` the
  pulse endpoint and look for `"stored":true`.
