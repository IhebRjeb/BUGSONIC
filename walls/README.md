# Walls

Put wall photos here (JPG, PNG or WebP, ideally portrait, under 1 MB each). Name them `bizerte-001.jpg` and so on. The app loads every photo in this folder at start (W-001, W-002, …; keys 1–9 select them). Add an entry to [index.json](index.json) to set the order and the credit shown on the thumbnail; unlisted photos follow by file name. Restart `npm run dev` after adding a file.

Good walls have layers: torn posters, cracks, peeling paint, stickers, strong edges next to flat areas. Mix dense and sparse walls so the tunings differ.

## Comparison fixtures

The three 768x1024 JPEGs are credited in [index.json](index.json). Iheb Rjeb confirmed ownership of the photos and artwork and permission to include them in the public repository.

| File | Subject | Comparison role |
|---|---|---|
| [djerba-borj-ghazi-mustapha-eye.jpg](djerba-borj-ghazi-mustapha-eye.jpg) | *f.ragmen.t of memory*, projected on Borj Ghazi Mustapha during See Djerba | Relatively smooth, lower edge density |
| [tunis-lafayette-earth.jpg](tunis-lafayette-earth.jpg) | Marginal Earth, Lafayette, Tunis | Repeated details in the suit |
| [tunis-ibn-el-jazzar.jpg](tunis-ibn-el-jazzar.jpg) | Old wall on Ibn El Jazzar Street, Lafayette, Tunis | Fractured plaster and exposed stone |

These are mixed real scenes, not isolated smooth/repeated/fractured test patterns. Keep synthetic fixtures for exact assertions.

They load automatically, cover-cropped to 480x640 exactly like an upload (same pixels and seed in a given browser). **Bring your own** still adds other images for the session. For comparisons, keep the tab visible, disable Feedback, use four bugs and use **Record comparison take**; then `npm run match-takes -- <folder>`.

See [the plan](../docs/PLAN.md) for measured observations and outstanding listening acceptance. Identical output-slider settings do not establish matched loudness; the take tool matches RMS offline. No separate photo license is granted by this metadata.
