// Unlike content.generated.ts, this file is HAND-AUTHORED, not produced
// by scripts/parse-content.mjs - text copied verbatim from
// content-source/dsa-csharp-implementation-fluency.md, Sections 1, 2, 3,
// 5, and the Appendix (Section 4 already has a real parser: see
// content.generated.ts's LADDER export, whose rungs are a single
// uniform "**Minute N - Title.** body" line each).
//
// These sections aren't uniform the same way: numbered steps mix plain
// prose, embedded ```csharp fences, and bare ``` pseudocode blocks, with
// prose sometimes continuing AFTER a fence within the same step. Writing
// a general parser for five differently-shaped sections to save
// transcribing ~40 short strings once, for content that changes about as
// often as this app's name, isn't a good trade - the risk of a subtly
// wrong regex silently mangling reference text is worse than the risk of
// a hand-typed value differing from its source, which a future diff
// against the source doc would catch immediately. Every string below is
// copied exactly, including the source's own inconsistencies (the cheat
// sheet's intro says "eleven lines" over what is actually 13 rows in the
// source table - left as-is, not "corrected", because inventing a fix
// for someone else's copy is exactly the transcription risk this file
// exists to avoid) - with ONE deliberate exception: every em dash (—) from
// the source has been replaced with a plain hyphen, on request, so this
// file is verbatim modulo that one punctuation substitution, not
// byte-for-byte identical to the source doc.

import type { RepScheduleRow, Checklist, WeeklyScheduleRow, CheatSheetRow } from './types'

export const retypingProtocol = {
  intro: 'This is the part that actually fixes your bottleneck. The list above is just the raw material.',
  setup:
    'Alongside the `scratch` project from Section 0, create `dsa/solutions/` where every accepted solution is saved as `0001_TwoSum.cs`, and `dsa/reps.csv` with columns `problem,rep_number,date,clean_pass,seconds,stuck_line`.',
  repSchedule: [
    { rep: 'Rep 0', when: 'The moment you get AC', notesAllowed: '-', doneWhen: 'Solution saved to `solutions/`' },
    {
      rep: 'Rep 1',
      when: 'Immediately after, same sitting',
      notesAllowed: 'Yes - glance freely',
      doneWhen: 'Empty `Solution` class, retype from scratch, `dotnet watch` green',
    },
    { rep: 'Rep 2', when: '+24 hours', notesAllowed: 'No', doneWhen: 'Empty class, no reference, your test cases pass' },
    { rep: 'Rep 3', when: '+3 days', notesAllowed: 'No', doneWhen: 'Same' },
    { rep: 'Rep 4', when: '+7 days', notesAllowed: 'No', doneWhen: 'Same' },
    { rep: 'Rep 5', when: '+21 days', notesAllowed: 'No', doneWhen: 'Same' },
  ] satisfies RepScheduleRow[],
  graduates:
    'A problem **graduates** when it has three consecutive `clean_pass = yes` entries, where clean means: no reference material opened, correct on the first or second run, under the target time in the table. Graduated problems leave the queue permanently. Ungraduated problems stay in it, and a failed rep resets the interval to +1 day.',
  hardRules: [
    '**Rule 1 - never copy-paste, never scroll up.** Every rep is typed into an emptied `Solution` class. If your old `.cs` file is open in another tab, you are not doing a rep. Close it.',
    "**Rule 2 - the 90-second stall rule.** If you're stuck mid-rep for 90 seconds, do this exactly: open your saved solution, look at it for **20 seconds only** (set a timer), close it, then **delete the entire method body and start the rep again from the signature.** Do not patch the missing line into what you already have. Your failure is a motor sequence; patching in the middle rehearses the broken sequence, restarting rehearses the whole thing. Log which line you stalled on in `reps.csv` - after ten problems you'll see the same three lines over and over, and those are your actual curriculum.",
    '**Rule 3 - the template drill.** Every pattern\'s template is itself a rep target. Retype it from memory before you do any problem in that pattern. Ten patterns × 15 lines is a warm-up, not a study session.',
  ],
  csharpAddition:
    '**A C#-specific addition - the compiler is not a rep.** Getting a red squiggle and fixing it does not count as recalling the code. If you needed IntelliSense to complete `TryGetValue` or to remember whether it\'s `.Count` or `.Length`, mark that rep `clean_pass = no` even if it eventually compiled. **Turn IntelliSense\'s auto-complete-on-type off for reps** (VS Code: set `"editor.quickSuggestions": false` in a workspace settings file inside `scratch/`). You can leave it on for new problems. This one change is worth more than ten extra problems, because IntelliSense is currently doing the exact recall work you\'re trying to move into your hands.',
  masterCopies:
    "**Master copies.** The `[MASTER COPY]` problem in each pattern has a stricter bar: type it from an empty class, correctly, in under 6 minutes, cold, with no run-and-fix cycle and no autocomplete. Test this at the end of each pattern before moving on. If you can't, do three more reps of it before starting the next pattern. **Do not proceed on schedule - proceed on the master copy.**",
}

