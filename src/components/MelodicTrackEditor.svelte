<script lang="ts">
  import type { MelodicTrack, ScaleMode } from '../lib/types'
  import { SCALE_INTERVALS } from '../lib/types'
  import { mutateMelodic } from '../lib/generative'
  import PianoRoll from './PianoRoll.svelte'

  interface Props {
    track: MelodicTrack
    stepsPerPattern: number
    currentStep: number
    collapsed: boolean
    onCollapsedChange: (collapsed: boolean) => void
    onChange: (track: MelodicTrack) => void
  }

  let { track, stepsPerPattern, currentStep, collapsed, onCollapsedChange, onChange }: Props = $props()

  let compactRoll = $state(false)

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

  function summaryNotes() {
    const notes: string[] = []
    track.steps.forEach((s, i) => {
      if (s.on) notes.push(`${pitchName(s.pitch)}@${i + 1}`)
    })
    return notes.slice(0, 6).join(', ') + (notes.length > 6 ? '…' : '') || 'No notes'
  }
</script>

<div class="track" class:collapsed>
  <div class="track-header">
    <input
      class="name"
      type="text"
      value={track.name}
      onchange={(e) => onChange({ ...track, name: e.currentTarget.value })}
    />

    <div class="track-meta">
      <span class="scale-badge">{pitchName(track.scaleRoot)} {track.scaleMode}</span>
      {#if collapsed}
        <span class="summary">{summaryNotes()}</span>
      {/if}
    </div>

    <div class="track-controls">
      <button
        class="toggle"
        aria-label={collapsed ? 'Expand track' : 'Collapse track'}
        aria-expanded={!collapsed}
        onclick={() => onCollapsedChange(!collapsed)}
      >
        {collapsed ? '▸' : '▾'}
      </button>
      <button
        class="mute"
        class:muted={track.muted}
        aria-label={track.muted ? 'Unmute' : 'Mute'}
        aria-pressed={track.muted}
        onclick={() => onChange({ ...track, muted: !track.muted })}
      >
        M
      </button>
      <button
        class="solo"
        class:solo={track.solo}
        aria-label={track.solo ? 'Unsolo' : 'Solo'}
        aria-pressed={track.solo}
        onclick={() => onChange({ ...track, solo: !track.solo })}
      >
        S
      </button>
      <button onclick={generate}>Gen</button>
      <button
        class="compact-toggle"
        class:active={compactRoll}
        aria-label={compactRoll ? 'Expand piano roll' : 'Compact piano roll'}
        aria-pressed={compactRoll}
        onclick={() => (compactRoll = !compactRoll)}
      >
        {compactRoll ? 'Expand' : 'Compact'}
      </button>
    </div>
  </div>

  {#if !collapsed}
    <div class="track-body">
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
      </div>

      <PianoRoll {track} {stepsPerPattern} {currentStep} compact={compactRoll} onChange={(t) => onChange(t)} />
    </div>
  {/if}
</div>

<style>
  .track {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    margin: 6px 16px;
  }

  .track-header {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 36px;
  }

  .name {
    font: inherit;
    font-weight: 600;
    color: var(--text-h);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 4px 6px;
    width: 120px;
  }

  .name:hover,
  .name:focus {
    border-color: var(--border);
    background: var(--panel-2);
  }

  .track-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .scale-badge {
    font-size: 0.75rem;
    color: var(--text-dim);
    background: var(--panel-2);
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .summary {
    font-size: 0.8rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  .track-controls button {
    padding: 4px 8px;
    font-size: 0.75rem;
    min-width: 28px;
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

  .track-controls button.compact-toggle.active {
    background: var(--accent);
    color: #000;
    border-color: var(--accent);
  }

  .track-body {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .scale-row {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .scale-row label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
  }

  .scale-row select,
  .scale-row input {
    font-size: 0.8rem;
  }
</style>
