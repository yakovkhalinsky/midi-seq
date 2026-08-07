<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    createDefaultProject,
    type Project,
    type Track,
    type MelodicTrack,
    type RhythmicTrack,
    type Pattern,
    getSelectedPattern,
    updatePattern,
    duplicatePattern,
    setTrackCollapsed,
  } from './lib/types'
  import { Scheduler } from './lib/scheduler'
  import { saveProject, loadProject } from './lib/storage'
  import Transport from './components/Transport.svelte'
  import MidiOutputSelector from './components/MidiOutputSelector.svelte'
  import PatternBank from './components/PatternBank.svelte'
  import SidePanel from './components/SidePanel.svelte'
  import MelodicTrackEditor from './components/MelodicTrackEditor.svelte'
  import RhythmicTrackEditor from './components/RhythmicTrackEditor.svelte'

  let project = $state<Project>(createDefaultProject())
  const scheduler = new Scheduler(createDefaultProject())
  let currentStep = $state(0)
  let activePatternId = $state('A')
  let selectedOutputId = $state<string | null>(null)

  onMount(async () => {
    await scheduler.init()
    scheduler.onTick((step) => {
      currentStep = step
    })
    scheduler.onPatternChange((patternId) => {
      activePatternId = patternId
    })
    const saved = await loadProject('default')
    if (saved && Array.isArray((saved as Project).patterns) && (saved as Project).patterns.length > 0) {
      project = saved as Project
      scheduler.setProject(project)
      activePatternId = project.selectedPatternId
    }
  })

  onDestroy(() => {
    scheduler.stop()
  })

  function updateProject(next: Project) {
    project = next
    scheduler.setProject(next)
    void saveProject('default', next)
  }

  function selectPattern(patternId: string) {
    updateProject({ ...project, selectedPatternId: patternId })
    activePatternId = patternId
  }

  function updatePatternInProject(pattern: Pattern) {
    updateProject(updatePattern(project, pattern))
  }

  function updateTrack(updated: Track) {
    const pattern = getSelectedPattern(project)
    const nextPattern: Pattern = {
      ...pattern,
      tracks: pattern.tracks.map((t) => (t.id === updated.id ? updated : t)),
    }
    updatePatternInProject(nextPattern)
  }

  function duplicatePatternTo(sourceId: string, targetId: string) {
    updateProject(duplicatePattern(project, sourceId, targetId))
  }

  function clearPattern(patternId: string) {
    const pattern = project.patterns.find((p) => p.id === patternId)
    if (!pattern) return
    const cleared: Pattern = {
      ...pattern,
      tracks: pattern.tracks.map((t) => ({
        ...t,
        steps: t.steps.map((s) => ({ ...s, on: false })),
      })),
    }
    updatePatternInProject(cleared)
  }

  function renamePattern(pattern: Pattern) {
    updatePatternInProject(pattern)
  }

  function updateBpm(bpm: number) {
    updateProject({ ...project, bpm })
  }

  function updateSwing(swing: number) {
    updateProject({ ...project, swing })
  }

  function toggleMidiClock() {
    updateProject({ ...project, midiClock: !project.midiClock })
  }

  function handlePlay() {
    void scheduler.init().then(() => scheduler.play())
  }

  function handleStop() {
    scheduler.stop()
    activePatternId = project.selectedPatternId
  }

  function handleOutputSelect(id: string | null) {
    selectedOutputId = id
    if (id) {
      scheduler.setOutputById(id)
    }
  }

  function setCollapsed(trackId: string, collapsed: boolean) {
    updateProject(setTrackCollapsed(project, project.selectedPatternId, trackId, collapsed))
  }

  function collapseAll() {
    const pattern = getSelectedPattern(project)
    const collapsed: Record<string, boolean> = {}
    pattern.tracks.forEach((t) => (collapsed[t.id] = true))
    updateProject({
      ...project,
      patterns: project.patterns.map((p) =>
        p.id === pattern.id ? { ...p, collapsedTracks: collapsed } : p
      ),
    })
  }

  function expandAll() {
    const pattern = getSelectedPattern(project)
    updateProject({
      ...project,
      patterns: project.patterns.map((p) =>
        p.id === pattern.id ? { ...p, collapsedTracks: {} } : p
      ),
    })
  }

  const selectedPattern = $derived(getSelectedPattern(project))
  const showSidePanel = $derived(project.sidePanelTab !== null)
