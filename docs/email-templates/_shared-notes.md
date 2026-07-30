# Ditdah email templates

Paste these into **Supabase → Authentication → Emails → Templates**. They only
render as intended once **custom SMTP** is configured (Authentication → Emails →
SMTP Settings); the built-in test mailer appends its own "powered by Supabase"
footer and opt-out link regardless of the template, and sends from
`noreply@mail.app.supabase.io`.

Which template fires with `signInWithOtp` (what Ditdah calls):

| Situation | Template |
|---|---|
| Address has never signed in before | **Confirm signup** |
| Returning user | **Magic Link** |

Both are provided, because a new user only ever sees the first one and it is the
one that looked unbranded.

Supabase variables used: `{{ .ConfirmationURL }}`. Others available include
`{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`.

Written for email clients, not browsers: tables, inline styles, no flexbox, no
web fonts, no external CSS. The dark shell degrades to a plain white background
in clients that strip it, and the text stays legible either way.
