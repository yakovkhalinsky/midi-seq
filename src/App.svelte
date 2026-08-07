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
  } from './lib/types'
  import { Scheduler } from './lib/scheduler'
  import { saveProject, loadProject } from './lib/storage'
  import Transport from './components/Transport.svelte'
  import MidiOutputSelector from './components/MidiOutputSelector.svelte'
  import PatternBank from './components/PatternBank.svelte'
  import SongEditor from './components/SongEditor.svelte'
  import ImportExportPanel from './components/ImportExportPanel.svelte'
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

  const selectedPattern = $derived(getSelectedPattern(project))
</script>

<main class="app">
  <header class="masthead">
    <h1>midi-seq</h1>
    <p>2 melodic + 4 rhythmic tracks. Pattern banks. Song mode. External MIDI. Offline-ready.</p>
  </header>

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

  <SongEditor {project} onChange={updateProject} />

  <ImportExportPanel {project} onChange={updateProject} />

  <section class="tracks">
    <h2>Melodic</h2>
    {#each selectedPattern.tracks.filter((t): t is MelodicTrack => t.type === 'melodic') as track}
      <MelodicTrackEditor
        {track}
        stepsPerPattern={project.stepsPerPattern}
        {currentStep}
        onChange={(t) => updateTrack(t)}
      />
    {/each}

    <h2>Rhythmic</h2>
    {#each selectedPattern.tracks.filter((t): t is RhythmicTrack => t.type === 'rhythmic') as track}
      <RhythmicTrackEditor
        {track}
        {currentStep}
        onChange={(t) => updateTrack(t)}
      />
    {/each}
  </section>
</main>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100svh;
  }

  .masthead {
    padding: 20px 16px 8px;
    background: var(--panel);
  }

  .masthead h1 {
    margin: 0;
    font-size: 1.6rem;
    color: var(--accent);
    letter-spacing: -0.02em;
  }

  .masthead p {
    margin: 4px 0 0;
    color: var(--text-dim);
  }

  .tracks {
    flex: 1;
    padding: 8px 0 32px;
  }

  .tracks h2 {
    margin: 16px 16px 8px;
    font-size: 1rem;
    color: var(--text-h);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
</style>
