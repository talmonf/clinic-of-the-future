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

Meeting recordings need `002_meeting_recordings.sql` as well, and a private S3 bucket. Set `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `S3_BUCKET`. The bucket is not public. Its CORS must allow `PUT` and `GET` from the site origin, with `AllowedHeader` set to `*`. The key needs `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on `meetings/*`. Audio, and video that is mp4 or webm, can be uploaded up to 2 GB. The browser sends the file straight to S3.

## Deploy

Import the repo in Vercel and set the same environment variables. `NEXTAUTH_URL` must be the public site origin. Add `{origin}/api/auth/callback/google` as an authorized redirect URI in Google Cloud.
