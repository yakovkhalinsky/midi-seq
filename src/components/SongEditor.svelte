<script lang="ts">
  import type { Project, SongSlot, Pattern } from '../lib/types'

  interface Props {
    project: Project
    onChange: (project: Project) => void
  }

  let { project, onChange }: Props = $props()

  function addSlot() {
    const slot: SongSlot = { patternId: project.selectedPatternId, repeats: 1 }
    onChange({ ...project, song: [...project.song, slot] })
  }

  function updateSlot(index: number, slot: SongSlot) {
    const song = [...project.song]
    song[index] = slot
    onChange({ ...project, song })
  }

  function removeSlot(index: number) {
    const song = project.song.filter((_, i) => i !== index)
    onChange({ ...project, song })
  }

  function moveSlot(index: number, direction: number) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= project.song.length) return
    const song = [...project.song]
    const [slot] = song.splice(index, 1)
    song.splice(newIndex, 0, slot)
    onChange({ ...project, song })
  }

  function setPlayMode(mode: 'loop' | 'song') {
    onChange({ ...project, playMode: mode })
  }
</script>

<div class="song-editor">
  <div class="mode-switch" role="group" aria-label="Play mode">
    <button
      class:active={project.playMode === 'loop'}
      aria-pressed={project.playMode === 'loop'}
      onclick={() => setPlayMode('loop')}
    >Loop</button>
    <button
      class:active={project.playMode === 'song'}
      aria-pressed={project.playMode === 'song'}
      onclick={() => setPlayMode('song')}
    >Song</button>
  </div>

  {#if project.playMode === 'song'}
    <div class="slots">
      {#each project.song as slot, i}
        <div class="slot">
          <select
            value={slot.patternId}
            onchange={(e) => updateSlot(i, { ...slot, patternId: e.currentTarget.value })}
          >
            {#each project.patterns as pattern}
              <option value={pattern.id}>{pattern.name}</option>
            {/each}
          </select>
          <label>
            ×
            <input
              type="number"
              min="1"
              max="99"
              value={slot.repeats}
              onchange={(e) =>
                updateSlot(i, { ...slot, repeats: parseInt(e.currentTarget.value, 10) })}
            />
          </label>
          <div class="slot-actions">
            <button
              onclick={() => moveSlot(i, -1)}
              disabled={i === 0}
              aria-label={`Move slot ${i + 1} up`}
            >↑</button>
            <button
              onclick={() => moveSlot(i, 1)}
              disabled={i === project.song.length - 1}
              aria-label={`Move slot ${i + 1} down`}
            >↓</button>
            <button
              class="danger"
              onclick={() => removeSlot(i)}
              aria-label={`Remove slot ${i + 1}`}
            >×</button>
          </div>
        </div>
      {/each}
      <button class="add-slot" onclick={addSlot}>+ Add pattern</button>
    </div>
  {/if}
</div>

<style>
  .song-editor {
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    padding: 10px 16px;
  }

  .mode-switch {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }

  .mode-switch button {
    padding: 6px 14px;
  }

  .mode-switch button.active {
    background: var(--accent);
    color: #000;
    border-color: var(--accent);
    font-weight: 600;
  }

  .slots {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .slot {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px;
    background: var(--panel-2);
    border-radius: 6px;
  }

  .slot label {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .slot input[type='number'] {
    width: 50px;
    font: inherit;
    background: var(--panel);
    color: var(--text-h);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 6px;
  }

  .slot-actions {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }

  .slot-actions button {
    padding: 4px 8px;
  }

  .danger:hover {
    background: var(--danger);
    color: #fff;
    border-color: var(--danger);
  }

  .add-slot {
    align-self: flex-start;
    margin-top: 4px;
  }
</style>
