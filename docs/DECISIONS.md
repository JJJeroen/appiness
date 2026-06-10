# Appiness — Design & Architecture Decisions

A running log of decisions made during development. Intended to be shared with collaborators for review and discussion.

---

## [2026-06-10] Rebuilt from scratch instead of modernizing original code

**Decision:** Discard the original React Native codebase and start fresh.

**Why:** The original was ~2019–2020 era React Native (class components, deprecated APIs, several bugs including a missing import in StorageService, GET requests used for mutations, inconsistent AsyncStorage key usage). The backend (Java Spring Boot on Heroku) was also dead — both `appiness-prd` and `appiness-staging` Heroku apps had been deleted after Heroku's 2022 free tier shutdown. Modernizing incrementally would have taken longer than a clean rewrite.

**What we kept:** The core concept, the EN/NL bilingual requirement, the mission+skip+history loop, the earned-skip mechanic, and the 40 missions (written from scratch to replace lost backend data).

---

## [2026-06-10] Expo over bare React Native CLI

**Decision:** Use Expo (managed workflow) as the development and build toolchain.

**Why:** The primary goals include publishing to Google Play and eventually testing/publishing on iOS without owning Apple hardware. Expo's EAS Build service handles cloud builds for both platforms without needing Android Studio or a Mac. Development loop is also faster — `npx expo start` + Expo Go on a physical device, no SDK setup required.

**Trade-off:** Expo managed workflow has some native module restrictions. If we need a native module not supported by Expo, we'd eject to bare workflow. Not expected to be an issue for this app's scope.

---

## [2026-06-10] Local JSON missions, AsyncStorage for state (Phase 1)

**Decision:** Bundle all 40 missions as `src/data/missions.json`. Track queue position, completed history, and skip balance in AsyncStorage.

**Why:** Backend is dead and rebuilding it adds infrastructure overhead before the app is even validated. Bundled missions work offline, have zero running cost, and get the app functional immediately.

**Migration path:** `MissionService.ts` abstracts all data access behind `getNextMission()`, `completeMission()`, `skipMission()`, and `getHistory()`. When migrating to Supabase, only this file changes — screens are unaffected. Supabase will use a separate account from other projects.

---

## [2026-06-10] Earned skip mechanic

**Decision:** Completing a mission earns 1 skip, banked up to a maximum of 2. Skipping moves the current mission to the end of the queue (not discarded).

**Why:** Keeps the gamification of the original without the messy dual-button UI. Skips feel earned rather than free, which preserves the intent of nudging users to try missions before skipping. Max 2 prevents hoarding.

**UI:** Single "Skip" button (left, smaller) + "Done" button (right, dominant). Skip is visually disabled when 0 skips banked. Available skip count shown as a small badge in the header.

---

## [2026-06-10] Gradient visual theme with category + difficulty encoding

**Decision:** Each mission is assigned a gradient based on its `category` and `difficulty`. No background photos.

**Categories (colour family):**
| Category | Meaning | Colour family |
|---|---|---|
| `others` | Kindness to strangers or people you encounter | Terracotta / red-brown |
| `relationships` | Friends, family, close people | Amber / warm gold |
| `community` | Environment, local businesses, shared spaces | Teal / sage green |
| `self` | Mindfulness, personal growth, self-care | Mauve / purple |

**Difficulty (lightness):**
| Difficulty | Meaning | Tone |
|---|---|---|
| `easy` | Quick, low-friction | Lighter, warmer |
| `medium` | Requires intention or planning | Mid-tone |
| `hard` | Emotionally heavy or significant commitment | Deeper, more saturated |

**Why no photos:** Photo assets add bundle weight, feel generic, and require licensing. Gradients are lightweight, feel intentional, and give each mission a unique but consistent visual identity. The same mission always shows the same gradient — building subtle recognition over time.

---

## [2026-06-10] Expo Router for navigation

**Decision:** Use Expo Router (file-based) over manually configured React Navigation.

**Why:** Less boilerplate, integrates with EAS and deep linking out of the box, and is the direction Expo is standardising on. Three screens (onboarding, mission, history) don't need complex navigation patterns.

---

## [2026-06-10] App identifiers set early

**Decision:** Set `bundleIdentifier` and `package` to `com.appiness.app` in `app.json` before any EAS build is attempted.

**Why:** These identifiers cannot be changed after an app is submitted to either store without creating a new store listing. They must be set before the first EAS build, not after. Using `com.appiness.app` as a placeholder — should be revisited if a publisher domain is established.

---

## [2026-06-10] Bug fixes from pre-share code review

Six issues found and fixed before sharing with collaborator. Logged here for traceability.

**1. Double-tap race on Done button**
Added a `submitting` state flag that is set synchronously on first press and cleared only after `load()` completes. Button is disabled and visually dimmed while submitting. Previously, two rapid taps could call `completeMission()` twice, producing duplicate history entries and over-incrementing the skip counter.

**2. Dutch skip badge grammatically wrong**
`"sla over"` is a verb (imperative), not a noun. "2 sla over" read as an instruction, not a count. Replaced with `"1 skip" / "2 skips"` for both locales — "skip" is standard in Dutch app UI and unambiguous.

