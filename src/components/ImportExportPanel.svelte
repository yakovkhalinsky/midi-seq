<script lang="ts">
  import type { Project } from '../lib/types'
  import { exportPatternToMidi, exportProjectToMidi, importMidiToProject } from '../lib/midi-file'

  interface Props {
    project: Project
    onChange: (project: Project) => void
  }

  let { project, onChange }: Props = $props()

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportSelectedPattern() {
    const pattern = project.patterns.find((p) => p.id === project.selectedPatternId)
    if (!pattern) return
    const data = exportPatternToMidi(pattern, project.bpm)
    downloadBlob(new Blob([data.slice().buffer], { type: 'audio/midi' }), `${pattern.name}.mid`)
  }

  function exportSong() {
    const data = exportProjectToMidi(project)
    downloadBlob(new Blob([data.slice().buffer], { type: 'audio/midi' }), `midi-seq-song.mid`)
  }

  function importMidi(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const array = new Uint8Array(reader.result as ArrayBuffer)
      const result = importMidiToProject(array, project)
      if (result) {
        onChange(result.project)
      } else {
        alert('Could not parse MIDI file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFileInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (file) importMidi(file)
    input.value = ''
  }
</script>

<div class="panel">
  <span class="label">MIDI I/O</span>
  <div class="actions">
    <button onclick={exportSelectedPattern}>Export pattern</button>
    <button onclick={exportSong}>Export song</button>
    <label class="import-btn">
      Import MIDI
      <input type="file" accept=".mid,.midi,audio/midi" onchange={handleFileInput} />
    </label>
  </div>
</div>

<style>
  .panel {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .label {
    font-size: 0.75rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .import-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 8px 14px;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-h);
    cursor: pointer;
    font-size: 0.9rem;
  }

  .import-btn:hover {
    background: #2e2e38;
    border-color: var(--text-dim);
  }

  .import-btn input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .import-btn:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
