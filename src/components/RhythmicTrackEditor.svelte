<script lang="ts">
  import type { RhythmicTrack } from '../lib/types'
  import { applyEuclidean } from '../lib/generative'

  interface Props {
    track: RhythmicTrack
    currentStep: number
    onChange: (track: RhythmicTrack) => void
  }

  let { track, currentStep, onChange }: Props = $props()

  let euclideanHits = $state(4)
  let euclideanRotate = $state(0)

  function toggleStep(index: number) {
    const steps = [...track.steps]
    steps[index] = { ...steps[index], on: !steps[index].on }
    onChange({ ...track, steps })
  }

  function setVelocity(index: number, velocity: number) {
    const steps = [...track.steps]
    steps[index] = { ...steps[index], velocity, on: true }
    onChange({ ...track, steps })
  }

  function applyEuc() {
    onChange(applyEuclidean(track, euclideanHits, euclideanRotate))
  }

  function clear() {
    onChange({
      ...track,
      steps: track.steps.map((s) => ({ ...s, on: false })),
    })
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
      <button class:muted={track.muted} onclick={() => onChange({ ...track, muted: !track.muted })}
        >M</button
      >
      <button class:solo={track.solo} onclick={() => onChange({ ...track, solo: !track.solo })}
        >S</button
      >
      <button onclick={applyEuc}>Euc</button>
      <button onclick={clear}>Clr</button>
    </div>
  </div>

  <div class="euclidean-row">
    <label>
      Hits
      <input type="number" min="0" max={track.steps.length} bind:value={euclideanHits} />
    </label>
    <label>
      Rotate
      <input type="number" min="0" max={track.steps.length - 1} bind:value={euclideanRotate} />
    </label>
  </div>

  <div class="step-row">
    {#each track.steps as step, i}
      <button
        class="step"
        class:on={step.on}
        class:accent={step.velocity > 110}
        class:ghost={step.velocity < 80}
        class:current={currentStep === i}
        aria-label={`Step ${i + 1}`}
        onclick={() => toggleStep(i)}
        oncontextmenu={(e) => {
          e.preventDefault()
          // Cycle velocity: normal → accent → ghost → normal
          let v = step.velocity
          if (v < 80) v = 100
          else if (v < 110) v = 120
          else v = 50
          setVelocity(i, v)
        }}
      >
      </button>
    {/each}
  </div>
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

  .euclidean-row {
    display: flex;
    gap: 16px;
    margin-bottom: 10px;
  }

  .euclidean-row label {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .euclidean-row input {
    width: 60px;
    font: inherit;
    background: var(--panel-2);
    color: var(--text-h);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 6px;
  }

  .step-row {
    display: grid;
    grid-template-columns: repeat(16, minmax(0, 1fr));
    gap: 4px;
  }

  .step {
    aspect-ratio: 1;
    min-height: 44px;
    padding: 0;
    background: var(--step-off);
    border: 1px solid transparent;
    border-radius: 4px;
  }

  .step:hover {
    border-color: var(--text-dim);
  }

  .step.on {
    background: var(--step-on);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .step.on.accent {
    background: var(--accent);
  }

  .step.on.ghost {
    background: #3d7a72;
  }

  .step.current {
    box-shadow: inset 0 0 0 2px var(--step-current);
  }
</style>