</script>

<a href="#tracks" class="skip-link">Skip to tracks</a>

<main class="app">
  <aside class="sidebar" aria-label="Transport and song controls">
    <div class="masthead">
      <h1>midi-seq</h1>
      <p>2 melodic + 4 rhythmic tracks. Pattern banks. Song mode. External MIDI. Offline-ready.</p>
    </div>

    <Transport
      bpm={project.bpm}
      swing={project.swing}
      playing={scheduler.playing}
      midiClock={project.midiClock}
      onPlay={handlePlay}
      onStop={handleStop}
      onBpmChange={updateBpm}
      onSwingChange={updateSwing}
      onMidiClockToggle={toggleMidiClock}
    />

    <MidiOutputSelector
      outputs={scheduler.outputs}
      selectedId={selectedOutputId}
      onSelect={handleOutputSelect}
    />

    <PatternBank
      {project}
      activePatternId={scheduler.playing ? activePatternId : project.selectedPatternId}
      onSelect={selectPattern}
      onDuplicate={duplicatePatternTo}
      onClear={clearPattern}
      onRename={renamePattern}
    />

    <SidePanel {project} onChange={updateProject} />
  </aside>

  <section id="tracks" class="tracks" class:with-side-panel={showSidePanel} aria-label="Pattern tracks">
    <div class="tracks-header">
      <h2>Tracks</h2>
      <div class="track-layout-actions">
        <button onclick={expandAll}>Expand all</button>
        <button onclick={collapseAll}>Collapse all</button>
      </div>
    </div>

    <h3>Melodic</h3>
    {#each selectedPattern.tracks.filter((t): t is MelodicTrack => t.type === 'melodic') as track}
      <MelodicTrackEditor
        {track}
        stepsPerPattern={project.stepsPerPattern}
        {currentStep}
        collapsed={selectedPattern.collapsedTracks?.[track.id] ?? false}
        onCollapsedChange={(collapsed) => setCollapsed(track.id, collapsed)}
        onChange={(t) => updateTrack(t)}
      />
    {/each}

    <h3>Rhythmic</h3>
    {#each selectedPattern.tracks.filter((t): t is RhythmicTrack => t.type === 'rhythmic') as track}
      <RhythmicTrackEditor
        {track}
        {currentStep}
        collapsed={selectedPattern.collapsedTracks?.[track.id] ?? false}
        onCollapsedChange={(collapsed) => setCollapsed(track.id, collapsed)}
        onChange={(t) => updateTrack(t)}
      />
    {/each}
  </section>
</main>

<style>
  .app {
    display: flex;
    flex-direction: row;
    min-height: 100svh;
  }

  .sidebar {
    width: 320px;
    min-width: 260px;
    max-width: 420px;
    background: var(--panel);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    resize: horizontal;
  }

  .masthead {
    padding: 12px 16px 6px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
  }

  .masthead h1 {
    margin: 0;
    font-size: 1.3rem;
    color: var(--accent);
    letter-spacing: -0.02em;
  }

  .masthead p {
    margin: 2px 0 0;
    font-size: 0.75rem;
    color: var(--text-dim);
  }

  .tracks {
    flex: 1;
    padding: 8px 0 32px;
    overflow-y: auto;
    min-width: 0;
  }

  .tracks-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 8px 16px;
  }

  .tracks h2 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-h);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .tracks h3 {
    margin: 16px 16px 8px;
    font-size: 0.75rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .track-layout-actions {
    display: flex;
    gap: 6px;
  }

  .track-layout-actions button {
    padding: 4px 8px;
    font-size: 0.7rem;
  }

  .skip-link {
    position: absolute;
    top: -40px;
    left: 8px;
    background: var(--accent);
    color: #000;
    padding: 8px 12px;
    border-radius: 6px;
    font-weight: 600;
    z-index: 1000;
    transition: top 0.12s;
  }

  .skip-link:focus {
    top: 8px;
  }

  @media (max-width: 900px) {
    .app {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      max-width: none;
      border-right: none;
      border-bottom: 1px solid var(--border);
      resize: none;
      max-height: 50svh;
    }
  }
</style>
