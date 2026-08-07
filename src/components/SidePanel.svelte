<script lang="ts">
  import type { Project } from '../lib/types'
  import SongEditor from './SongEditor.svelte'
  import ImportExportPanel from './ImportExportPanel.svelte'

  interface Props {
    project: Project
    onChange: (project: Project) => void
  }

  let { project, onChange }: Props = $props()

  const tabs = [
    { id: 'song', label: 'Song' },
    { id: 'midi', label: 'MIDI I/O' },
  ] as const

  function setTab(tab: 'song' | 'midi' | null) {
    onChange({ ...project, sidePanelTab: tab })
  }
</script>

<div class="side-panel">
  <div class="tabs" role="tablist" aria-label="Secondary panels">
    <button
      role="tab"
      aria-selected={project.sidePanelTab === 'song'}
      class:active={project.sidePanelTab === 'song'}
      onclick={() => setTab(project.sidePanelTab === 'song' ? null : 'song')}
    >
      Song
    </button>
    <button
      role="tab"
      aria-selected={project.sidePanelTab === 'midi'}
      class:active={project.sidePanelTab === 'midi'}
      onclick={() => setTab(project.sidePanelTab === 'midi' ? null : 'midi')}
    >
      MIDI I/O
    </button>
  </div>

  {#if project.sidePanelTab === 'song'}
    <div class="panel-content" role="tabpanel">
      <SongEditor {project} onChange={onChange} />
    </div>
  {:else if project.sidePanelTab === 'midi'}
    <div class="panel-content" role="tabpanel">
      <ImportExportPanel {project} onChange={onChange} />
    </div>
  {/if}
</div>

<style>
  .side-panel {
    background: var(--panel);
    border-bottom: 1px solid var(--border);
  }

  .tabs {
    display: flex;
    gap: 8px;
    padding: 8px 16px;
  }

  .tabs button {
    padding: 6px 14px;
    font-size: 0.85rem;
  }

  .tabs button.active {
    background: var(--accent);
    color: #000;
    border-color: var(--accent);
    font-weight: 600;
  }

  .panel-content {
    padding-bottom: 8px;
  }
</style>
