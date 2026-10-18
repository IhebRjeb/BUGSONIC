# External protocol (v1)

BUGSONIC sends JSON messages over one WebSocket. The usual target is the local bridge (`npm run bridge`), which rebroadcasts every message to other WebSocket clients (TouchDesigner, Hydra, scripts) and translates it to OSC over UDP.

```
browser ──JSON──▶ ws://127.0.0.1:9980 (bridge) ──JSON──▶ other WS clients
                                            └──OSC───▶ udp://127.0.0.1:7000
```

Browser sound and external out are independent. With browser sound off and the link live, bugs keep emitting events, so an external tool can be the only sound source. An event is sent when its encounter is placed on the wall's pulse, not when it plays: the sound follows within about one beat (use `tempo` and `pulse` from the `wall` message to quantise on the receiving side). Encounters that find no free active step within one beat rest and send nothing, with or without browser sound.

Every message has `v` (protocol version, `1`), `kind` and `t` (seconds since page load).

## `event` — one encounter

```json
{"v":1,"kind":"event","t":43.9,"wall":"W-003","bug":1,"type":"note","freq":261.6,"midi":60,"brightness":0.42,"edge":0.11,"hue":212,"x":240,"y":318,"nx":0.5,"ny":0.497,"pan":0,"velocity":1.4}
```

| Field | Type | Description |
|---|---|---|
| `wall` | string | Current wall ID (`W-001`) |
| `bug` | int | Bug index, 0–7 |
| `type` | string | `note` (edge) or `crack` (thin line darker than both sides) |
| `freq` | number | Hz. `0` for cracks |
| `midi` | number \| null | Fractional MIDI note (microtonal walls are not 12-EDO). `null` for cracks |
| `brightness` | number | Luminance under the bug, 0–1 |
| `edge` | number | Gradient strength under the bug |
| `hue` | int | Colour hue under the bug, 0–360 |
| `x`, `y` | int | Pixel position on the 480×640 wall |
| `nx`, `ny` | number | Normalised position, 0–1 |
| `pan` | number | Stereo position, −1 (left) to 1 (right) |
| `velocity` | number | Bug speed in px per simulation step (1/60 s) |

## `wall` — tuning of the selected surface

Sent on connect and whenever the wall changes.

```json
{"v":1,"kind":"wall","t":12.1,"wall":"W-002","score":2,"seed":"80ee3347","edo":16,"root":128,"tempo":117,"scale":[0,1,2,6,7,8,9,10,11,14,15],"pulse":[0,0,0,1,0,1,1,1,1,1,1,1,0,0,0,0],"features":{"density":0.066,"brightness":0.46,"cracks":0.02,"hue":219,"orientation":"diagonal","contrast":0.21,"saturation":0.31,"texture":0.625,"coherence":0.12,"periodicity":0}}
```

Scale degrees are steps of `edo` divisions per octave above `root` Hz: `freq = root * 2^(degree / edo)`.

`pulse` has 16 steps (16th notes at `tempo`), read left to right across the image: `1` where that column holds at least average edge energy. Browser sounds land only on active steps. `features` values are 0–1 except `hue` (0–360) and `orientation`; new keys may be added within v1.

`score` is the analysis version (it changes when the same pixels would play differently). `seed` is a hash of the wall's pixels; it seeds the bugs when the wall is restarted, so the same image, seed and settings replay the same encounters while feedback is off.

## `state` — creature positions (optional, 10 Hz)

Enabled with **Stream creature positions**. Dropped (not queued) if the connection backs up.

```json
{"v":1,"kind":"state","t":12.2,"energy":0.31,"bugs":[{"id":0,"nx":0.41,"ny":0.62,"heading":4.12,"flash":0.35}]}
```

`heading` is in radians (0–2π). `flash` is 1 at the moment a bug sounds and decays toward 0.

## `hello`, `ping`, `bridge`

| Kind | From | Content |
|---|---|---|
| `hello` | browser | Sent on connect: `source`, `canvas {w, h}` |
| `ping` | browser | **Send test signal** button |
| `bridge` | bridge | Sent to all clients when someone connects or leaves: `clients` (count), `osc` (`host:port` or `off`) |

## OSC address map (bridge)

| Address | Arguments |
|---|---|
| `/bugsonic/note` | `i` bug, `f` freq, `f` midi, `f` brightness, `f` edge, `f` hue, `f` nx, `f` ny, `f` pan, `f` velocity |
| `/bugsonic/crack` | `i` bug, `f` brightness, `f` edge, `f` hue, `f` nx, `f` ny, `f` pan, `f` velocity |
| `/bugsonic/wall` | `s` wall, `i` edo, `f` root, `f` tempo, `i` scale size |
| `/bugsonic/scale` | `i` degree × n |
| `/bugsonic/energy` | `f` energy (with each `state`) |
| `/bugsonic/bug` | `i` id, `f` nx, `f` ny, `f` heading, `f` flash (one per bug, per `state`) |
| `/bugsonic/ping` | `f` t |
| `/bugsonic/hello` | `s` source |

## Bridge security

- Binds to `127.0.0.1` only by default.
- Accepts browser connections only from `localhost` / `127.0.0.1` pages, plus origins passed with `--allow-origin`. Native clients (no `Origin` header) are accepted.
- Messages larger than 16 KB, binary frames, and anything that is not valid protocol v1 are dropped, not forwarded.
