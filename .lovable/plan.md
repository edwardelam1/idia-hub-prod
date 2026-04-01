

# Plan: Floating Best Friend Redirect + New Logo Replacement

## 1. Floating Best Friend -- Navigate Instead of Pop-up

**File: `src/components/ai/FloatingBestFriend.tsx`**
- Remove the `BestFriendChat` import and its `<BestFriendChat>` component from the render
- Remove `isChatOpen` state
- Change the `onChatClick` callback in `BestFriendAvatar` to call `navigate('/best-friend')` instead of opening the chat dialog
- This makes the floating avatar button navigate to the full Best Friend AI page (same destination as the sidebar link)

**File: `src/components/ai/BestFriendAvatar.tsx`**
- No changes needed -- `onChatClick` is already a prop, just the parent changes what it does

## 2. Replace Logo Across Three Locations

Copy the uploaded image into the public directory, then update all three logo references:

**Copy:** `user-uploads://The_Hub_Logo_Polished.png` to `public/images/hub-logo.png`

**File: `src/components/SplashScreen.tsx`** (line 25)
- Change `src="/lovable-uploads/02424e72-23a1-4487-b4a8-5e645a56e27a.png"` to `src="/images/hub-logo.png"`

**File: `src/components/LoginScreen.tsx`** (line 28)
- Change `src="/lovable-uploads/02424e72-23a1-4487-b4a8-5e645a56e27a.png"` to `src="/images/hub-logo.png"`

**File: `src/components/layout/AppSidebar.tsx`** (line 185)
- Change `src="/lovable-uploads/02424e72-23a1-4487-b4a8-5e645a56e27a.png"` to `src="/images/hub-logo.png"`

## Files Modified
- `src/components/ai/FloatingBestFriend.tsx` -- remove chat dialog, navigate to `/best-friend`
- `src/components/SplashScreen.tsx` -- new logo path
- `src/components/LoginScreen.tsx` -- new logo path
- `src/components/layout/AppSidebar.tsx` -- new logo path

## Files Copied
- `user-uploads://The_Hub_Logo_Polished.png` to `public/images/hub-logo.png`

