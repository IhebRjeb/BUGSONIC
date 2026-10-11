# BUGSONIC

Living environments · Autonomous agents · Generative sound · Audiovisual performance

BUGSONIC is an experimental audiovisual project that turns the world into a living, playable instrument through autonomous digital creatures called bugs.

It explores what happens when small agents interact with their environment, read its visual and physical characteristics, and translate those interactions into sound. Rather than using visuals to simply react to music, BUGSONIC creates a two-way relationship: the environment influences the sound, and the sound transforms the environment in return.

## 1. The core idea

Imagine a wall covered with cracks, faded paint, old posters, stains and traces of human activity.

Inside BUGSONIC, small digital creatures crawl across that surface. Each bug observes and samples its surroundings, interpreting characteristics such as brightness, texture, edges, colour and position. These observations become musical events: notes, rhythms, noise, timbral changes and spatial movement.

The bugs are not just visual decorations. They are autonomous performers, translating their encounters with the environment into sound.

The resulting sound then feeds back into the visual system, deforming or reshaping the surface and influencing what the bugs encounter next. The environment becomes dynamic, and the performance emerges from this continuous exchange.

### The BUGSONIC feedback loop

```
Environment (walls, textures, light, weather, data)
       |
       v
Autonomous bugs (move, observe, sample, interact)
       |
       v
Sound and visual transformation (musical events, environmental feedback)
       |
       +---> The transformed environment becomes new input for the bugs
```

## 2. The first artwork: THE WALL

The first expression of BUGSONIC is THE WALL, a collective archive of urban traces.

Walls are treated not as static backgrounds or artworks, but as surfaces that hold memory: layers of paint, torn posters, cracks, stickers, graffiti, shadows and marks left by things that have disappeared.

The project begins with photographs collected by the artist, with the possibility of expanding the archive through community contributions. Each wall becomes a unique instrument with its own visual characteristics and sonic behaviour.

During a live performance, the artist selects and changes walls, lets the bugs explore them, and intervenes through live coding. The performance moves between autonomous behaviour and human decisions.

The wall is the starting point, not the limit of the project.

## 3. Where BUGSONIC could go

The long-term ambition is to develop BUGSONIC into a modular, extensible audiovisual instrument that can interact with many different environments, not just images of walls.

**01 — Surfaces and traces** (the starting point)
Photographs, textures, architecture, graffiti and everyday traces become playable visual scores.

**02 — Light and time** (the environment becomes dynamic)
Solar position, daylight, time of day and changing shadows could influence the bugs' behaviour, the sound's harmonic structure or the visual composition.

**03 — Weather and environmental data** (the outside world enters the system)
Rain, temperature, wind and other live data could affect movement, density, rhythm, texture or sonic intensity.

**04 — Sensors, spaces and collective input** (an evolving performance ecosystem)
Cameras, microphones, proximity sensors, field recordings and community-submitted material could introduce new inputs, allowing the system to respond to places, people and live situations.

These are potential extensions, not features that already exist. The key is that every new input should contribute meaningfully to the behaviour of the system, rather than simply being mapped to an arbitrary musical parameter.

## 4. The artistic direction

BUGSONIC sits between generative art, experimental electronic music, live coding, digital ecology and interactive installation.

Its central questions are:

- What if an environment could be played rather than merely observed?
- What if sound emerged from the behaviour of autonomous digital organisms?
- What happens when the relationship between image and sound becomes reciprocal?
- Can software reveal unexpected patterns in ordinary surfaces and environmental data?
- How much of a performance can emerge from a system, and how much should remain under the artist's control?

The bugs create a productive tension between control and emergence. The artist designs the rules, defines relationships, selects the inputs and intervenes live, but does not necessarily dictate every outcome.

## 5. The technical vision

The project should be designed as a system that can grow without being rebuilt every time a new input or tool is introduced.

```
Input layer:      Images · Environmental APIs · Sensors · Audio · Community archive
                         |
Behaviour engine: Bug movement · Sampling · State · Rules · Event generation
                         |
Output layer:     Strudel · Web Audio · TouchDesigner · Hydra · OSC · MIDI · WebSocket
                         |
Feedback layer:   Sound and performance events modify the environment,
                  feeding new information back into the system
```

The important architectural decision is to separate the core system from its input sources and output tools. For example, a bug could emit a structured event containing its identity, position and sampled features. Different adapters could then send that event to Strudel, TouchDesigner or another compatible system without changing the bug's underlying logic.

This keeps BUGSONIC open to experimentation and makes it possible to develop the browser prototype into a more powerful live-performance tool or installation.

## 6. What to build first

The most useful first milestone is not to build the entire future ecosystem. It is to make one complete feedback loop work convincingly.

1. Build the first playable wall. Load a photograph, analyse its visual features and let several bugs move across it.
2. Give the bugs a sonic identity. Convert their interactions into notes, rhythms, noise and timbral changes, with mappings that feel musically intentional.
3. Make the relationship reciprocal. Let sound alter the wall's appearance or behaviour, so the next interactions are affected by previous events.
4. Add live performance controls. Switch between walls, add or remove bugs, change rules and live-code with Strudel.
5. Prepare a short demonstration. Develop a coherent 10-15-minute performance and document the system in a short audiovisual clip.
6. Extend the system gradually. Add external event output, more environmental inputs, new bug behaviours and eventually community contributions.

## 7. Project identity

**BUGSONIC** — Small creatures. Living surfaces. Unstable sounds.

| | |
|---|---|
| **Project / System** | BUGSONIC — the evolving instrument, software system and artistic framework |
| **First Artwork** | THE WALL — the first collection of visual scores and the first performance built with the system |

This distinction lets the first artwork have its own identity while BUGSONIC continues to evolve. Future pieces could explore sunlight, weather, architectural spaces, recordings or other forms of environmental input without losing the project's core identity.

## Short project description

**BUGSONIC** is an experimental audiovisual project exploring the relationship between autonomous digital organisms and their environment. Through small agents called bugs, visual surfaces and environmental signals become playable sources for generative sound and live performance.

The bugs move, observe and sample their surroundings, translating their interactions into musical events. Sound, in turn, transforms the environment, creating a continuous feedback loop in which image, movement and music influence one another.

Beginning with **THE WALL**, a collective archive of urban traces, BUGSONIC aims to grow into a modular audiovisual instrument capable of interacting with surfaces, light, weather, sensors, field recordings and live data. Combining generative systems, live coding and experimental sound, the project investigates how ordinary environments can become instruments, and how performances can emerge from the interaction between designed rules, autonomous behaviour and human intervention.

In one sentence: BUGSONIC is a living audiovisual instrument where digital bugs explore the world, turn what they encounter into sound, and transform the world through the music they create.
