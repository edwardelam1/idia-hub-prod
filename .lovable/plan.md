

# Floating Buddy Behavior + Best Friend AI Prompt Fix

## Changes

### 1. `src/components/ai/FloatingBestFriend.tsx` — Resting position, auto-hide, fluid motion

- **Remove random autonomous movement**: Delete the `findSafePosition` helper and the `setInterval` that randomly repositions the buddy every 8-15 seconds
- **Fixed resting position**: Default position to bottom-left corner (`x: 20, y: window.innerHeight - 120`)
- **Auto-hide after 5s inactivity**: Add a `isVisible` state and an `activityTimeoutRef`. On any user interaction (mouse move, click, key press), show the buddy and reset a 5-second timer. When the timer fires, fade the buddy out (`opacity-0 pointer-events-none` with a smooth transition)
- **Fluid motion**: Replace `transition-all duration-300` with `transition-all duration-700 ease-in-out` for smoother positional changes. Remove `animate-pulse` on movement
- **Dynamic feedback timeout**: In `handleVoiceInput`, replace the hardcoded `3000ms` timeout with `Math.max(5000, response.length * 60)`. Apply similar dynamic timeouts to contextual page reactions

### 2. `supabase/functions/best-friend-ai/index.ts` — Strict data policy prompt

- **Add STRICT DATA POLICY block** to the `analysisPrompt` between the persona and the request, enforcing:
  - Default mode: only personal operational data, system health, dashboard metrics
  - Marketplace restriction: if no `marketplaceResults` provided, refuse and instruct user to toggle Marketplace Search or use `@search marketplace`
- **Update instruction #6**: When no marketplace results, enforce the strict personal data policy instead of leaving it blank

## Technical Details

**Auto-hide logic** (FloatingBestFriend):
```
activityTimeoutRef tracks a 5s window.
Global listeners: mousemove, click, keydown → setIsVisible(true), reset timer.
Timer fires → setIsVisible(false).
Wrapper div gets: opacity-0/opacity-100 + pointer-events-none transition.
```

**Resting position**: After drag release, buddy smoothly returns to bottom-left (`{x: 20, y: window.innerHeight - 120}`). No more random wandering.

## Result
- Buddy rests in bottom-left, fades out after 5s of no activity, reappears on interaction
- Smooth fluid transitions instead of jumpy random placement
- AI responses stay visible long enough to read
- Edge function enforces strict data boundaries to prevent hallucinated responses

