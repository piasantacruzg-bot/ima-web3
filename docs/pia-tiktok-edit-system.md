# Pia · TikTok Retention Edit System

A reusable operating system for building TikToks with zero dead air. One job:
make the thumb **stop**, and never let it leave.

- **Format:** TikTok · 9:16
- **Goal:** Entertain
- **Audience:** 24–27
- **Toolchain:** CapCut Desktop only

> Interactive version (styled): published as a Claude artifact — pull it up while editing.

---

## The four pacing laws

| Interval | Law |
|----------|-----|
| **every 2–4s** | Something changes — cut, zoom, b-roll, text, motion, sound. |
| **every 8–12s** | Pattern interrupt. Break the rhythm on purpose. |
| **every 20s** | A reward — payoff, reveal, laugh, "oh". |
| **every 30s** | Something unexpected re-opens the loop. |

The clock is the boss. The words fill the zones — we cut against the beat, not against the talking.

---

## 01 · The retention timeline

```
0s      5s              20s                    40s   45s
|=======|===============|======================|=====|
  HOOK     BUILD +          ESCALATE +           PAYOFF
           interrupts       reward @20s          → LOOP
              ^tick ^tick       ^unexpected @30s
```

- **Hook (0–5s):** immediate; no intro.
- **Build (5–20s):** alternate close-up / wide / b-roll / graphics / text; interrupt every 8–12s.
- **Escalate (20–40s):** land the reward at ~20s, keep raising stakes, unexpected beat at ~30s.
- **Payoff → loop (40–45s):** strong payoff, re-open one loop, seamless loop back, curiosity CTA.

---

## 02 · The hook engine (0–5s)

No intro. No "hey guys". The first frame is already the middle of the story.

- **Pattern A — The Contradiction:** *"Everyone tells you to do X. It's why you're stuck."*
  Cold open mid-sentence. Frame 1 = punch-in on Pia already talking. Bold caption slams in on the first word. Whoosh out to b-roll by 2s.
- **Pattern B — The Open Loop:** *"I lost $___ before I figured this out. Watch what changed."*
  State the stakes, promise the reveal, withhold it. Reward lands ~20s. Flash a 3-frame preview of the ending.
- **Pattern C — The Unexpected Visual:** a motion/object that shouldn't be there, *then* the line.
  Lead with b-roll, not the face. 0.5s striking image → hard cut to Pia. Curiosity before comprehension.

---

## 03 · The CapCut move library

Settings you can execute frame-for-frame in CapCut Desktop. Variety of *move*, consistency of *craft*.

### Reward Punch-In — on every key line
- **Feature:** Scale keyframes on the clip (no plugin)
- **Keyframes:** 100% → 118% scale, 2 keyframes
- **Duration:** 6–8 frames (~0.25s)
- **Ease:** Ease Out (fast in, settle)
- **Extra:** Motion Blur on the move; snap on the word that matters
- *Underline meaning, don't decorate. One punch per idea.*

### Speed-Ramp Whip — transition between beats
- **Feature:** Speed → Curve → custom
- **Curve:** 1x → 4x → 1x across the cut point
- **Duration:** ramp over 10–14 frames
- **Motion:** Motion Blur ON, directional
- **Ease:** hold the fast section, ease back to 1x
- *Land the return-to-1x exactly on a bass hit — that sync is the whole trick.*

### Invisible Whoosh Cut — any hard scene change
- **Feature:** Straight cut, covered by motion & sound
- **Blur:** 2–3 frames Motion Blur either side
- **Sound:** Whoosh peaks **on** the cut frame
- **Duration:** transition reads as 0 frames
- **Rule:** no canned dissolve/glitch presets
- *The best transition is one nobody notices — momentum carries the eye across the seam.*

### Caption System — full runtime
- **Feature:** Auto Captions → style once, apply all
- **Style:** Heavy sans, 1–3 words on screen max
- **Motion:** Pop-in scale 85% → 100%, 3 frames
- **Accent:** Key word in coral — one per line
- **Position:** Safe zone, clear of TikTok UI
- *Captions ARE the pacing for muted viewers — time every word swap to a cut or beat.*

### B-roll Overlay — when talk runs > 6s
- **Feature:** Overlay track + Blend / Mask
- **Entry:** Opacity 0 → 100% in 4 frames, or wipe via mask
- **Motion:** Slow push-in keyframe 100% → 105% — b-roll is never static
- **Audio:** Audio Ducking on so VO stays on top
- **Grade:** Match with LUT + Color Wheels so cuts feel one-world
- *If it takes >6s to say, show it.*

### Freeze-Frame Emphasis — the punchline
- **Feature:** Freeze Frame + Auto Cutout subject
- **Hold:** 10–16 frames
- **Treat:** Cutout pops onto a text/graphic backplate behind
- **Sound:** Bass hit + record-scratch or riser stop
- **Ease:** Snap in (0 ease), release soft
- *The freeze is a reward marker — save it for the line you want quoted.*

---

## 04 · Show, don't tell (b-roll map)

When a word triggers an image, cut to the image. Build a reusable b-roll bin.

| The line says… | Show |
|----------------|------|
| "…and it made real money" | Cash counter / card tap / rising chart (money · transactions · analytics) |
| "…so I mapped it out" | Notebook, whiteboard, typing macro (planning · office · creative work) |
| "…the tech does the work now" | Touch-screen UI, servers, AI motion (technology · future UI · coding) |
| "…and the life it buys you" | Drone city, walking POV, coffee shop (lifestyle · travel · architecture) |

---

## 05 · The sound stack

Audio drives pacing — layer it, don't sprinkle it. Silence only when it's earned.

| Layer | Job |
|-------|-----|
| **Music bed** | Beat-detected; cuts land on downbeats; ~–18 dB under VO |
| **Room tone** | Subtle ambience under everything (office / coffee-shop / city) |
| **Transitions** | Whoosh · reverse-whoosh · swipe — peak on the cut frame |
| **Impacts** | Bass hit · boom on freezes & reveals — one per reward |
| **Detail / SFX** | Clicks · pops · sparkle · keyboard — texture on graphics |
| **Risers** | Build tension into the 20s reward & the payoff; cut off sharp |

---

## 06 · The ending that loops

Weak endings kill the replay.

1. **Deliver the payoff** — the thing promised in the hook; freeze + bass hit on the money line.
2. **Re-open one loop** — *"But that's not even the part that changed everything…"*
3. **Seamless loop back** — match the last frame's energy & audio to frame 1.
4. **Curiosity CTA** — not "like & follow"; a question/tease: *"Comment the word if you want part 2."*

---

## 07 · The blueprint slot — 0804.mp4

The system above is format-agnostic. The moment the transcript lands, pour it into these slots
and it becomes a finished, cut-by-cut plan.

- **Source:** `0804.mp4` · 472 MB · _awaiting transcript_
- **Hook (0–5s):** pick Pattern A / B / C · slam caption · whoosh to b-roll by 2s
- **Beat map:** interrupt @ 8–12s · reward @ 20s · unexpected @ 30s · payoff @ end
- **B-roll cues:** tag each >6s explanation with a show-don't-tell image
- **Sound spot:** music beat-map · transition SFX on every cut · impacts on rewards
- **Deliverables:** CapCut timeline order · caption style · thumbnail frame · title + hook text

---

*v1 — make it impossible to stop watching.*
