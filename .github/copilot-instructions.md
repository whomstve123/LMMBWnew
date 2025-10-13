# Copilot Instructions for AI Coding Agents

## Project Overview
This is a Next.js app for facial recognition and audio track generation. The core workflow maps a detected face to a unique, deterministic audio track using a hash-based lookup and Supabase for persistence.

## Key Architectural Patterns
- **Face Detection:** Uses `face-api.js` via `utils/face-api.ts` and related components. Models must be present in `public/models`.
- **Face Hashing:** Face descriptors are hashed (MD5) to produce a unique, repeatable identifier (`faceHash`).
- **Track Mapping:** The API (`app/api/face-mapping/route.ts`) maps each face hash to a track ID and audio URL. If a mapping exists, it is reused; otherwise, a new mapping is created.
- **Determinism:** The same face always yields the same hash, track ID, and audio URL. Different faces yield different results.
- **Persistence:** Mappings are stored in Supabase (`face_track_mappings` table) and checked before generating new tracks.

## Developer Workflows
- **Run Determinism Tests:**
  - Use `node scripts/test-hash-audio-determinism.js` to verify that identical face hashes yield identical audio URLs and track IDs, and different hashes yield different results.
- **Start Dev Server:**
  - `npm run dev` (see `README.md`)
- **Model Setup:**
  - Download required models to `public/models` (see `README.md` for commands).

## Project-Specific Conventions
- **Face Hashes:** Always use the output of `face-api.js` descriptor hashing for mapping.
- **API Contracts:**
  - `/api/face-mapping` expects `{ faceHash }` in POST requests.
  - Returns mapping info or creates a new mapping if not found.
- **Component Usage:**
  - Use `components/face-detector.tsx` and related overlays for face capture and feedback.
- **Error Handling:**
  - Log and continue on Supabase select errors unless critical.

## Integration Points
- **Supabase:** Used for persistent mapping of face hashes to tracks.
- **face-api.js:** For face detection and descriptor generation.
- **Audio Generation:** Triggered via `/api/generateTrack` using the face hash.

## Example: Determinism Test
```bash
node scripts/test-hash-audio-determinism.js
```
- Output should show that repeated hashes yield the same audio URL and track ID.

## Key Files & Directories
- `utils/face-api.ts`: Face detection and descriptor logic
- `app/api/face-mapping/route.ts`: Face hash to track mapping API
- `scripts/test-hash-audio-determinism.js`: Determinism test script
- `public/models/`: Required face-api.js model files
- `README.md`: Setup and workflow instructions

---
If any section is unclear or missing, please provide feedback for further refinement.