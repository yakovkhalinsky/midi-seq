<script lang="ts">
  import type { Project, Pattern } from '../lib/types'

  interface Props {
    project: Project
    activePatternId: string
    onSelect: (patternId: string) => void
    onDuplicate: (sourceId: string, targetId: string) => void
    onClear: (patternId: string) => void
    onRename: (pattern: Pattern) => void
  }

  let { project, activePatternId, onSelect, onDuplicate, onClear, onRename }: Props = $props()

  function handleCopyTarget(patternId: string) {
    const source = project.selectedPatternId
    if (source === patternId) return
    onDuplicate(source, patternId)
  }
</script>

<div class="pattern-bank">
  <span class="label">Patterns</span>
  <div class="patterns">
    {#each project.patterns as pattern}
      <div class="pattern-cell" class:active={activePatternId === pattern.id}>
        <button
          class="pattern-btn"
          class:selected={project.selectedPatternId === pattern.id}
          onclick={() => onSelect(pattern.id)}
          aria-label={`Pattern ${pattern.name}`}
        >
          {pattern.name}
        </button>
        <input
          class="pattern-name"
          type="text"
          value={pattern.name}
          onchange={(e) => onRename({ ...pattern, name: e.currentTarget.value })}
        />
        <div class="pattern-actions">
          <button
            class="action"
            title="Copy selected pattern here"
            aria-label={`Copy selected pattern into ${pattern.name}`}
            onclick={() => handleCopyTarget(pattern.id)}
          >
            Cp
          </button>
          <button
            class="action danger"
            title="Clear this pattern"
            aria-label={`Clear pattern ${pattern.name}`}
            onclick={() => onClear(pattern.id)}
          >
            Cl
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .pattern-bank {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }

  .label {
    font-size: 0.75rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .patterns {
    display: flex;
    gap: 8px;
    flex: 1;
  }

  .pattern-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px;
    border-radius: 6px;
    border: 1px solid transparent;
    min-width: 64px;
  }

  .pattern-cell.active {
    border-color: var(--accent);
    background: var(--accent-dim);
  }

  .pattern-btn {
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: 4px;
    font-weight: 600;
    background: var(--panel-2);
  }

  .pattern-btn.selected {
    background: var(--accent);
    color: #000;
    border-color: var(--accent);
  }

  .pattern-name {
    width: 60px;
    font: inherit;
    font-size: 0.75rem;
    text-align: center;
    background: transparent;
    color: var(--text);
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 2px 4px;
  }

  .pattern-name:hover,
  .pattern-name:focus {
    border-color: var(--border);
    background: var(--panel-2);
    color: var(--text-h);
  }

  .pattern-actions {
    display: flex;
    gap: 4px;
  }

  .action {
    padding: 3px 6px;
    font-size: 0.65rem;
    background: var(--panel-2);
  }

  .action.danger:hover {
    background: var(--danger);
    color: #fff;
    border-color: var(--danger);
  }
</style>
