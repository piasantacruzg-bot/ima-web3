# Setup

## 1. Create a Supabase project

<https://supabase.com/dashboard> → New project. Note the project URL,
`anon` key, and `service_role` key (Settings → API).

## 2. Apply the schema

See `DATABASE.md` — apply `supabase/migrations/*.sql` in order via the
Supabase CLI (`supabase db push`) or the SQL editor. Optionally run
`supabase/seed.sql` afterwards for demo data.

## 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in at minimum:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The social platform API and Anthropic API variables are optional — they're
only needed once those integrations are built (Phases 6 and 8) and used.
See `ENVIRONMENT.md` for the full list.

## 4. Create your first user

There is no public sign-up (this is an internal agency tool). Create the
first account from the Supabase Dashboard → Authentication → Users → Add
user. A `profiles` row is auto-created for it with role `member`; promote
it to `admin` directly in the `profiles` table (SQL editor):

```sql
update profiles set role = 'admin' where email = 'you@agency.com';
```

## 5. Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, sign in with the account you created.

## 6. Verify

```bash
npm run typecheck
npm run lint
npm run build
```

See `TESTING.md` for what's been verified so far and what to check once
you have a real Supabase project connected.
