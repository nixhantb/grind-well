# GrindWell

**Your brain isn't the problem. Your motor is.**

---

## Read this first

You can spot a pattern in three seconds. Give you a riddle, a Sudoku, an IQ test, one of those "what comes next" puzzles your cousin sends in the group chat — you're fine. Sometimes you're the fastest one in the room.

Then you open a LeetCode medium and it's like someone swapped your brain for a brick. You *recognize* it's a sliding window. You *know* the two-pointer trick exists. You can practically feel the shape of the answer sitting a few inches out of reach. And your hands just... don't produce it. Blank file, blinking cursor, twenty minutes gone, and you close the tab telling yourself you're "just not a logic person."

Before you write that verdict on yourself, take five minutes and answer these.

## A 5-question pattern check

No coding. No syntax. Just look at each one and find the rule. Answers are hidden under the spoiler tags — no peeking until you've committed to an answer.

**1. What's next in the sequence?**

`2, 6, 12, 20, 30, 42, ?`

<details><summary>Answer</summary>

**56.** Each term is `n × (n+1)`: 1×2, 2×3, 3×4, 4×5, 5×6, 6×7, 7×8=56. The gaps between terms (4, 6, 8, 10, 12) are themselves going up by 2 — a pattern one level down from the one you're staring at.

</details>

**2. Which number doesn't belong?**

`121, 144, 169, 200, 225`

<details><summary>Answer</summary>

**200.** The rest are perfect squares (11², 12², 13², 15²). 200 is the imposter — nothing to do with size or evenness, everything to do with a hidden category.

</details>

**3. What's the next symbol in the cycle?**

`↑ → ↓ ← ↑ → ?`

<details><summary>Answer</summary>

**↓.** It's a clockwise rotation repeating every 4 steps. Spotting the cycle length is the whole puzzle.

</details>

**4. Complete the analogy:**

`4 is to 16 as 6 is to ?`

<details><summary>Answer</summary>

**36.** The relationship is "square the number," not "add 12" or anything tied to the specific numbers shown — the trap is anchoring on the first pair's arithmetic instead of its structure.

</details>

**5. True, false, or can't be determined?**

*"All Zorks are Fendles. Some Fendles are Gribbles. Therefore, some Zorks are Gribbles."*

<details><summary>Answer</summary>

**Can't be determined.** This is the classic syllogism trap — the Gribbles overlapping with Fendles might not touch the Zorks at all. It *feels* true because the sentence flows logically, but nothing in the premises guarantees it. (This exact failure mode — accepting a conclusion because it *sounds* right instead of checking whether it's actually forced — is the same one that ships a plausible-looking off-by-one into a coding interview.)

</details>

## Now the verdict

If you got **2 out of 5** — 40% — on questions you'd never seen before, with no practice, no warm-up, cold: **your pattern recognition is fine. Your cognitive ability is fine. Your brain is not the bottleneck.**

So why does the same brain freeze on a two-pointer problem it's seen the *shape* of a dozen times?

Because recognizing a pattern and **producing a working implementation of it, from nothing, under time pressure** are two different skills, running on two different systems. One is perception. The other is motor memory — the same category of skill as riding a bicycle or playing fingerstyle guitar.

Nobody watches a guitar tutorial once, understands the theory perfectly, and then plays the piece. Understanding the chord shape and your fingers *being able to move there without thinking* are separated by hundreds of unglamorous, repetitive reps. You wouldn't call yourself "bad at music" for needing those reps. But somehow, needing them for code turns into "I'm not smart enough for this."

You are not failing at DSA because you can't think. You're failing because **your motor has never been trained** — nobody ever put you through the boring, repeatable reps that turn "I recognize this pattern" into "my hands just typed the correct solution in six minutes, cold, from an empty file." Anyone can learn to crack LeetCode. Anyone can build the logic. The only real variable is whether you actually trained the motor, or just kept reading about it.

That's the entire premise of this project.

## What GrindWell actually is

GrindWell is a **local-first spaced-repetition trainer for turning recognized patterns into typed-from-memory solutions.** It's not another problem list, not another set of video explanations. It assumes you already understand the pattern the first time you solve a problem — its whole job is drilling the *implementation* into your hands until it's automatic, using the same interval-based repetition that works for vocabulary, music, and every other motor/memory skill.

- **24 patterns, ~149 problems**, worked through in a fixed, deliberate order — template first, problems second.
- **The re-typing protocol** — every accepted solution gets re-typed from an emptied file at increasing intervals (same day, +1 day, +3 days, +7 days, +21 days), no copy-paste, no scrolling up, ever. Paste is disabled in the trainer editor on purpose.
- **The 90-second stall rule** — stuck mid-rep for 90 seconds? Peek for 20 seconds, then delete the whole method body and restart from the signature. You never patch a broken sequence mid-rep; you re-run the whole motor pattern.
- **The blank-page ritual** — a scripted first 90 seconds for any new problem (signature → dummy return of the right type → I/O comments → brute-force skeleton) so you're never allowed to sit and "think" at an empty file. Thinking happens on paper; the editor only receives decisions you've already made.
- **The pseudocode bridge** and the **20-minute ladder** — structured checkpoints for when to still be brute-forcing, when to be optimizing, and when you've earned the right to look at the editorial.
- **Graduation logic** — a problem leaves the queue for good after three consecutive *clean* reps (no reference material, correct within the target time). A failed or assisted rep doesn't reset your progress to zero — it just resets the interval to +1 day.
- **Cold reproduction rate** — the one metric on the dashboard that matters: clean reps ÷ reps attempted. Not "problems solved." Whether it's actually sticking.
- **Stuck-line tracking** — log exactly which line you stalled on, every rep. After ten problems, the same two or three lines show up over and over — that's your real, personal curriculum, not a generic weak-topics list.
- **Fully local-first** — everything lives in your browser's storage. No account, no server, no telemetry. Export/import JSON is your backup and your only way to sync machines.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build       # type-check (vue-tsc) + production build
npm run preview     # preview the production build locally
npm test            # run the unit tests (vitest)
```

## Project structure

```
src/
  views/          # route-level screens: Dashboard, Patterns, Trainer, Queue, Protocols, Data...
  components/      # base UI kit (Button, Card, Table, Modal, MotorTrainer, ...)
  lib/            # pure, framework-free logic: scheduler, diffing, exportImport, etc.
  stores/         # Pinia stores (progress tracking, app state)
  content/        # the 24 patterns / ~149 problems + the five protocols, as data
  i18n/           # all UI copy in one place
```

The scheduler (`src/lib/scheduler.ts`) is the heart of the app: pure, dependency-free functions that decide what's due, when the next rep lands, and whether a problem has graduated — deliberately written with no `Date.now()` and no framework imports, so years of simulated reps are just a unit test.

## Why this exists

Recognizing a pattern is cheap. Typing a correct, working implementation of it from a blank file, under time pressure, with no reference — repeatedly, until it's automatic — is the actual skill an interview tests. That's a motor skill, and motor skills are trained by structured repetition, not by reading one more explanation of the same pattern.

You already passed the quiz. Time to train the motor.
