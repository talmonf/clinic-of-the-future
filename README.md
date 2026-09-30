# המרכז הרב־תחומי לבריאות הנפש

Hebrew public site and founder planning system for a multidisciplinary mental-health center that is still being set up.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The public pages work without a database. Login and the admin need the env vars in `.env.example`.

## Database

Only a founder runs SQL, on Neon. Open `db/migrations/000_INDEX.md`, edit the founder emails inside `001_initial_schema.sql`, run that file, then tick it in the index. The app never runs migrations.

## Deploy

Import the repo in Vercel and set the same environment variables. `NEXTAUTH_URL` must be the public site origin. Add `{origin}/api/auth/callback/google` as an authorized redirect URI in Google Cloud.