export const blankPageRitual: Checklist = {
  intro:
    'The rule: **you are never allowed to think while the file is empty.** Thinking happens on paper. The editor only receives things you have already decided. Here is the exact keystroke sequence for the first 90 seconds of every problem.',
  steps: [
    {
      id: 'bpr-1',
      label: 'Step 1 (10s)',
      body: "Paste the method signature from LeetCode into your `Solution` class. You now have one line.",
    },
    {
      id: 'bpr-2',
      label: 'Step 2 (15s)',
      body: 'Immediately write a `return` of the correct *type* - `return 0;`, `return new int[0];`, `return false;`, `return "";`, `return null;`. Save. It compiles and runs and gives a wrong answer. **You now have a running program**, which is psychologically a completely different object from an empty file. In C# this step also gets the compiler off your back, which matters more than it does in Python. Not optional, not a joke: it is the single highest-leverage habit on this page.',
    },
    {
      id: 'bpr-3',
      label: 'Step 3 (15s)',
      body: 'Write two comment lines directly under the signature:',
      code: '// IN:  int[] nums, int target\n// OUT: int[] of two indices',
      codeLang: 'csharp',
      afterCode: 'Copy the shapes straight off the problem page. No thinking required.',
    },
    {
      id: 'bpr-4',
      label: 'Step 4 (20s)',
      body: 'Declare your state variables *with their meaning as a comment*, above where the loop will go:',
      code: 'var seen = new Dictionary<int, int>();   // KEY = value, VALUE = index where we saw it\nint best = 0;                            // longest valid window length found so far',
      codeLang: 'csharp',
      afterCode:
        "If you cannot fill in a comment, you don't have a solution yet - go to the Pseudocode Bridge. But you still have four lines of code in the file.",
    },
    {
      id: 'bpr-5',
      label: 'Step 5 (15s)',
      body: 'Write the loop header with an empty body:',
      code: 'for (int i = 0; i < nums.Length; i++)\n{\n}',
      codeLang: 'csharp',
      afterCode: 'Save. Still wrong, still runs.',
    },
    {
      id: 'bpr-6',
      label: 'Step 6 (15s)',
      body: 'Fill the body with **English comments only**, one per intended line:',
      code: 'for (int i = 0; i < nums.Length; i++)\n{\n    // compute the complement\n    // if complement is in seen -> return the pair\n    // store nums[i] -> i\n}',
      codeLang: 'csharp',
    },
    {
      id: 'bpr-7',
      label: 'Step 7 (the rest)',
      body: 'Replace exactly one comment with one line of code, then save and look at the output. Repeat. Never write two lines without running.',
    },
    {
      id: 'bpr-8',
      label: 'Step 8 (last)',
      body: 'Only now handle empty input, single element, and `n == 0`. Edge cases go last, always, because handling them first is a favourite way to avoid starting.',
    },
  ],
  closingNote:
    'If at Step 4 you genuinely have no idea what the state variables are, **that is not a coding failure and you must not sit there.** Go straight to the bridge.',
}

