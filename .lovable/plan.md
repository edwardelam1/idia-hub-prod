

## Plan: Wire `refreshCredits` trigger into BestFriendPage

### Context
`SynapseCreditsContext` already exports `refreshBalance` (the equivalent of the proposed `refreshCredits`) — no context refactor needed. The bug is simply that `BestFriendPage.tsx` doesn't call it after the AI response, so the gas gauge stays stale until next mount/realtime tick.

The realtime `postgres_changes` subscription in the context *should* fire on ledger INSERT, but if the deduction happens server-side after the chat response returns, there can be a perceived lag. An explicit refresh call closes the gap.

### Changes

**`src/pages/BestFriendPage.tsx`** (one file, 2 small edits):

1. Destructure `refreshBalance` from `useSynapseCredits()` (already imported, currently only pulling `balanceData`).
2. After `setConversation(...)` in `handleSendMessage`, call `await refreshBalance()` so the gauge re-reads the ledger immediately.

### Files Modified
- `src/pages/BestFriendPage.tsx`

### Outcome
Gas gauge updates the moment the AI response renders, no waiting on realtime debounce.

