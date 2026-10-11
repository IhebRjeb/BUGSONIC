# Event format (v0)

Every sound a bug makes emits one JSON event. Events are displayed in the footer and optionally sent via WebSocket to external tools (Strudel, TouchDesigner, Hydra).

## Example

```json
{"wall":"W-003","bug":1,"type":"note","freq":261.6,"brightness":0.42,"edge":0.11,"x":240,"y":318}
```

## Fields

| Field | Type | Description |
|---|---|---|
| `wall` | string | ID of the current wall (e.g. `W-001`) |
| `bug` | number | Bug index (0-7) |
| `type` | string | `note` (edge trigger) or `crack` (dark pixel, noise click) |
| `freq` | number | Frequency in Hz. 0 for crack events |
| `brightness` | number | Luminance under the bug, 0-1 |
| `edge` | number | Gradient strength under the bug |
| `x` | number | X position on the 480x640 wall |
| `y` | number | Y position on the 480x640 wall |

## WebSocket

Connect via the **WS out** button. Default URL: `ws://localhost:9980`. Only works when the app runs locally (browser security blocks WebSocket from hosted pages).

Events are sent as JSON strings, one per sound.

## Planned additions

- `t` — timestamp (seconds since audio start)
- `hue` — colour hue under the bug (0-360)
- `velocity` — bug movement speed
- `tuning` message type — emitted on wall change, contains EDO, scale, root, tempo
