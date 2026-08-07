<script lang="ts">
  import type { RhythmicTrack, Step } from '../lib/types'
  import { applyEuclidean } from '../lib/generative'

  interface Props {
    track: RhythmicTrack
    currentStep: number
    collapsed: boolean
    onCollapsedChange: (collapsed: boolean) => void
    onChange: (track: RhythmicTrack) => void
  }

  let { track, currentStep, collapsed, onCollapsedChange, onChange }: Props = $props()

  let showEuclidean = $state(false)
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

  function cycleVelocity(index: number) {
    const v = track.steps[index].velocity
    let next = 100
    if (v < 80) next = 100
    else if (v < 110) next = 120
    else next = 50
    setVelocity(index, next)
  }

  function onStepKeyDown(e: KeyboardEvent, index: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleStep(index)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      cycleVelocity(index)
    }
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
      <span class="channel-badge">Ch{track.midiChannel}</span>
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
      <button class:active={showEuclidean} onclick={() => (showEuclidean = !showEuclidean)}>Euc</button>
      <button onclick={clear}>Clr</button>
    </div>
  </div>

  {#if !collapsed}
    <div class="track-body">
      {#if showEuclidean}
        <div class="euclidean-row">
          <label>
            Hits
            <input type="number" min="0" max={track.steps.length} bind:value={euclideanHits} />
          </label>
          <label>
            Rotate
            <input type="number" min="0" max={track.steps.length - 1} bind:value={euclideanRotate} />
          </label>
          <button onclick={applyEuc}>Apply</button>
        </div>
      {/if}

      <div class="step-row" role="region" aria-label={`${track.name} step grid`}>
        {#each track.steps as step, i}
          <button
            class="step"
            class:on={step.on}
            class:accent={step.velocity > 110}
            class:ghost={step.velocity < 80}
            class:current={currentStep === i}
            aria-label={`Step ${i + 1}, ${step.on ? 'on' : 'off'}, velocity ${step.velocity}`}
            aria-pressed={step.on}
            onclick={() => toggleStep(i)}
            oncontextmenu={(e) => {
              e.preventDefault()
              cycleVelocity(i)
            }}
            onkeydown={(e) => onStepKeyDown(e, i)}
          >
          </button>
        {/each}
      </div>

      <div class="velocity-lane" role="img" aria-label={`${track.name} velocity overview`}>
        {#each track.steps as step, i}
          <div
            class="velocity-bar"
            class:on={step.on}
            class:accent={step.velocity > 110}
            class:ghost={step.velocity < 80}
            class:current={currentStep === i}
            style:height={`${(step.on ? step.velocity : 0) / 127 * 100}%`}
            title={`Step ${i + 1}: ${step.on ? step.velocity : 0}`}
          ></div>
        {/each}
      </div>
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
  }

  .channel-badge {
    font-size: 0.75rem;
    color: var(--text-dim);
    background: var(--panel-2);
    padding: 2px 6px;
    border-radius: 4px;
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

  .track-controls button.active {
    background: var(--accent-dim);
    border-color: var(--accent);
  }

  .track-body {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .euclidean-row {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    align-items: center;
  }

  .euclidean-row label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
  }

  .euclidean-row input {
    width: 50px;
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
    gap: 3px;
  }

  .step {
    aspect-ratio: 1;
    min-height: 36px;
    padding: 0;
    background: var(--step-off);
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  .step:hover {
    border-color: var(--text-dim);
  }

  .step.on {
    background: var(--step-on);
    box-shadow: 0 0 8px var(--accent-glow);
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

  .velocity-lane {
    display: grid;
    grid-template-columns: repeat(16, minmax(0, 1fr));
    gap: 3px;
    height: 24px;
    margin-top: 4px;
    align-items: end;
  }

  .velocity-bar {
    background: transparent;
    border-radius: 2px;
    min-height: 2px;
    transition: height 0.1s;
  }

  .velocity-bar.on {
    background: var(--accent-dim);
  }

  .velocity-bar.on.accent {
    background: var(--accent);
  }

  .velocity-bar.on.ghost {
    background: #3d7a72;
  }

  .velocity-bar.current {
    background: var(--step-current);
  }
</style>
