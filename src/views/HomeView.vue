<script setup lang="ts">
// The marketing/brand landing page. Deliberately standalone from the rest
// of the app (see router/index.ts's `meta: { standalone: true }` and
// App.vue's branch on it): no sidebar, no i18n catalog. It DOES still
// share the app's dark/light theme (same store, same tokens.css
// variables) since a pitch page defaulting to dark-only would fight a
// visitor's own OS preference for no good reason.
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Zap, Sparkles, Brain, ArrowRight, ArrowDown, CheckCircle2, XCircle, Repeat, Bike, Guitar, Target, ListChecks, ShieldCheck, GraduationCap, Sun, Moon } from '@lucide/vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()

interface Question {
  prompt: string
  options: string[]
  correct: number
  explain: string
}

// Five short, self-contained puzzles, no coding, no syntax. Each one
// targets a different flavor of "pattern recognition": arithmetic
// sequences, categorical odd-one-out, cyclic/spatial rotation, ratio
// analogies, and (deliberately) a syllogism trap, because "a conclusion
// that SOUNDS right but isn't actually forced by the premises" is the
// exact failure mode that ships a plausible off-by-one in a real
// interview.
const questions: Question[] = [
  {
    prompt: 'What comes next?  2, 6, 12, 20, 30, 42, ?',
    options: ['50', '54', '56', '60'],
    correct: 2,
    explain: 'Each term is n×(n+1): 1×2, 2×3, 3×4 … 7×8 = 56. The gaps between terms (4, 6, 8, 10, 12) climb by 2, a pattern one level below the one you were staring at.',
  },
  {
    prompt: 'Which number doesn\'t belong?  121, 144, 169, 200, 225',
    options: ['144', '169', '200', '225'],
    correct: 2,
    explain: 'The rest are perfect squares (11², 12², 13², 15²). 200 is the imposter: nothing to do with size, everything to do with a hidden category.',
  },
  {
    prompt: 'What\'s next in the cycle?  ↑ → ↓ ← ↑ → ?',
    options: ['↑', '→', '↓', '←'],
    correct: 2,
    explain: 'A clockwise rotation repeating every 4 steps. Spotting the cycle length is the whole puzzle.',
  },
  {
    prompt: '4 is to 16 as 6 is to ?',
    options: ['12', '24', '36', '42'],
    correct: 2,
    explain: 'The relationship is "square the number," not "add 12." The trap is anchoring on the first pair\'s arithmetic instead of its structure.',
  },
  {
    prompt: 'All Zorks are Fendles. Some Fendles are Gribbles. So, some Zorks are Gribbles?',
    options: ['True', 'False', "Can't be determined"],
    correct: 2,
    explain: 'The classic syllogism trap. It *sounds* logically tight, but nothing forces the Gribbles that overlap with Fendles to touch the Zorks at all. Accepting a conclusion because it flows, instead of checking whether it\'s actually forced, that\'s the same failure mode that ships a wrong-looking-right bug.',
  },
]

// One slot per question, null until answered. Using an array of indices
// (not a Set/Map) keeps the template a plain v-for with direct index
// access; no derived lookups needed anywhere below.
const answers = ref<(number | null)[]>(new Array(questions.length).fill(null))

function answer(qIndex: number, optionIndex: number) {
  if (answers.value[qIndex] !== null) return // first click locks the question in
  answers.value[qIndex] = optionIndex
}

const allAnswered = computed(() => answers.value.every((a) => a !== null))
const score = computed(() => answers.value.filter((a, i) => a === questions[i].correct).length)
const scorePercent = computed(() => Math.round((score.value / questions.length) * 100))

// The whole pitch hinges on this number staying generous: 40% cold, on
// puzzles you've never seen, with zero practice, is the bar. Below it the
// copy still lands the same conclusion, just without pretending the score
// proves it.
const clearedBar = computed(() => scorePercent.value >= 40)

