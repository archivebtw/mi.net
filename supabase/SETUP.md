# Supabase setup for mi.net

## 1. Create a Supabase project

Create a project in Supabase.

## 2. Run the database schema

Open:

**Supabase Dashboard → SQL Editor**

Paste and run:

`supabase/schema.sql`

It creates:

- `public.profiles`;
- unique case-insensitive usernames;
- English-only username validation;
- server-side banword validation;
- `is_username_available()` RPC;
- automatic profile creation after `auth.users` signup;
- Row Level Security policies.

## 3. Configure the frontend

Open:

`js/supabase-config.js`

Replace:

```js
url: 'YOUR_SUPABASE_PROJECT_URL',
key: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'
```

Use the **Project URL** and the browser-safe **publishable key** (or legacy anon key).

Do **not** use a `service_role` or secret key in frontend JavaScript.

## 4. Configure Auth URLs

In Supabase Dashboard, configure your deployed mi.net URL as the Site URL / allowed redirect URL.

For GitHub Pages, add the exact deployed page URL, for example:

```text
https://YOUR_USERNAME.github.io/mi.net/
```

This is needed for email confirmation and password recovery links.

## 5. Email confirmation

If **Confirm email** is enabled in Supabase Auth, registration creates the account and asks the user to confirm their email before signing in.

If email confirmation is disabled, the user receives a session immediately after signup.

## Included frontend flows

- Email + password registration
- Email + password sign in
- Session persistence / restoration
- Email confirmation compatible flow
- Forgot password email
- Password recovery
- Sign out
- Supabase profile loading
- Supabase profile editing
- Username availability checking
- Client + database username validation
- RLS protection
- Local prototype state isolated per Supabase user ID
