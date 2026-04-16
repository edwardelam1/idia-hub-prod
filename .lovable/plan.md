

# Upgrade Provenance Bridge UI in BestFriendPage

## What changes

Replace the existing assistant metadata block (lines 175–197) with the upgraded "Provenance Bridge" UI that has:
- A styled pill button with purple background tint and rounded-full border for the liability token hash deep link
- A `SHIELD_VERIFIED` badge with Shield icon instead of `SHIELD_ACTIVE` with CheckCircle
- `animate-in fade-in slide-in-from-top-1` entrance animation

## Single file change

**`src/pages/BestFriendPage.tsx`** — Replace lines 175–197:

```tsx
{msg.role === "assistant" && msg.liabilityTokenHash && (
  <div className="flex items-center gap-2 flex-wrap mt-2 animate-in fade-in slide-in-from-top-1">
    <Button
      variant="ghost"
      size="sm"
      className="h-6 text-[10px] gap-1.5 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-mono border border-purple-100 bg-purple-50/30 rounded-full"
      onClick={() => navigate(`/egress-logs?search=${msg.liabilityTokenHash}`)}
    >
      <FileKey size={12} className="text-purple-500" />
      {truncateHash(msg.liabilityTokenHash)}
    </Button>
    <Badge variant="outline" className="h-5 text-[9px] border-emerald-200 text-emerald-700 bg-emerald-50 font-black tracking-tighter">
      <Shield size={10} className="mr-1" /> SHIELD_VERIFIED
    </Badge>
  </div>
)}
```

The `handleSendMessage` function already correctly passes `liabilityTokenHash` into the conversation state (line 122), so no logic changes needed — the block will render whenever the synapse-controller returns a hash in Marketplace Mode.

