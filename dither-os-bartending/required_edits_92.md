# RE92 — Shell B back stack for join

## Files

| File | Edit |
|------|------|
| `MainMenu.tsx` | `onShellBack?: () => boolean`; `goBack` calls it first; true = consumed |
| `page.tsx` | Implement back: camera→comm, comm→close join; pass to MainMenu |
| Join overlays | Keep Escape/Abort calling same close/back as B |

## goBack

```
if (onShellBack?.()) return;
// existing screenStack pop if any
onEnterPlay(); // root only
```

## page onShellBack

```
if joinBusy: return true (ignore or no-op)
if camera: setStage comm; clear status; return true
if comm: close join; return true
return false
```
