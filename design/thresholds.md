# SHORT STAFFED demo — frozen numbers (set before code; tune one at a time)

## Performance budgets (weakest platform: mid mobile browser)
- 60 fps desktop / ≥30 fps phone on the worst scene (4 cooks, 12 customers, 30 loose items, fire ×6)
- DPR cap **1.5**; shadows OFF (blob discs only); draw calls < **300**; particles pooled, cap **400**
- snapshot ≤ **10 KB**; broadcast **10 Hz**; server tick **20 Hz** (50 ms); client fixed step 60 Hz
- zero allocations in the render loop's hot path (reused vectors/arrays)

## World
- Room 24×14 units; kitchen strip z ≤ −3.0 (counter pass at z −2.6); dining z ≥ −1.8; door at x 10.4, z 7 wall
- Cook radius .38, speed **4.2 u/s** (×.86 carrying squatter); customer radius .36, walk 1.7 u/s
- Interact range **1.6**, facing cone 120°; throw **8.5 u/s** at 35°; gravity −20; plate breaks at impact > **6.5**
- Tables: 6 four-tops + 3 counter stools (27 nominal seats)

## Shift & economy
- Shift **480 s**; close linger 8 s
- Rent target: solo **$520** (softened 2026-08-05 from 650 — quiet Tuesday must be winnable by one honest cook; scripted bot ceiling was $277–341), 2p **$1000**, 3p **$1350**, 4p **$1700** (+$25 per Zillow appraisal)
- Payouts: flapjacks $45 · burger $55 · trout $70 · coffee $15 · matcha $20; tip = 50% × patience remaining
- Patience 75 s from order; drain ×0.75 while Dale content; ×3 while fire visible; Squatter Yowl −1★ at close
- Spawn curve (parties/min by minute, ×[0.65 solo | 1.0 2p | 1.3 3p | 1.6 4p]):
  min 0–1: 1.5 · 1–3: 2.5 · 3–5: 3.5 · 5–7: 4.5 · 7–8: 5.5 (final rush); concurrent party cap 2+2×players
- Flock: trio, 3 matcha (+30% chance flapjacks each); served < **45 s** → +1 bonus Flock queued (cap 3/shift)
- Squatter at t 90 s and 300 s; occupies a 4-top; ejection = landing beyond the door plane
- Zillow at t 150 s, wander 8 s per fixture, leave after 120 s → rent +$25 + landlord text
- Dale at t 20 s; refill wanted every 90 s; unrefilled 45 s → pays $1.40, leaves, aura ends

## Cooking & fire
- Cook times: flapjack 10 s (flip window 4–6 s; unflipped = half value "sad flapjacks"), burger 12 s, trout 8 s
- ready→burning: 12 s (trout 7 s); burning→ignite 6 s; sizzle audio scales with cookT
- Fire spreads to an adjacent surface every **8 s**, cap **6** tiles; extinguisher douses a tile in **1.8 s**
  of spray; scorched station usable after 5 s; burnt item = trash (bin by the sink)
- Plates: **12** clean at open; dirty plate appears when a customer finishes (20 s eat); sink washes one per **5 s**

## Net hostile-input clamps
- move vector clamped to |1|; inputs ≤ **40 msg/s**; message ≤ **2 KB**; name ≤ 16 chars (sanitized)
- reconnect grace 60 s; seats 4; join order beyond 4 = spectator; duplicate pid = resume, never dupe