function scrollToQuiz() {
  document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="home" :data-theme="store.theme">
    <header class="home__bar">
      <div class="home__brand">
        <span class="home__brand-mark"><Zap :size="16" /></span>
        <strong>GrindWell</strong>
      </div>
      <div class="home__bar-actions">
        <button type="button" class="home__theme-toggle" :aria-label="store.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" @click="store.toggleTheme()">
          <Sun v-if="store.theme === 'dark'" :size="16" />
          <Moon v-else :size="16" />
        </button>
        <RouterLink to="/app" class="home__skip" aria-label="Enter app">
          <span class="home__skip-label">Enter app</span>
          <ArrowRight :size="14" />
        </RouterLink>
      </div>
    </header>

    <!-- ---------- hero ---------- -->
    <section class="hero">
      <p class="hero__eyebrow"><Sparkles :size="14" /> For people who ace puzzles and freeze on LeetCode</p>
      <h1 class="hero__title">
        Your brain isn't the problem.<br />
        <span class="hero__title-accent">Your motor is.</span>
      </h1>
      <p class="hero__sub">
        You can spot a pattern in three seconds. Riddles, Sudoku, "what comes next", you're fine, sometimes the
        fastest one in the room. Then you open a LeetCode medium and it's like someone swapped your brain for a
        brick. Before you write "not a logic person" on yourself, take the 60-second test below.
      </p>
      <button type="button" class="hero__cta" @click="scrollToQuiz">
        Take the pattern test <ArrowDown :size="16" />
      </button>
    </section>

    <!-- ---------- quiz ---------- -->
    <section id="quiz" class="quiz">
      <h2 class="quiz__title">5 questions. No syntax, no code. Just find the rule.</h2>
      <p class="quiz__sub">Commit to an answer before you check it. That's the whole test.</p>

      <ol class="quiz__list">
        <li v-for="(q, qi) in questions" :key="qi" class="q-card">
          <p class="q-card__prompt"><span class="q-card__num">{{ qi + 1 }}</span>{{ q.prompt }}</p>
          <div class="q-card__options">
            <button
              v-for="(opt, oi) in q.options"
              :key="oi"
              type="button"
              class="q-opt"
              :class="{
                'q-opt--correct': answers[qi] !== null && oi === q.correct,
                'q-opt--wrong': answers[qi] === oi && oi !== q.correct,
                'q-opt--faded': answers[qi] !== null && oi !== q.correct && answers[qi] !== oi,
              }"
              :disabled="answers[qi] !== null"
              @click="answer(qi, oi)"
            >
              <span>{{ opt }}</span>
              <CheckCircle2 v-if="answers[qi] !== null && oi === q.correct" :size="16" />
              <XCircle v-else-if="answers[qi] === oi && oi !== q.correct" :size="16" />
            </button>
          </div>
          <p v-if="answers[qi] !== null" class="q-card__explain">{{ q.explain }}</p>
        </li>
      </ol>

      <!-- ---------- verdict ---------- -->
      <Transition name="reveal">
        <div v-if="allAnswered" class="verdict">
          <p class="verdict__score">{{ score }} / {{ questions.length }} <span>({{ scorePercent }}% cold, no practice)</span></p>

          <template v-if="clearedBar">
            <h3 class="verdict__headline">Your pattern recognition is fine. Your brain is fine.</h3>
            <p class="verdict__body">
              That's the bar, and you cleared it, cold, on puzzles you'd never seen. So why does the same brain
              freeze on a two-pointer problem it's seen the <em>shape</em> of a dozen times?
            </p>
          </template>
          <template v-else>
            <h3 class="verdict__headline">Even this score doesn't tell you what you think it does.</h3>
            <p class="verdict__body">
              This wasn't a pass/fail test. It was a warm-up with zero practice and a five-minute time limit. It
              doesn't measure whether you can build logic. It measures whether you happened to know these five
              specific tricks cold. DSA freezes for a different reason entirely:
            </p>
          </template>

          <p class="verdict__body">
            Because recognizing a pattern and <strong>producing a working implementation of it, from nothing, under
            time pressure</strong> are two different skills, running on two different systems. One is perception.
            The other is motor memory: the same category of skill as <Bike :size="15" class="verdict__inline-icon" />
            riding a bicycle or <Guitar :size="15" class="verdict__inline-icon" /> playing fingerstyle guitar.
          </p>
          <p class="verdict__body">
            Nobody watches one tutorial, understands the theory perfectly, and then just plays the piece. Understanding
            the shape and your hands being able to produce it without thinking are separated by hundreds of
            unglamorous reps. You wouldn't call yourself "bad at music" for needing those reps. Somehow, needing them
            for code turns into "I'm not smart enough."
          </p>
          <p class="verdict__body verdict__body--strong">
            You're not failing at DSA because you can't think. You're failing because your motor has never been
            trained. Anyone can crack LeetCode. Anyone can build logic. The only real variable is whether you
            actually trained the motor, or just kept reading about it.
          </p>

          <RouterLink to="/app" class="verdict__cta">
            Go ahead: start training your motor <ArrowRight :size="18" />
          </RouterLink>
        </div>
      </Transition>
    </section>

    <!-- ---------- what it does ---------- -->
    <section class="features">
      <h2 class="features__title">This is what "training the motor" actually looks like</h2>
      <p class="features__sub">
        Not another problem list. Not another video explaining the pattern you already recognize. A spaced-repetition
        drill that turns "I get it" into "my hands just typed the correct solution, cold, in six minutes."
      </p>
      <div class="features__grid">
        <div class="feature">
          <Repeat :size="20" class="feature__icon" />
          <h3>The re-typing protocol</h3>
          <p>Every accepted solution gets retyped from an emptied file at growing intervals: same day, +1, +3, +7, +21 days. No copy-paste, ever.</p>
        </div>
        <div class="feature">
          <Target :size="20" class="feature__icon" />
          <h3>The 90-second stall rule</h3>
          <p>Stuck mid-rep? Peek 20 seconds, then delete the whole method and restart from the signature. You never patch a broken motor sequence. You re-run the whole thing.</p>
        </div>
        <div class="feature">
          <GraduationCap :size="20" class="feature__icon" />
          <h3>Real graduation, not a checkbox</h3>
          <p>A problem leaves the queue for good only after three consecutive clean reps: no reference material, correct inside the target time.</p>
        </div>
        <div class="feature">
          <ListChecks :size="20" class="feature__icon" />
          <h3>Stuck-line tracking</h3>
          <p>Log exactly which line you stalled on, every rep. After ten problems, the same two or three lines keep showing up. That's your real curriculum.</p>
        </div>
        <div class="feature">
          <Brain :size="20" class="feature__icon" />
          <h3>Cold reproduction rate</h3>
          <p>The one dashboard number that matters: clean reps ÷ reps attempted. Not "problems solved." Whether it's actually sticking.</p>
        </div>
        <div class="feature">
          <ShieldCheck :size="20" class="feature__icon" />
          <h3>No login, nothing to sign up for</h3>
          <p>Everything lives in your browser. No account, no server, no tracking. Export/import JSON is your only backup.</p>
        </div>
      </div>
    </section>

    <!-- ---------- final cta ---------- -->
    <section class="closer">
      <h2 class="closer__title">24 patterns. ~149 problems. One motor to train.</h2>
      <p class="closer__sub">You already passed the quiz. The only thing left untrained is your hands.</p>
      <RouterLink to="/app" class="closer__cta">
        Go ahead <ArrowRight :size="18" />
      </RouterLink>
      <p class="closer__note">No login. No account. Nothing to set up first.</p>
    </section>
  </div>
