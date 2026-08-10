# mi.net — required phone verification

## What this patch changes

Registration is now:

```text
Display name
Username
Phone
Email
Password
    ↓
Supabase phone + password signup
    ↓
SMS with 6-digit OTP
    ↓
OTP verification
    ↓
Email attached to the same account
    ↓
mi.net session starts
```

Phone numbers stay in Supabase Auth and are **not** copied into `public.profiles`.

Users can later sign in using either:

- email + password;
- phone + password.

## 1. Enable Phone Auth in Supabase

Open your project:

**Authentication → Providers → Phone**

Enable Phone authentication.

You must configure an SMS provider supported by your Supabase project.

Examples supported by Supabase include:

- Twilio
- MessageBird
- Vonage
- Textlocal (community-supported)

The exact dashboard UI/provider availability can change.

## 2. Phone confirmation MUST be enabled

The frontend intentionally rejects registration if `signUp({ phone, password })`
returns an immediate authenticated session.

That would mean the phone was not actually challenged by SMS.

For the anti-spam registration flow you need Supabase to send the SMS verification code.

## 3. Test with E.164 phone numbers

Examples:

```text
+14155552671
+447911123456
```

The frontend requires:

```text
+<country code><number>
```

No local-only numbers are accepted.

## 4. Existing users

Existing email-only accounts are not automatically forced through phone verification
by this frontend patch.

If mi.net is still in development, the cleanest approach is to use the phone requirement
for all new accounts and decide later whether legacy accounts need a migration/enforcement flow.

## 5. Abuse protection

Phone verification makes mass registration more expensive, but it is not sufficient by itself.

For production, also configure in Supabase:

- Auth rate limits;
- CAPTCHA / Cloudflare Turnstile or hCaptcha;
- sensible SMS OTP cooldowns;
- provider spending/usage alerts.

The frontend includes a 60-second resend cooldown to match Supabase's default OTP-request window,
but Supabase's server-side rate limits remain authoritative.

## 6. Email behavior

The account is created using the verified phone as its initial Auth identity.

After OTP verification, mi.net calls:

```text
auth.updateUser({ email })
```

Depending on your Supabase email-confirmation settings, the user may receive a confirmation email.

The phone-verified account can already sign in using phone + password.

After the email identity is confirmed, email + password can also be used.

## Files changed

```text
index.html
css/auth.css
js/auth.js
supabase/PHONE_AUTH_SETUP.md
```
