<script lang="ts">
  interface Props {
    bpm: number
    swing: number
    playing: boolean
    midiClock: boolean
    onPlay: () => void
    onStop: () => void
    onBpmChange: (bpm: number) => void
    onSwingChange: (swing: number) => void
    onMidiClockToggle: () => void
  }

  let {
    bpm,
    swing,
    playing,
    midiClock,
    onPlay,
    onStop,
    onBpmChange,
    onSwingChange,
    onMidiClockToggle,
  }: Props = $props()
</script>

<div class="transport">
  <button class="primary" onclick={playing ? onStop : onPlay}>
    {playing ? 'Stop' : 'Play'}
  </button>

  <div class="control">
    <label for="bpm">BPM</label>
    <input
      id="bpm"
      type="number"
      min="20"
      max="300"
      value={bpm}
      onchange={(e) => onBpmChange(parseInt(e.currentTarget.value, 10))}
    />
  </div>

  <div class="control">
    <label for="swing">Swing</label>
    <input
      id="swing"
      type="range"
      min="0"
      max="75"
      value={Math.round(swing * 100)}
      oninput={(e) => onSwingChange(parseInt(e.currentTarget.value, 10) / 100)}
    />
    <span>{Math.round(swing * 100)}%</span>
  </div>

  <button class:active={midiClock} onclick={onMidiClockToggle}>
    MIDI Clock {midiClock ? 'On' : 'Off'}
  </button>
</div>

<style>
  .transport {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 16px 20px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .control {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  input[type='number'] {
    width: 72px;
    font: inherit;
    background: var(--panel-2);
    color: var(--text-h);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 8px;
  }

  input[type='range'] {
    width: 100px;
  }

  button.active {
    background: var(--accent);
    color: #000;
    border-color: var(--accent);
  }
</style>
