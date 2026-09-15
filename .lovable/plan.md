# Move the new franchise key into a blocking popup

## What changes

Today, after pressing "Generate New Key", the new key appears as a highlighted panel inline above the key label field and stays there until dismissed.

Instead:

1. The operator types a key label and presses "Generate New Key".
2. A modal opens showing the newly issued key, the label it was saved under (read-only text, not an editable field), a copy button, and a Dismiss button.
3. The modal cannot be closed by accident — no outside-click or Escape close; only the Dismiss button closes it.
4. After dismissing, the panel shows only the label field, the "Generate New Key" button, and the key history list. The inline "new key" frame is removed entirely.

## Technical details

In `src/components/marketplace/utilities/UtilitiesIngestionPanel.tsx`:

- Delete the inline `{apiKey && (...)}` block (the bordered primary/5 panel in section 1).
- Keep `apiKey` state as the modal's open condition; capture the submitted label into a new `issuedKeyName` state at generation time (since `keyName` is cleared on success).
- Render a shadcn `Dialog` with `open={!!apiKey}`, `onOpenChange` ignored except via the Dismiss button, `onInteractOutside` / `onEscapeKeyDown` prevented, and the default close "X" hidden so Dismiss is the only exit.
- Modal contents: title "Franchise Key Issued", the label as plain read-only text, the key in the existing monospace/truncate row with the icon-only copy button reusing `copyToClipboard`, and a warning that the key will not be shown again.
- Dismiss sets `apiKey` to null; key history refresh behaviour is unchanged.

No changes to the edge function, key contracts, or logging brackets beyond the existing calls.
