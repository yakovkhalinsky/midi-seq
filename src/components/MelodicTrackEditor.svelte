<script lang="ts">
  import type { MelodicTrack, ScaleMode } from '../lib/types'
  import { SCALE_INTERVALS } from '../lib/types'
  import { mutateMelodic } from '../lib/generative'
  import PianoRoll from './PianoRoll.svelte'

  interface Props {
    track: MelodicTrack
    stepsPerPattern: number
    currentStep: number
    onChange: (track: MelodicTrack) => void
  }

  let { track, stepsPerPattern, currentStep, onChange }: Props = $props()

  const SCALES: ScaleMode[] = [
    'chromatic',
    'major',
    'minor',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'locrian',
    'pentatonic-major',
    'pentatonic-minor',
    'blues',
  ]

  function generate() {
    onChange(mutateMelodic(track, 0.4))
  }

  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  function pitchName(pitch: number) {
    return `${NOTES[pitch % 12]}${Math.floor(pitch / 12) - 1}`
  }
</script>

<div class="track">
  <div class="track-header">
    <input
      class="name"
      type="text"
      value={track.name}
      onchange={(e) => onChange({ ...track, name: e.currentTarget.value })}
    />
    <div class="track-controls">
      <label>
        Ch
        <input
          type="number"
          min="1"
          max="16"
          value={track.midiChannel}
          onchange={(e) => onChange({ ...track, midiChannel: parseInt(e.currentTarget.value, 10) })}
        />
      </label>
      <button class:muted={track.muted} onclick={() => onChange({ ...track, muted: !track.muted })}>
        M
      </button>
      <button class:solo={track.solo} onclick={() => onChange({ ...track, solo: !track.solo })}>
        S
      </button>
      <button onclick={generate}>Gen</button>
    </div>
  </div>

  <div class="scale-row">
    <label>
      Root
      <select
        value={track.scaleRoot}
        onchange={(e) => onChange({ ...track, scaleRoot: parseInt(e.currentTarget.value, 10) })}
      >
        {#each Array.from({ length: 128 }, (_, i) => i) as note}
          <option value={note}>{`${NOTES[note % 12]}${Math.floor(note / 12) - 1}`}</option>
        {/each}
      </select>
    </label>
    <label>
      Scale
      <select
        value={track.scaleMode}
        onchange={(e) => onChange({ ...track, scaleMode: e.currentTarget.value as ScaleMode })}
      >
        {#each SCALES as scale}
          <option value={scale}>{scale}</option>
        {/each}
      </select>
    </label>
    <label>
      Oct
      <input
        type="number"
        min="-4"
        max="4"
        value={track.octave}
        onchange={(e) => onChange({ ...track, octave: parseInt(e.currentTarget.value, 10) })}
      />
    </label>
  </div>

  <PianoRoll {track} {stepsPerPattern} {currentStep} onChange={(t) => onChange(t)} />
</div>

<style>
  .track {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    margin: 8px 16px;
  }

  .track-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .name {
    font: inherit;
    font-weight: 600;
    color: var(--text-h);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 4px 6px;
    width: 140px;
  }

  .name:hover,
  .name:focus {
    border-color: var(--border);
    background: var(--panel-2);
  }

  .track-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .track-controls button {
    padding: 6px 10px;
    font-size: 0.8rem;
  }

  .track-controls button.muted {
    background: var(--danger);
    color: #fff;
    border-color: var(--danger);
  }

  .track-controls button.solo {
    background: var(--accent);
    color: #000;
    border-color: var(--accent);
  }

  .scale-row {
    display: flex;
    gap: 16px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  .scale-row label {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .scale-row select,
  .scale-row input {
    font-size: 0.9rem;
  }
</style>
