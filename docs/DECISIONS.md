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

**Why no photos:** Photo assets add bundle weight, feel generic, and require licensing. Gradients are lightweight, feel intentional, and give each mission a unique but consistent visual identity. The same mission always shows the same gradient — buildng subtle recognition over time.

---

## [2026-06-10] Expo Router for navigation

**Decision:** Use Expo Router (file-based) over manually configured React Navigation.

**Why:** Less boilerplate, integrates with EAS and deep linking out of the box, and is the direction Expo is standardising on. Three screens (onboarding, mission, history) don't need complex navigation patterns.

---

## [2026-06-10] TypeScript from the start

**Decision:** Full TypeScript, strict mode.

**Why:** The original codebase had several bugs that TypeScript would have caught at write time (missing imports, key mismatches, wrong types passed to functions). For a solo dev revisiting code after weeks away, the IDE support is worth the small overhead.
