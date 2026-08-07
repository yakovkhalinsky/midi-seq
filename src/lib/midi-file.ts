import type { Project, Pattern, Track, MelodicTrack, RhythmicTrack, MelodicStep } from './types'
import { createDefaultPattern, createMelodicSteps, createEmptySteps } from './types'

const PPQN = 480
const STEPS_PER_BEAT = 4
const TICKS_PER_STEP = PPQN / STEPS_PER_BEAT

interface MidiEvent {
  delta: number
  type: 'noteOn' | 'noteOff' | 'other'
  channel?: number
  pitch?: number
  velocity?: number
  data?: number[]
}

function writeVarLen(value: number): number[] {
  const bytes: number[] = []
  value >>>= 0
  bytes.push(value & 0x7f)
  while ((value >>>= 7) > 0) {
    bytes.unshift((value & 0x7f) | 0x80)
  }
  return bytes
}

function stringToBytes(str: string): number[] {
  return Array.from(str).map((c) => c.charCodeAt(0) & 0xff)
}

function int16ToBytes(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff]
}

function int32ToBytes(value: number): number[] {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

function microSecondsPerQuarterNote(bpm: number): number {
  return Math.round(60_000_000 / bpm)
}

export function exportPatternToMidi(pattern: Pattern, bpm: number): Uint8Array {
  const events: MidiEvent[] = []

  // Add tempo meta event at tick 0
  events.push({
    delta: 0,
    type: 'other',
    data: [0xff, 0x51, 0x03, ...int32ToBytes(microSecondsPerQuarterNote(bpm)).slice(1)],
  })

  // Collect note events per step across tracks
  const stepCount = pattern.tracks[0]?.steps.length ?? 0
  for (let step = 0; step < stepCount; step++) {
    for (const track of pattern.tracks) {
      const rawStep = track.steps[step]
      if (!rawStep?.on) continue

      const melodicStep = rawStep as MelodicStep
      const pitch = 'pitch' in melodicStep ? melodicStep.pitch : defaultDrumPitch(track.name)
      const velocity = Math.max(1, Math.min(127, Math.round(melodicStep.velocity * track.volume)))
      const length = 'length' in melodicStep ? Math.max(1, melodicStep.length) : 1

      events.push({
        delta: step === 0 ? 0 : TICKS_PER_STEP,
        type: 'noteOn',
        channel: track.midiChannel,
        pitch,
        velocity,
      })

      events.push({
        delta: length * TICKS_PER_STEP,
        type: 'noteOff',
        channel: track.midiChannel,
        pitch,
        velocity: 0,
      })
    }
  }

  // End of track
  events.push({ delta: 0, type: 'other', data: [0xff, 0x2f, 0x00] })

  return buildMidiFile(events)
}

export function exportProjectToMidi(project: Project): Uint8Array {
  // Export the song arrangement if present, otherwise the selected pattern.
  if (project.playMode === 'song' && project.song.length > 0) {
    const events: MidiEvent[] = []
    events.push({
      delta: 0,
      type: 'other',
      data: [0xff, 0x51, 0x03, ...int32ToBytes(microSecondsPerQuarterNote(project.bpm)).slice(1)],
    })

    let lastTick = 0
    for (const slot of project.song) {
      const pattern = project.patterns.find((p) => p.id === slot.patternId)
      if (!pattern) continue
      const patternTicks = pattern.tracks[0]?.steps.length ?? 0
      const patternStepCount = patternTicks

      for (let repeat = 0; repeat < slot.repeats; repeat++) {
        for (let step = 0; step < patternStepCount; step++) {
          for (const track of pattern.tracks) {
            const rawStep = track.steps[step]
            if (!rawStep?.on) continue

            const melodicStep = rawStep as MelodicStep
            const pitch = 'pitch' in melodicStep ? melodicStep.pitch : defaultDrumPitch(track.name)
            const velocity = Math.max(1, Math.min(127, Math.round(melodicStep.velocity * track.volume)))
            const length = 'length' in melodicStep ? Math.max(1, melodicStep.length) : 1

            events.push({
              delta: lastTick === 0 ? 0 : TICKS_PER_STEP,
              type: 'noteOn',
              channel: track.midiChannel,
              pitch,
              velocity,
            })
            lastTick += TICKS_PER_STEP

            events.push({
              delta: length * TICKS_PER_STEP,
              type: 'noteOff',
              channel: track.midiChannel,
              pitch,
              velocity: 0,
            })
            lastTick += length * TICKS_PER_STEP
          }
        }
      }
    }

    events.push({ delta: 0, type: 'other', data: [0xff, 0x2f, 0x00] })
    return buildMidiFile(events)
  }

  return exportPatternToMidi(getSelectedPattern(project), project.bpm)
}

function buildMidiFile(events: MidiEvent[]): Uint8Array {
  const trackData: number[] = []
  let runningStatus: number | null = null

  for (let i = 0; i < events.length; i++) {
    const ev = events[i]
    trackData.push(...writeVarLen(ev.delta))

    if (ev.type === 'other') {
      trackData.push(...(ev.data ?? []))
      runningStatus = null
    } else {
      const status = (ev.type === 'noteOn' ? 0x90 : 0x80) + ((ev.channel ?? 1) - 1)
      if (runningStatus !== status) {
        trackData.push(status)
        runningStatus = status
      }
      trackData.push(ev.pitch ?? 0, ev.velocity ?? 0)
    }
  }

  const header = [...stringToBytes('MThd'), ...int32ToBytes(6), ...int16ToBytes(0), ...int16ToBytes(1), ...int16ToBytes(PPQN)]
  const trackChunk = [...stringToBytes('MTrk'), ...int32ToBytes(trackData.length), ...trackData]

  return new Uint8Array([...header, ...trackChunk])
}

export function importMidiToProject(
  file: Uint8Array,
  project: Project
): { project: Project; patternId: string } | null {
  const events = parseMidiFile(file)
  if (!events) return null

  const patternId = project.selectedPatternId
  const pattern = project.patterns.find((p) => p.id === patternId) ?? project.patterns[0]
  if (!pattern) return null

  const stepsPerPattern = project.stepsPerPattern

  // Build new track step arrays from parsed note events
  const newTracks: Track[] = pattern.tracks.map((t) => ({
    ...t,
    steps:
      t.type === 'melodic'
        ? createMelodicSteps(stepsPerPattern, (t as MelodicTrack).scaleRoot)
        : createEmptySteps(stepsPerPattern),
  }))

  // Map drum pitches to rhythmic track ids
  const drumMap = new Map<number, string>()
  for (const t of newTracks) {
    if (t.type === 'rhythmic') {
      drumMap.set(defaultDrumPitch(t.name), t.id)
    }
  }

  for (const ev of events) {
    if (ev.type !== 'noteOn' || !ev.pitch || ev.velocity === 0) continue

    const step = Math.round(ev.tick / TICKS_PER_STEP)
    if (step < 0 || step >= stepsPerPattern) continue

    const channel = ev.channel ?? 1

    // First try to match by the track's configured MIDI channel
    const trackByChannel = newTracks.find((t) => t.midiChannel === channel)
    if (trackByChannel) {
      if (trackByChannel.type === 'rhythmic') {
        const steps = trackByChannel.steps as MelodicStep[]
        steps[step] = { ...steps[step], on: true, velocity: ev.velocity }
      } else {
        const steps = trackByChannel.steps as MelodicStep[]
        steps[step] = { ...steps[step], on: true, pitch: ev.pitch, velocity: ev.velocity }
      }
      continue
    }

    // Fallback: classic GM drum channel 10 maps by pitch
    if (channel === 10) {
      const trackId = drumMap.get(ev.pitch)
      const track = trackId ? newTracks.find((t) => t.id === trackId) : undefined
      if (track && track.type === 'rhythmic') {
        const steps = track.steps as MelodicStep[]
        steps[step] = { ...steps[step], on: true, velocity: ev.velocity }
      }
      continue
    }

    // Otherwise assign to first melodic track
    const track = newTracks.find((t) => t.type === 'melodic')
    if (track && track.type === 'melodic') {
      const steps = track.steps as MelodicStep[]
      steps[step] = { ...steps[step], on: true, pitch: ev.pitch, velocity: ev.velocity }
    }
  }

  const newPattern: Pattern = { ...pattern, tracks: newTracks }
  const newProject = {
    ...project,
    patterns: project.patterns.map((p) => (p.id === newPattern.id ? newPattern : p)),
  }

  return { project: newProject, patternId: newPattern.id }
}

interface ParsedNoteEvent {
  tick: number
  type: 'noteOn' | 'noteOff'
  channel: number
  pitch: number
  velocity: number
}

function parseMidiFile(file: Uint8Array): ParsedNoteEvent[] | null {
  let pos = 0
  const readU8 = () => file[pos++]
  const readU16 = () => {
    const v = (file[pos] << 8) | file[pos + 1]
    pos += 2
    return v
  }
  const readU32 = () => {
    const v =
      (((file[pos] << 24) | (file[pos + 1] << 16) | (file[pos + 2] << 8) | file[pos + 3]) >>> 0)
    pos += 4
    return v
  }
  const readVarLen = () => {
    let value = 0
    while (true) {
      const b = readU8()
      value = (value << 7) | (b & 0x7f)
      if ((b & 0x80) === 0) break
    }
    return value
  }

  // Header
  const headerId = String.fromCharCode(...file.slice(0, 4))
  if (headerId !== 'MThd') return null
  pos = 4
  readU32() // header length
  readU16() // format
  const numTracks = readU16()
  readU16() // division

  const allEvents: ParsedNoteEvent[] = []

  for (let t = 0; t < numTracks; t++) {
    const trackId = String.fromCharCode(...file.slice(pos, pos + 4))
    if (trackId !== 'MTrk') return null
    pos += 4
    const trackLen = readU32()
    const trackEnd = pos + trackLen
    let tick = 0
    let runningStatus = 0

    while (pos < trackEnd) {
      const delta = readVarLen()
      tick += delta
      let status = readU8()

      if (status === 0xff) {
        // Meta event
        const type = readU8()
        const len = readVarLen()
        pos += len
      } else if (status === 0xf0 || status === 0xf7) {
        // Sysex
        while (readU8() !== 0xf7) {
          /* skip */
        }
      } else {
        if (status < 0x80) {
          // Running status
          pos--
          status = runningStatus
        } else {
          runningStatus = status
        }

        const type = status >> 4
        const channel = (status & 0x0f) + 1

        if (type === 0x9) {
          // Note on
          const pitch = readU8()
          const velocity = readU8()
          allEvents.push({ tick, type: velocity === 0 ? 'noteOff' : 'noteOn', channel, pitch, velocity })
        } else if (type === 0x8) {
          // Note off
          const pitch = readU8()
          readU8() // velocity
          allEvents.push({ tick, type: 'noteOff', channel, pitch, velocity: 0 })
        } else if (type === 0xc || type === 0xd) {
          pos += 1
        } else if (type >= 0x8 && type <= 0xe) {
          pos += 2
        }
      }
    }
  }

  return allEvents
}

function getSelectedPattern(project: Project): Pattern {
  return project.patterns.find((p) => p.id === project.selectedPatternId) ?? project.patterns[0]
}

function defaultDrumPitch(name: string): number {
  const pitches: Record<string, number> = {
    Kick: 36,
    Snare: 38,
    'Hi-hat': 42,
    Perc: 50,
  }
  return pitches[name] ?? 60
}