</template>

<style scoped>
/* `:data-theme` is bound to `store.theme` on `.home` in the template
   below, same mechanism as App.vue's `.shell` — the moment the store's
   value flips, tokens.css's `[data-theme="light"]` block overrides every
   color variable underneath this element, dark or light, no separate
   stylesheet needed. */
.home {
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  overflow-x: hidden;
}

.home__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-8);
  max-width: 1100px;
  margin: 0 auto;
}
.home__brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
}
.home__bar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.home__theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--hit-target);
  height: var(--hit-target);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard);
}
.home__theme-toggle:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}
.home__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: var(--gradient-accent);
  color: #fff;
}
.home__skip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 600;
}
.home__skip:hover {
  color: var(--color-text);
}

/* ---------- hero ---------- */
.hero {
  max-width: 780px;
  margin: 0 auto;
  padding: var(--space-16) var(--space-8) var(--space-12);
  text-align: center;
}
.hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-5);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  border: var(--border-width) solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-accent-hover);
  font-size: var(--text-xs);
  font-weight: 600;
}
.hero__title {
  margin: 0 0 var(--space-5);
  font-size: clamp(2.25rem, 5vw, 3.5rem);
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.hero__title-accent {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero__sub {
  margin: 0 auto var(--space-8);
  max-width: 620px;
  font-size: var(--text-lg);
  line-height: var(--leading-normal);
  color: var(--color-text-muted);
}
.hero__cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--hit-target);
  padding: 0 var(--space-6);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-accent-text);
  font: inherit;
  font-size: var(--text-base);
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: background-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}
.hero__cta:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