**3. Hardcoded `gradients[4]` in history screen**
The history screen used `gradients[4]` — a positional index into a flattened gradient array. Any reordering of the gradient map would silently change the history screen colour with no error. Replaced with `getGradient('community', 'medium')` which is explicit and refactor-safe.

**4. Double import of `Mission` type in history.tsx**
`Mission` was imported twice from the same module on separate lines. Consolidated into a single import.

**5. `bundleIdentifier` / `package` missing from app.json**
See decision above.

**6. Typo in DECISIONS.md**
"buildng" → "building" in the gradient section.

---

## [2026-06-10] Daily reset, streak, and optional push notifications

**Decision:** One mission per calendar day. Completing locks the app until tomorrow. Skipping replaces today's mission in-place. Consecutive-day completions build a streak. Daily push notification at 9 AM (opt-in, requested at onboarding).

**Daily mechanics:**
- `getTodaysMission()` returns `null` if already completed today → screen shows "done for today" + streak
- First open of a new day assigns the next mission from the shuffled queue
- Skip: moves current mission to end of queue, assigns the next one as today's mission — same day, different mission. Does not defer to tomorrow or skip the day.
- Streak increments on first completion of each calendar day. Missing a day resets to 1. Streak only shown when > 0 on the mission screen; shown prominently on the "done for today" screen when > 1.

**Why one-per-day:**
- Without a daily limit, users can complete all 40 missions in one session and the app has nothing left to offer. Daily pacing creates a return habit.
- The "done for today" screen is the moment of positive reinforcement — it acknowledges the streak and gives a clear reason to come back tomorrow.

**Why skip replaces rather than defers:**
- Deferring ("come back tomorrow with the same mission") punishes users who can't do a specific mission due to circumstance (shift work, social anxiety, wrong context). That's a bad experience.
- Replacing ("give me a different one today") preserves the daily rhythm while respecting that some missions don't fit every life every day.
- Skip tokens are still earned and limited — the friction is low enough to be fair, high enough to discourage lazy use.

**Notifications:**
- Opt-in only. Requested at the end of onboarding when the user taps the CTA — system permission prompt appears. Navigation to mission screen happens regardless of whether permission is granted.
- Scheduled daily at 9 AM using Expo's `DAILY` trigger (persisted on device, survives app restarts).
- Rescheduled from scratch on each permission grant to avoid duplicates.
- Default time of 9 AM is an assumption. A settings screen to change this is deferred.

---

## [2026-06-10] Known issues not yet fixed (logged for awareness)

These were identified in the same review but deferred:

- **AsyncStorage writes are not atomic** — `completeMission()` makes 3 sequential writes. A crash between them leaves state inconsistent. Acceptable for Phase 1; revisit when migrating to Supabase.
- **No try/catch around `JSON.parse`** — a corrupted AsyncStorage value crashes the app with no recovery. Should add error boundaries before production release.
- **`missions[0]` used as silent fallback** — if a mission ID in the stored queue no longer exists in the JSON, the app silently shows mission 1. Will become relevant if mission IDs ever change.
- **`useLocale` is not actually a hook** — it calls `getLocales()` synchronously and never re-renders. Works fine for a locale-at-install model but is misleadingly named. Should be renamed `getLocale()`.
- **No daily limit or re-engagement mechanism** — a user can complete all 40 missions in one session. No notification, no daily reset, no reason to return tomorrow. Active area of design work.
- **Difficulty encodes emotional effort, not accessibility** — "easy" missions that require leaving the house or having a social circle are not easy for shift workers, remote workers, or people with anxiety. This is a content design gap, not a code issue.

---

## [2026-06-10] Mission set merged to 73 — originals + unique homebrew

**Decision:** Replace the 40 handwritten missions with a merged set of 73 missions.

**Sources:**
- Original 52 missions from `import.sql` (53 original records minus #43 "Make love to someone" / "Vrij met iemand", cut for appropriateness in a general-audience app)
- 21 unique missions from the homebrew set that had no equivalent in the originals

**What was cut from homebrew:** ~19 missions that were functionally equivalent to originals (hold door, smile to stranger, give compliment, pick up litter, donate clothes, let someone go first, listen sincerely, do someone's task, call a friend, make someone laugh, keep phone stowed, etc.)

**What the originals add:** Highly specific, concrete acts that the homebrew set lacked — wash a neighbour's car, place gift at doorstep, pick up a fallen bike, windshield wiper note, print and hang a photo, dance with someone, visit/keep in touch with/help an elderly person, discuss life without someone you love. These are distinctive and memorable.

**What the homebrew adds:** Modern digital kindness (pay for coffee anonymously, write a positive review, send a photo that reminded you of someone) + emotionally harder acts (apologize to someone you've wronged, let go of a grudge, be first to break the ice, choose understanding over being right).

**Why cut #43:** Consent and context cannot be assumed. The mission is unsuitable for a general-audience well-being app.

**Category/difficulty tagging:** All originals were tagged during merge. Difficulty encodes emotional effort and social friction, not time commitment.

---

## [2026-06-10] TypeScript from the start

**Decision:** Full TypeScript, strict mode.

**Why:** The original codebase had several bugs that TypeScript would have caught at write time (missing imports, key mismatches, wrong types passed to functions). For a solo dev revisiting code after weeks away, the IDE support is worth the small overhead.