export const pseudocodeBridge: Checklist = {
  intro:
    'The jump from "use a hashmap to store seen values" to working code fails because that English sentence is missing about four decisions. This procedure forces you to make them, on paper, one at a time. **Do this on paper, not in the editor.** Six steps, in order, no skipping.',
  steps: [
    {
      id: 'pb-1',
      label: 'Step 1 - One sentence',
      body: 'Write the approach in one English sentence. *"Walk the array and remember every value I\'ve seen so I can check for the complement."*',
    },
    {
      id: 'pb-2',
      label: 'Step 2 - Nouns to variables',
      body: "Underline every noun in that sentence. Each underlined noun becomes a declared variable with a **name, a C# type, and a KEY/VALUE meaning if it's a collection**:",
      code: 'the array             -> int[] nums                        (given)\nevery value I\'ve seen -> Dictionary<int,int> seen           KEY = value, VALUE = index\nthe complement        -> int need                           (computed inside the loop)',
      codeLang: 'plain',
      afterCode:
        "**Rule: if a noun cannot be turned into a named, typed variable, your sentence is too vague - rewrite Step 1 more specifically and try again.** The type column is doing real work here that it wouldn't in Python: choosing between `List<T>`, `int[]`, `Dictionary<,>`, `HashSet<T>` and `Stack<T>` *is* half of the solution, and doing it on paper means you're not making that decision while also trying to write a loop.",
    },
    {
      id: 'pb-3',
      label: 'Step 3 - Verbs to numbered steps',
      body: 'Rewrite the approach as numbered steps, each **under 10 words**, each **naming at least one variable from Step 2**:',
      code: '1. seen = empty dictionary\n2. loop i from 0 to nums.Length - 1\n3. need = target - nums[i]\n4. if seen has need, return [seen[need], i]\n5. seen[nums[i]] = i',
      codeLang: 'plain',
      afterCode: "Steps that don't name a variable are still English, not pseudocode. Split them.",
    },
    {
      id: 'pb-4',
      label: 'Step 4 - Placement tag',
      body: "Next to each step write **B**, **L**, or **A**: does it happen **B**efore the loop, inside the **L**oop, or **A**fter the loop?",
      code: '1. B     2. (the loop itself)     3. L     4. L     5. L',
      codeLang: 'plain',
      afterCode:
        'This is the step that actually produces your braces and indentation. Most of your "I know the idea but can\'t write it" moments are really "I don\'t know which of these lines is inside the loop."',
    },
    {
      id: 'pb-5',
      label: 'Step 5 - Transcribe, one line per step, saving after each',
      body: 'Now go to the editor. Each numbered step becomes exactly one line of C#. You are no longer solving; you are transcribing, which is a different and much easier motor task.',
    },
    {
      id: 'pb-6',
      label: 'Step 6 - Read-back check',
      body: 'Read your finished code out loud as English, line by line, against your Step 3 list. Any line in the code that isn\'t in the list, or any list item missing from the code, is a bug you found for free.',
    },
  ],
  closingNote:
    '**When you are stuck at Step 1** - you have no sentence at all - write the **brute force** sentence instead (*"for every pair, check if they sum to target"*) and run the bridge on that. Get the O(n²) solution accepted. Then, and only then, ask what\'s wasteful. You will produce far more working code this way, and working code is the thing you need reps on.',
}

