# midi-seq Team Charter

## 1. Why we exist

**midi-seq** is a MIDI sequencer for creative musicians. It lets you compose with both deliberate, set melodies and algorithmic, generative melodies, and build expressive drum and rhythm patterns.

Our mission is to make a sequencer that feels like an instrument: immediate, playful, and deep enough to grow with the person using it.

## 2. Who we are

We are a group of creative musicians building tools for other musicians. We bring different strengths—composition, sound design, software, hardware, interface design, and testing—but we share a love of rhythm, melody, and play.

We treat every teammate as both a contributor and a user. If it is not fun or useful for us, it will not be fun or useful for anyone else.

## 3. Roles & responsibilities

We organize work by product responsibilities. One person typically owns each role for triage and day-to-day decisions, but everyone can contribute anywhere.

| Role | What it owns |
|------|--------------|
| **Melody Craft** | Set melodies: step sequencing, piano-roll-style editing, note recording, quantization, transposition, scales and chords. The keeper of the deliberate-composition workflow. |
| **Generative Systems** | Generative melodies: probability, randomization, mutation, arpeggiation, algorithmic variation, seeds and snapshots. The keeper of happy accidents and controlled surprise. |
| **Rhythm & Drums** | Drum and rhythm patterns: grid-based drum sequencing, polyrhythms, swing, accent and groove, pattern banks. The keeper of the beat. |
| **Timing & Engine** | Playback engine: timing, MIDI output, clock and sync, transport, latency, loop behavior. The keeper of the groove under the hood. |
| **Interface & Feel** | Interaction, layout, presets, save/load, file formats, and the overall feel of using the sequencer. The keeper of "this feels like an instrument." |
| **Platform & Release** | Builds, packaging, documentation, examples, tests, and release quality. The keeper of shipping. |
| **Musical Direction** | Sound defaults, creative presets, demo material, and the final call on creative disagreements. The keeper of taste. |

Responsibilities are fluid. A role is not a silo: if something touches Rhythm & Drums and Timing & Engine, the two owners talk and decide together.

## 4. How we work together

### Communication
- **Async first.** Most discussion happens in writing so people across time zones and schedules can catch up.
- **Daily check-ins are optional.** Use them when there is momentum to share; skip them when there is nothing new.
- **Important decisions get written down.** If a choice affects architecture, file format, user workflow, or release behavior, summarize it in the project notes or in this repo.

### Collaboration rhythm
- **Weekly jam session:** show what you built or discovered, demo features, and listen together.
- **Monthly planning:** agree on the next slice of work, who owns what, and what "done" looks like.
- **Quarterly retrospective:** what felt good, what slowed us down, what to change in the charter or process.

### Code & design
- **Work in small slices.** Prefer many small changes over long-lived branches.
- **Review before merge.** All code, patches, and design changes get a second pair of eyes. Reviews are kind, direct, and about the work, not the person.
- **Make it playable early.** A rough feature that can be tried with a keyboard is better than a polished feature stuck in design.
- **Document the intent.** Complex generative logic, timing behavior, or file formats need comments or a short design note.

### Definition of done
A feature is done when:
1. It works in the current build.
2. It has been reviewed by at least one other person.
3. Basic usage is documented or demoed at a jam session.
4. It does not break existing saved patterns or presets without a migration plan.

## 5. How we decide

1. **Most decisions are made by the owner closest to the work.** Trust each other’s taste and expertise.
2. **If two reasonable options are close, build the simpler one first.** We can always add complexity later.
3. **Disagreements that affect the whole project get discussed as a team.** The project lead has the final say if consensus is not reachable in a reasonable time.
4. **Disagreements about creative defaults** (default sounds, quantization feel, swing amount, generative behavior) are resolved by listening and playing, not by authority. The version that feels better in a jam wins.

## 6. Standards we hold

- **Musical honesty.** Features should make real music easier, not just look impressive on paper.
- **Respect the groove.** Timing, latency, and feel are not afterthoughts; they are core features.
- **Open to accident.** Generative systems should surprise us in good ways. We keep the randomness that inspires and remove the randomness that frustrates.
- **Backwards compatibility matters.** Musicians rely on their projects. We avoid breaking old patterns unless there is a clear path forward.
- **Accessibility.** The sequencer should be usable by people with different bodies, setups, and levels of technical comfort.

## 7. Conflict and safety

- **Assume good intent.** We are all here because we love making music.
- **Name the problem, not the person.** "This timing code is hard to follow" is better than "you made this confusing."
- **If something feels off, say it early.** Small tensions handled early become trust; ignored tensions become walls.
- **Harassment, discrimination, or sustained disrespect have no place here.** If you experience or witness it, raise it privately with the project lead or any teammate you trust.

## 8. Evolving this charter

This charter is a living document. If it stops matching how we actually work, propose a change in any planning or retrospective. Changes are adopted by team consensus unless they affect decision-making authority, in which case the project lead decides.

---

*Last updated: 2026-08-07*  
*If you are new to the team, read this once, then break something on purpose. It is a sequencer—pressing buttons is the whole point.*
