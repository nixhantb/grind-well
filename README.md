## What GrindWell actually is

GrindWell is a **local-first spaced-repetition trainer for turning recognized patterns into typed-from-memory solutions** its whole job is drilling the *implementation* into your hands until it's automatic, using the same interval-based repetition that works for vocabulary, music, and every other motor/memory skill.

- **24 patterns, ~149 problems**, worked through in a fixed, deliberate order - template first, problems second.
- **The re-typing protocol** - every accepted solution gets re-typed from an emptied file at increasing intervals (same day, +1 day, +3 days, +7 days, +21 days), no copy-paste, no scrolling up, ever. Paste is disabled in the trainer editor on purpose.
- **The 90-second stall rule** - stuck mid-rep for 90 seconds? Peek for 20 seconds, then delete the whole method body and restart from the signature. You never patch a broken sequence mid-rep; you re-run the whole motor pattern.
- **The blank-page ritual** - a scripted first 90 seconds for any new problem (signature → dummy return of the right type → I/O comments → brute-force skeleton) so you're never allowed to sit and "think" at an empty file. Thinking happens on paper; the editor only receives decisions you've already made.
- **The pseudocode bridge** and the **20-minute ladder** - structured checkpoints for when to still be brute-forcing, when to be optimizing, and when you've earned the right to look at the editorial.
- **Graduation logic** - a problem leaves the queue for good after three consecutive *clean* reps (no reference material, correct within the target time). A failed or assisted rep doesn't reset your progress to zero - it just resets the interval to +1 day.
- **Cold reproduction rate** - the one metric on the dashboard that matters: clean reps ÷ reps attempted. Not "problems solved." Whether it's actually sticking.
- **Stuck-line tracking** - log exactly which line you stalled on, every rep. After ten problems, the same two or three lines show up over and over — that's your real, personal curriculum, not a generic weak-topics list.
- **Fully local-first** - everything lives in your browser's storage. No account, no server, no telemetry. Export/import JSON is your backup and your only way to sync machines.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build       # type-check (vue-tsc) + production build
npm run preview     # preview the production build locally
npm test            # run the unit tests (vitest)
```