export const weeklySchedule = {
  split:
    'Roughly **60% re-typing, 40% new material** - deliberately biased against your instinct, which will be to chase new problems.',
  mondaySaturday: [
    {
      time: '0:00 – 0:10',
      block: 'Template drill',
      detail: 'Retype 2 pattern templates from memory into a scratch file. Rotate through all 24 over ~2 weeks. Autocomplete off.',
    },
    { time: '0:10 – 0:25', block: 'Master copy', detail: 'One `[MASTER COPY]` problem, cold, from an empty class, timed.' },
    {
      time: '0:25 – 1:10',
      block: 'Rep queue',
      detail: 'Work the due reps from `reps.csv`, oldest first. Typically 4–6 problems. Log every one.',
    },
    {
      time: '1:10 – 1:50',
      block: 'New problems',
      detail: '2 Easy, or 1 Medium. Use the blank-page ritual. Hard stop at 1:50 regardless of state.',
    },
    {
      time: '1:50 – 2:00',
      block: 'Log & schedule',
      detail: "Save solutions, do Rep 1 of anything new if time permits, write tomorrow's rep queue.",
    },
  ] satisfies WeeklyScheduleRow[],
  mondaySaturdayNote:
    '**Note the shape of the day: reps come before new problems.** If you run out of time, the thing that gets cut is new material, never the queue. This is the opposite of how everyone does it and it is the correct order for your specific bottleneck.',
  sunday: [
    { time: '0:00 – 0:20', block: 'Retype every template from the patterns you touched this week' },
    { time: '0:20 – 1:20', block: 'Rep queue: clear all overdue reps and all previously failed reps' },
    {
      time: '1:20 – 1:50',
      block: '**Cold audit** - pick 3 random graduated problems and retype them. Any that fail go back into the queue at +1 day.',
    },
    {
      time: '1:50 – 2:00',
      block: "Review the `stuck_line` column in `reps.csv`. Whatever line appears most becomes next week's template drill focus.",
    },
  ] satisfies WeeklyScheduleRow[],
  pacing:
    'At roughly 7–8 new problems a week you will finish all 149 in about 20 weeks. **Do not speed this up.** If you find yourself ahead of schedule, the correct response is to add reps, not problems. Finish each pattern\'s `[MASTER COPY]` test before starting the next pattern, even if that costs you a week.',
  metric: '**Cold reproduction rate** = (reps passed with no reference, no autocomplete, first try) ÷ (reps attempted)',
  metricFollowup:
    "Week 1 this will be somewhere around 20–30%. Once it's consistently above 80%, your bottleneck has moved and you should re-read this plan, because at that point the constraint will be idea generation and the list you need is a completely different one.",
}

export const cheatSheet = {
  intro: 'Keep this open for the first three weeks, then stop using it. These are the eleven lines you will retype most often.',
  rows: [
    { operation: 'Frequency count', line: '`d[k] = d.GetValueOrDefault(k, 0) + 1;`' },
    { operation: 'Lookup + fetch', line: '`if (d.TryGetValue(k, out int v)) { ... }`' },
    { operation: 'Letter bucket', line: "`var freq = new int[26]; freq[c - 'a']++;`" },
    { operation: 'Fill an array', line: '`var res = new int[n]; Array.Fill(res, -1);`' },
    { operation: 'Sort with comparator', line: '`Array.Sort(a, (x, y) => x[0].CompareTo(y[0]));`' },
    { operation: 'Safe midpoint', line: '`int mid = lo + (hi - lo) / 2;`' },
    { operation: 'Swap', line: '`(a[i], a[j]) = (a[j], a[i]);`' },
    { operation: 'Copy a path', line: '`res.Add(new List<int>(path));`' },
    { operation: 'Pop a list', line: '`path.RemoveAt(path.Count - 1);`' },
    { operation: '2-D DP table', line: '`var dp = new int[m + 1, n + 1];` → `dp[i, j]`' },
    { operation: 'Jagged rows', line: '`var g = new int[m][]; for (...) g[r] = new int[n];`' },
    { operation: 'Min-heap', line: '`var pq = new PriorityQueue<int, int>(); pq.Enqueue(el, pri);`' },
    { operation: 'Build a string', line: '`var sb = new StringBuilder(); sb.Append(c); sb.ToString();`' },
    { operation: 'Last element', line: '`list[^1]`' },
  ] satisfies CheatSheetRow[],
  rankedTraps: [
    '`new List<int>[n]` / `new int[m][]` give you **nulls**, not empty containers. Allocate in a loop.',
    "Reading `dict[missingKey]` **throws**; writing to it doesn't. So `dict[k]++` throws on first use.",
    '`res.Add(path)` stores a **reference**. Always `new List<int>(path)`.',
    '`(lo + hi) / 2` **overflows**. Always `lo + (hi - lo) / 2`.',
    "`.Length` (arrays, strings) vs `.Count` (everything else). Decide the container first.",
  ],
}
