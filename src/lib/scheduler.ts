import type { Project, Pattern, Track, MelodicStep } from './types'
import { getSelectedPattern } from './types'

export type TickCallback = (stepIndex: number) => void
export type PatternChangeCallback = (patternId: string) => void

const LOOKAHEAD_S = 0.1
const SCHEDULE_INTERVAL_MS = 25
const CLOCK_PULSES_PER_QUARTER = 24

export class Scheduler {
  private audioCtx: AudioContext | null = null
  private midiAccess: MIDIAccess | null = null
  private midiOutputs: MIDIOutput[] = []
  private project: Project
  private isPlaying = false
  private nextStepTime = 0
  private nextClockTime = 0
  private currentStep = 0
  private timerId: number | null = null
  private tickCallback: TickCallback | null = null
  private patternChangeCallback: PatternChangeCallback | null = null
  private currentPatternId: string
  private songSlotIndex = 0
  private slotRepeatCount = 0

  constructor(project: Project) {
    this.project = project
    this.currentPatternId = project.selectedPatternId
  }

  async init() {
    this.audioCtx = new AudioContext()
    await this.audioCtx.resume()

    if ('requestMIDIAccess' in navigator) {
      try {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false })
        this.refreshOutputs()
        this.midiAccess.onstatechange = () => this.refreshOutputs()
      } catch {
        // Web MIDI not available; fallback to internal audio only
      }
    }
  }

  private refreshOutputs() {
    if (!this.midiAccess) return
    this.midiOutputs = []
    this.midiAccess.outputs.forEach((output: MIDIOutput) => {
      this.midiOutputs.push(output)
    })
  }

  get outputs() {
    return this.midiOutputs
  }

  setOutputById(id: string) {
    const output = this.midiOutputs.find((o) => o.id === id)
    if (output) {
      this.midiOutputs = [output]
    }
  }

  setProject(project: Project) {
    this.project = project
  }

  onTick(cb: TickCallback) {
    this.tickCallback = cb
  }

  onPatternChange(cb: PatternChangeCallback) {
    this.patternChangeCallback = cb
  }

  play() {
    if (this.isPlaying) return
    if (!this.audioCtx) {
      void this.init().then(() => this.play())
      return
    }
    this.isPlaying = true
    this.currentStep = 0
    this.songSlotIndex = 0
    this.slotRepeatCount = 0
    this.setPatternFromPlaybackContext()
    this.nextStepTime = this.audioCtx.currentTime + 0.05
    this.nextClockTime = this.nextStepTime
    this.sendMidiClockStart()
    this.timerId = window.setInterval(() => this.runScheduler(), SCHEDULE_INTERVAL_MS)
  }

  stop() {
    this.isPlaying = false
    if (this.timerId !== null) {
      window.clearInterval(this.timerId)
      this.timerId = null
    }
    this.sendMidiClockStop()
    this.allNotesOff()
    this.currentStep = 0
  }

  get playing() {
    return this.isPlaying
  }

  get activePatternId() {
    return this.currentPatternId
  }

  private setPatternFromPlaybackContext() {
    if (this.project.playMode === 'song') {
      const slot = this.project.song[this.songSlotIndex]
      const patternId = slot?.patternId ?? this.project.selectedPatternId
      this.switchPattern(patternId)
    } else {
      this.switchPattern(this.project.selectedPatternId)
    }
  }

  private switchPattern(patternId: string) {
    if (this.currentPatternId === patternId) return
    this.currentPatternId = patternId
    this.patternChangeCallback?.(patternId)
  }

  private runScheduler() {
    if (!this.audioCtx) return

    // Advance song mode if needed at pattern boundaries
    if (this.project.playMode === 'song' && this.currentStep === 0) {
      this.setPatternFromPlaybackContext()
    }

    const pattern = this.getCurrentPattern()
    if (!pattern) return

    // Schedule MIDI clock pulses
    if (this.project.midiClock && this.midiOutputs.length > 0) {
      const clockInterval = this.quarterNoteDurationSeconds() / CLOCK_PULSES_PER_QUARTER
      while (this.nextClockTime < this.audioCtx.currentTime + LOOKAHEAD_S) {
        this.sendMidiClockPulse(this.nextClockTime)
        this.nextClockTime += clockInterval
      }
    }

    // Schedule notes
    while (this.nextStepTime < this.audioCtx.currentTime + LOOKAHEAD_S) {
      this.scheduleStep(pattern, this.currentStep, this.nextStepTime)
      this.tickCallback?.(this.currentStep)

      this.currentStep += 1
      if (this.currentStep >= this.project.stepsPerPattern) {
        this.currentStep = 0
        this.advanceSongSlot()
      }

      this.nextStepTime += this.stepDurationSeconds()
    }
  }

  private getCurrentPattern(): Pattern | null {
    return this.project.patterns.find((p) => p.id === this.currentPatternId) ?? null
  }

  private advanceSongSlot() {
    if (this.project.playMode !== 'song') return
    const slot = this.project.song[this.songSlotIndex]
    if (!slot) return

    this.slotRepeatCount += 1
    if (this.slotRepeatCount >= slot.repeats) {
      this.slotRepeatCount = 0
      this.songSlotIndex = (this.songSlotIndex + 1) % this.project.song.length
      this.setPatternFromPlaybackContext()
    }
  }

  private stepDurationSeconds() {
    const beatsPerSecond = this.project.bpm / 60
    const stepsPerBeat = 4
    return 1 / (beatsPerSecond * stepsPerBeat)
  }

  private quarterNoteDurationSeconds() {
    return 60 / this.project.bpm
  }

  private scheduleStep(pattern: Pattern, stepIndex: number, time: number) {
    const anySolo = pattern.tracks.some((t) => t.solo)

    for (const track of pattern.tracks) {
      if (track.muted) continue
      if (anySolo && !track.solo) continue

      const rawStep = track.steps[stepIndex]
      if (!rawStep?.on) continue
      if (rawStep.probability < 1 && Math.random() > rawStep.probability) continue

      const step = rawStep as MelodicStep
      const pitch = 'pitch' in step ? step.pitch : defaultDrumPitch(track.name)
      const velocity = Math.max(1, Math.min(127, Math.round(step.velocity * track.volume)))
      const length = 'length' in step ? Math.max(1, step.length) : 1
      const offTime = time + this.stepDurationSeconds() * length * 0.95

      this.sendNoteOn(track.midiChannel, pitch, velocity, time)
      this.sendNoteOff(track.midiChannel, pitch, offTime)
    }
  }

  private sendNoteOn(channel: number, pitch: number, velocity: number, time: number) {
    const cmd = [0x90 + (channel - 1), pitch, velocity]
    if (this.midiOutputs.length > 0) {
      const offsetMs = (performance.now() / 1000 - this.audioCtx!.currentTime) * 1000
      const midiTime = time * 1000 + offsetMs
      for (const out of this.midiOutputs) {
        out.send(cmd, midiTime)
      }
    } else if (this.audioCtx) {
      // Fallback preview: short blip oscillator
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()
      osc.frequency.value = 440 * Math.pow(2, (pitch - 69) / 12)
      gain.gain.setValueAtTime((velocity / 127) * 0.3, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
      osc.connect(gain).connect(this.audioCtx.destination)
      osc.start(time)
      osc.stop(time + 0.1)
    }
  }

  private sendNoteOff(channel: number, pitch: number, time: number) {
    const cmd = [0x80 + (channel - 1), pitch, 0]
    if (this.midiOutputs.length > 0) {
      const offsetMs = (performance.now() / 1000 - this.audioCtx!.currentTime) * 1000
      const midiTime = time * 1000 + offsetMs
      for (const out of this.midiOutputs) {
        out.send(cmd, midiTime)
      }
    }
  }

  private sendMidiClockStart() {
    if (!this.project.midiClock || this.midiOutputs.length === 0) return
    const cmd = [0xfa]
    const offsetMs = (performance.now() / 1000 - this.audioCtx!.currentTime) * 1000
    const midiTime = this.audioCtx!.currentTime * 1000 + offsetMs
    for (const out of this.midiOutputs) {
      out.send(cmd, midiTime)
    }
  }

  private sendMidiClockStop() {
    if (!this.project.midiClock || this.midiOutputs.length === 0) return
    const cmd = [0xfc]
    const offsetMs = (performance.now() / 1000 - this.audioCtx!.currentTime) * 1000
    const midiTime = this.audioCtx!.currentTime * 1000 + offsetMs
    for (const out of this.midiOutputs) {
      out.send(cmd, midiTime)
    }
  }

  private sendMidiClockPulse(time: number) {
    if (this.midiOutputs.length === 0) return
    const cmd = [0xf8]
    const offsetMs = (performance.now() / 1000 - this.audioCtx!.currentTime) * 1000
    const midiTime = time * 1000 + offsetMs
    for (const out of this.midiOutputs) {
      out.send(cmd, midiTime)
    }
  }

  private allNotesOff() {
    for (let ch = 1; ch <= 16; ch++) {
      this.sendCC(ch, 0x78, 0, this.audioCtx?.currentTime ?? 0)
      this.sendCC(ch, 0x7b, 0, this.audioCtx?.currentTime ?? 0)
    }
  }

  private sendCC(channel: number, cc: number, value: number, time: number) {
    const cmd = [0xb0 + (channel - 1), cc, value]
    if (this.midiOutputs.length > 0) {
      const offsetMs = (performance.now() / 1000 - this.audioCtx!.currentTime) * 1000
      const midiTime = time * 1000 + offsetMs
      for (const out of this.midiOutputs) {
        out.send(cmd, midiTime)
      }
    }
  }
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
