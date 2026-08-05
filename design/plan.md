# SHORT STAFFED — Phase 0 demo plan (browser co-op)

Parent GDD: `../../DESIGN.md` (the full research & build plan). This file is the
build contract for the Higgsfield-engine demo only.

## Profile
- **Time** real-time · **Space** continuous 3D, one diner room · **Agency** one cook per player
- **Conflict** vs system (tickets, rent, fire) · **Content** authored room + emergent physics
- **Outcome** win/lose per shift (rent paid at close) · **Players** 1–4 online co-op, drop-in,
  extras spectate · **Session** one shift ≈ 8 min · **Engagement** social + execution
- **Delivery** desktop + mobile browsers + gamepad; keyboard on physical key codes; strings external.

## Experience formula
The player feels the giddy panic of a slammed small-town Friday shift because the game
constantly hands the crew one more ticket, one more hazard, and one more absurd customer
than four people can politely handle.

## Verbs (3, strong)
- **MOVE** (WASD / left stick / touch stick)
- **INTERACT** `E` / pad A / touch button — context-sensitive: crate→take, station→place/flip/take,
  shelf→take plate, tap→pour, table→serve/bus, squatter→grab-drag, extinguisher→equip, door sign→start shift,
  sink→return dirty plates
- **THROW/SHOVE** `Space` / pad X / touch button — held item becomes projectile (plates break,
  squatter flies); empty-handed near Zillow Couple = gentle shove.

## The shift
Lobby (diner closed, invite chalkboard) → any player flips the door sign → 8-minute shift on a
spawn curve → close → end card: P&L vs **RENT**, Yowl reviews, MADE RENT / ASSET REPOSITIONED.
Demand and rent scale with crew size (design law: headcount scaling; solo = quiet Tuesday).

## Demo cut (Phase 0 row of the GDD)
3 dishes (flapjacks — flip mid-cook; bison burger; cutthroat trout — burns fast) + coffee/matcha taps.
4 archetypes: **The Flock** (trio, matcha, multiplies if served fast), **Zoom Squatter** (blocks a
4-top, drag & yeet him out — costs a Yowl star), **Zillow Couple** (order nothing, obstruct,
appraise; when they leave the landlord raises the rent target), **Rancher Dale** (coffee black,
calm aura: patience decays 25% slower while he's content; refill him). One grease-fire system
(overcook → smoke → ignition → spreads; wall extinguisher). Dirty-plate economy (finite clean
plates, bus them to the sink).

## Multiplayer architecture (tier 2 — custom realtime server)
- `server.js` = Cloudflare Durable Object; **rooms = shards** (`…/ws/<ROOMCODE>`), 20 Hz sim tick
  while occupied, snapshot broadcast at 10 Hz, one-shot events (`ev`) for SFX/toasts.
- The entire game logic lives in `assets/js/sim.js` (pure ES module, seeded LCG, zero DOM) and is
  **inlined verbatim into server.js at package time** (`tools/build-server.mjs`) — client and server
  run byte-identical rules; the client also runs it directly in `?local=1` offline/practice mode.
- Client predicts only its own cook's movement (reconciled vs authority), interpolates everything
  else (120 ms buffer). Inputs are sent as command objects with edge counters so lost packets can't
  eat a button press; a `setInterval` pump keeps sending when the tab is hidden (rAF suspends).
- Server validates everything: movement clamped, interact range checked server-side, ≤40 msgs/s,
  ≤2 KB per message, unknown types dropped, one entity per `playerId` (sessionStorage), 60 s
  reconnect grace, seats capped at 4 (later joiners spectate).
- No hidden information exists — every snapshot is world-public by design, so the netcode
  secrecy gate is satisfied structurally.

## Wire protocol (JSON, short keys, documented here)
- C→S `{t:'hi',pid,name,color}` · `{t:'in',s,x,z,a,th,fx,fz}` (a/th = edge counters) ·
  `{t:'again'}` · `{t:'ping',n}`
- S→C `{t:'hello',you,room,snap}` · `{t:'s',snap}` · `{t:'ev',k,…}` · `{t:'pong',n}` · `{t:'err',m}`
- Snapshot: `{ph,t,rent:{e,tg},pl:[…],cu:[…],it:[…],st:{…},fi:[…],tk:[…],msg}` — full state each
  broadcast (≈4–8 KB), no deltas in v1.

## Recorded decisions
1. **three.js r160 vendored** at `assets/vendor/three.module.js` (pinned copy, no CDN) — the one
   third-party library; fits the size bound.
2. **All art procedural** (code-built low-poly per the style formula; characters are
   procedurally-animated primitive rigs — the sanctioned no-rig branch of the 3D reference).
   Driven by budget reality: workspace holds 7.3 credits, so the generated-asset pass is deferred.
   Generated rows in the manifest: **thumbnail + favicon only** (deploy requirements).
3. **All audio procedural WebAudio synth** (sizzle/bell/cha-ching/whoosh/thud/chime/murmur +
   Karplus-Strong banjo) — same budget decision, and adaptive loops (murmur scales with crowd,
   sizzle with cook state) suit synthesis anyway.
4. **DOM overlay for HUD/lobby/endcard** on top of the three.js canvas; big touch targets.
5. Proximity **voice chat is out of demo scope** (friends use Discord); it's a Unity-phase
   feature. The demo tests the comedy loop, not audio transport.

## STYLE FORMULA (locked 2026-08-04; byte-identical into every asset prompt, incl. the two generated images; drives all procedural palettes & lighting)
Chunky janky low-poly 3D, flat-shaded facets with visible hard edges and a handmade toy-diorama
charm. Boxy rounded silhouettes; stubby capsule people with oversized heads and tiny arms.
Environment in warm diner cream, worn wood brown and faded teal trim; player cooks in saturated
apron red, blue, yellow and green that pop against the room; hazards and interactables marked hot
orange-red with ticket-white highlights. Cozy golden-hour mountain light, soft warm ambient,
playful small-town mood. High contrast, clean readable silhouettes, consistent three-quarter view
readability.

**STYLE TOKEN:** janky low-poly flat-shaded 3D, warm diner cream + wood + faded teal, saturated apron accents, cozy golden-hour light

## Reference route (smoke test, must run end to end)
Join → flip sign → take plate → crate batter → griddle → flip → plate flapjacks → serve Flock
table → cha-ching → let trout burn → ignite → extinguish → drag squatter out the door → throw →
shift clock runs out → end card shows earned vs rent and at least one Yowl review → play again
returns to lobby.
