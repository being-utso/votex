# Votex (React + Firebase)

Premium dark-themed web app for private cover-design voting with approval-gated access, limited votes per round, comment threads, fullscreen zoom/pan review, and an admin control room.

## Tech Stack

- React (functional components)
- Firebase Authentication (Google Sign-In)
- Firebase Firestore
- Firebase Storage
- Tailwind CSS
- Framer Motion

## Features

- Google login with approval-based access (`users.isApproved`)
- Responsive design gallery with glassmorphism cards
- Fullscreen design viewer with zoom/pan
- Per-design voting with:
  - pre-submit toggle (click again to remove selection)
  - confirmation modal before final submission
  - submission lock after finalization
  - vote limit per user per round
- Vote counts hidden from users until results are published
- Privacy model:
  - users can only see total votes (never voter identities)
  - only admins can inspect who voted
- Comment section (name, timestamp, text)
- Admin dashboard:
  - add new designs by image URL
  - start/end voting
  - publish results
  - hide/publish results
  - update vote limit

## Project Structure

```text
src/
  components/
  contexts/
  hooks/
  lib/
  pages/
  routes/
  services/
firebase.json
firestore.rules
firestore.indexes.json
storage.rules
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Fill Firebase values in `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Optional admin fallback list:

```env
VITE_ADMIN_EMAILS=admin@company.com
```

4. Run dev server:

```bash
npm run dev
```

## Firebase Configuration

### 1) Enable Google Authentication

- Firebase Console -> Authentication -> Sign-in method -> Google -> Enable

### 2) Firestore

- Create Firestore database (production mode recommended)
- Create the required `settings/global` document before using the app:

```json
{
  "currentRound": 1,
  "maxVotesPerUser": 3,
  "votingOpen": false,
  "showResults": false,
  "resultsPublished": false,
  "adminEmails": ["admin@company.com"]
}
```

Use lowercase email values.

### 3) Storage

- Create Firebase Storage bucket

### 4) Deploy rules and indexes

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Firestore Collections

- `users`
  - document ID is user email (lowercase), for example `users/user@gmail.com`
  - profile, role, votes used per round, voted design IDs, submission status per round
- `designs`
  - title, image URL, creator name, round ID, timestamp
- `votes`
  - one doc per (`roundKey + userId + designId`)
  - fields: `userId`, `userEmail`, `userName`, `designId`, `round`, `isSubmitted`, `createdAt`, `submittedAt`
- `voteTotals`
  - public aggregate totals per design and round
  - fields: `round`, `roundKey`, `designId`, `totalVotes`, `updatedAt`
- `comments`
  - design ID, user info, text, timestamp
- `settings`
  - global voting controls

## Notes

- Vote totals shown to users are fetched from `voteTotals` only.
- Voter identity is read from `votes` by admins only.
- Publishing results recomputes round totals from submitted votes (`isSubmitted: true`).
- Voting uses Firestore transaction checks to enforce limits and toggle state.
- `Submit Votes` marks selected votes as `isSubmitted: true` and locks further changes.
- Security is enforced via `firestore.rules` and `storage.rules`.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```