/* ---------- quiz ---------- */
.quiz {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-12) var(--space-8);
  scroll-margin-top: var(--space-8);
}
.quiz__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
  text-align: center;
}
.quiz__sub {
  margin: 0 0 var(--space-8);
  text-align: center;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}
.quiz__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.q-card {
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
}
.q-card__prompt {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin: 0 0 var(--space-4);
  font-size: var(--text-base);
  font-weight: 600;
}
.q-card__num {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--color-surface-raised);
  color: var(--color-text-faint);
  font-size: var(--text-xs);
  font-weight: 700;
}
.q-card__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.q-opt {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--hit-target);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: var(--border-width) solid var(--color-border);
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-standard), opacity var(--duration-fast) var(--ease-standard);
}
.q-opt:not(:disabled):hover {
  border-color: var(--color-border-strong);
}
.q-opt:disabled {
  cursor: default;
}
.q-opt--correct {
  border-color: var(--color-easy);
  background: var(--color-easy-bg);
  color: var(--color-easy);
}
.q-opt--wrong {
  border-color: var(--color-hard);
  background: var(--color-hard-bg);
  color: var(--color-hard);
}
.q-opt--faded {
  opacity: 0.45;
}
.q-card__explain {
  margin: var(--space-4) 0 0;
  padding-top: var(--space-4);
  border-top: var(--border-width) solid var(--color-border);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--color-text-muted);
}

/* ---------- verdict ---------- */
.reveal-enter-active {
  transition: opacity var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard);
}
.reveal-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.verdict {
  margin-top: var(--space-8);
  padding: var(--space-8);
  border-radius: var(--radius-lg);
  background: var(--gradient-accent);
  color: #fff;
  box-shadow: var(--shadow-lg);
}
.verdict__score {
  margin: 0 0 var(--space-4);
  font-size: var(--text-2xl);
  font-weight: 800;
}
.verdict__score span {
  font-size: var(--text-sm);
  font-weight: 500;
  opacity: 0.85;
}
.verdict__headline {
  margin: 0 0 var(--space-4);
  font-size: var(--text-xl);
}
.verdict__body {
  margin: 0 0 var(--space-4);
  line-height: var(--leading-normal);
  opacity: 0.92;
}
.verdict__body--strong {
  font-weight: 600;
  opacity: 1;
}
.verdict__inline-icon {
  vertical-align: -3px;
  margin: 0 2px;
}
.verdict__cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  min-height: var(--hit-target);
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 700;
  transition: transform var(--duration-fast) var(--ease-standard);
}
.verdict__cta:hover {
  transform: translateY(-1px);
}

/* ---------- features ---------- */
.features {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-16) var(--space-8);
  text-align: center;
}
.features__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-2xl);
}
.features__sub {
  margin: 0 auto var(--space-10);
  max-width: 620px;
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
}
.features__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
  text-align: left;
}
.feature {
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
}
.feature__icon {
  color: var(--color-accent-hover);
  margin-bottom: var(--space-3);
}
.feature h3 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-base);
}
.feature p {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--color-text-muted);
}

/* ---------- closer ---------- */
.closer {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-16) var(--space-8) var(--space-20);
  text-align: center;
}
.closer__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-2xl);
}
.closer__sub {
  margin: 0 0 var(--space-8);
  color: var(--color-text-muted);
}
.closer__cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--hit-target);
  padding: 0 var(--space-8);
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-accent-text);
  text-decoration: none;
  font-size: var(--text-lg);
  font-weight: 700;
  box-shadow: var(--shadow-md);
  transition: background-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}
.closer__cta:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}
.closer__note {
  margin: var(--space-4) 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

@media (max-width: 768px) {
  .features__grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 560px) {
  .home__bar {
    padding: var(--space-4);
  }
  .hero {
    padding: var(--space-10) var(--space-4) var(--space-8);
  }
  .quiz,
  .features,
  .closer {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }
  .features__grid {
    grid-template-columns: 1fr;
  }
  .verdict {
    padding: var(--space-5);
  }
  .q-card__options {
    flex-direction: column;
    align-items: stretch;
  }
}

/* Narrowest phones (≤360px): "GrindWell" + theme toggle + "Enter app →"
   all on one row gets tight, so the skip link drops to icon-only. It
   keeps its `aria-label` from the template either way. */
@media (max-width: 360px) {
  .home__skip-label {
    display: none;
  }
}
</style>
