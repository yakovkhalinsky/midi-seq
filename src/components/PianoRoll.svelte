<script lang="ts">
  import type { MelodicTrack, MelodicStep } from '../lib/types'

  interface Props {
    track: MelodicTrack
    stepsPerPattern: number
    currentStep: number
    onChange: (track: MelodicTrack) => void
  }

  let { track, stepsPerPattern, currentStep, onChange }: Props = $props()

  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const LOW_PITCH = 36 // C2
  const HIGH_PITCH = 84 // C6
  const NOTE_HEIGHT = 18
  const HEADER_HEIGHT = 24
  const KEY_WIDTH = 44
  const STEP_WIDTH = 48
  const MIN_NOTE_LENGTH = 1
  const maxNoteLength = $derived(stepsPerPattern)

  let canvas: HTMLCanvasElement
  let container: HTMLDivElement
  let scrollTop = $state(0)
  let scrollLeft = $state(0)
  let selectedStepIndex = $state(-1)

  let dragging: {
    type: 'move' | 'resize'
    stepIndex: number
    startX: number
    startY: number
    originalPitch: number
    originalStart: number
    originalLength: number
  } | null = $state(null)

  const totalWidth = $derived(KEY_WIDTH + stepsPerPattern * STEP_WIDTH)
  const totalHeight = $derived(HEADER_HEIGHT + (HIGH_PITCH - LOW_PITCH + 1) * NOTE_HEIGHT)
  const pitches = $derived(Array.from({ length: HIGH_PITCH - LOW_PITCH + 1 }, (_, i) => HIGH_PITCH - i))

  $effect(() => {
    // Redraw when any reactive dependency changes
    track
    currentStep
    scrollTop
    scrollLeft
    selectedStepIndex
    if (canvas) {
      draw()
    }
  })

  function pitchName(pitch: number) {
    return `${NOTES[pitch % 12]}${Math.floor(pitch / 12) - 1}`
  }

  function isBlackKey(pitch: number) {
    return [1, 3, 6, 8, 10].includes(pitch % 12)
  }

  function draw() {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cssWidth = container.clientWidth
    const cssHeight = container.clientHeight

    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0, 0, cssWidth, cssHeight)

    // Background
    ctx.fillStyle = '#1a1a20'
    ctx.fillRect(0, 0, cssWidth, cssHeight)

    // Header background
    ctx.fillStyle = '#22222a'
    ctx.fillRect(0, 0, cssWidth, HEADER_HEIGHT)

    // Draw step numbers and beat separators in header
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '11px system-ui, sans-serif'

    for (let s = 0; s < stepsPerPattern; s++) {
      const x = KEY_WIDTH + s * STEP_WIDTH - scrollLeft
      if (x < KEY_WIDTH || x > cssWidth) continue

      const isBeat = s % 4 === 0
      ctx.fillStyle = isBeat ? '#c8c6d2' : '#7b7789'
      ctx.fillText(String(s + 1), x + STEP_WIDTH / 2, HEADER_HEIGHT / 2)

      ctx.strokeStyle = isBeat ? '#3f3f4a' : '#2f2f38'
      ctx.beginPath()
      ctx.moveTo(x, HEADER_HEIGHT)
      ctx.lineTo(x, cssHeight)
      ctx.stroke()
    }

    // Draw keys and note rows
    for (let p = LOW_PITCH; p <= HIGH_PITCH; p++) {
      const y = HEADER_HEIGHT + (HIGH_PITCH - p) * NOTE_HEIGHT - scrollTop
      if (y > cssHeight || y + NOTE_HEIGHT < 0) continue

      const black = isBlackKey(p)
      ctx.fillStyle = black ? '#111115' : '#2a2a34'
      ctx.fillRect(0, y, KEY_WIDTH, NOTE_HEIGHT)

      // Octave line / key separator
      ctx.strokeStyle = '#3f3f4a'
      ctx.beginPath()
      ctx.moveTo(0, y + NOTE_HEIGHT)
      ctx.lineTo(cssWidth, y + NOTE_HEIGHT)
      ctx.stroke()

      // C note labels
      if (p % 12 === 0) {
        ctx.fillStyle = '#c8c6d2'
        ctx.textAlign = 'left'
        ctx.fillText(pitchName(p), 6, y + NOTE_HEIGHT / 2)
      }
    }

    // Draw current step playhead
    const playX = KEY_WIDTH + currentStep * STEP_WIDTH - scrollLeft
    ctx.fillStyle = 'rgba(0, 217, 192, 0.25)'
    ctx.fillRect(playX, HEADER_HEIGHT, STEP_WIDTH, cssHeight - HEADER_HEIGHT)
    ctx.strokeStyle = '#00d9c0'
    ctx.beginPath()
    ctx.moveTo(playX, 0)
    ctx.lineTo(playX, cssHeight)
    ctx.stroke()

    // Draw notes
    for (let i = 0; i < track.steps.length; i++) {
      const step = track.steps[i]
      if (!step.on) continue

      const x = KEY_WIDTH + i * STEP_WIDTH - scrollLeft
      const y = HEADER_HEIGHT + (HIGH_PITCH - step.pitch) * NOTE_HEIGHT - scrollTop
      if (x + step.length * STEP_WIDTH < KEY_WIDTH || x > cssWidth) continue
      if (y > cssHeight || y + NOTE_HEIGHT < 0) continue

      const w = step.length * STEP_WIDTH - 2
      const isSelected = selectedStepIndex === i

      ctx.fillStyle = isSelected ? '#00f0d4' : '#00d9c0'
      ctx.fillRect(x + 1, y + 1, w, NOTE_HEIGHT - 2)

      // Resize handle
      ctx.fillStyle = isSelected ? '#ffffff' : '#007a6b'
      ctx.fillRect(x + w - 6, y + 1, 6, NOTE_HEIGHT - 2)

      // Pitch label
      ctx.fillStyle = '#000'
      ctx.textAlign = 'left'
      ctx.font = '10px system-ui, sans-serif'
      if (w > 30) {
        ctx.fillText(pitchName(step.pitch), x + 5, y + NOTE_HEIGHT / 2)
      }
    }
  }

  function eventToCanvasPos(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function posToStepAndPitch(x: number, y: number) {
    const step = Math.floor((x + scrollLeft - KEY_WIDTH) / STEP_WIDTH)
    const pitch = HIGH_PITCH - Math.floor((y + scrollTop - HEADER_HEIGHT) / NOTE_HEIGHT)
    return {
      step: Math.max(0, Math.min(stepsPerPattern - 1, step)),
      pitch: Math.max(LOW_PITCH, Math.min(HIGH_PITCH, pitch)),
    }
  }

  function noteAtPos(x: number, y: number): number {
    const { step, pitch } = posToStepAndPitch(x, y)
    const s = track.steps[step]
    if (!s?.on || s.pitch !== pitch) return -1
    return step
  }

  function isResizeHandle(stepIndex: number, x: number): boolean {
    const noteX = KEY_WIDTH + stepIndex * STEP_WIDTH - scrollLeft
    const w = track.steps[stepIndex].length * STEP_WIDTH - 2
    return x >= noteX + w - 8
  }

  function handleMouseDown(e: MouseEvent) {
    const { x, y } = eventToCanvasPos(e)
    if (x < KEY_WIDTH || y < HEADER_HEIGHT) return

    const stepIndex = noteAtPos(x, y)

    if (stepIndex >= 0) {
      selectedStepIndex = stepIndex
      const resize = isResizeHandle(stepIndex, x)
      dragging = {
        type: resize ? 'resize' : 'move',
        stepIndex,
        startX: x,
        startY: y,
        originalPitch: track.steps[stepIndex].pitch,
        originalStart: stepIndex,
        originalLength: track.steps[stepIndex].length,
      }
    } else {
      // Add a new note
      const { step, pitch } = posToStepAndPitch(x, y)
      const steps = [...track.steps]
      steps[step] = { ...steps[step], on: true, pitch, length: 1, velocity: 100, probability: 1 }
      selectedStepIndex = step
      onChange({ ...track, steps })
      dragging = {
        type: 'move',
        stepIndex: step,
        startX: x,
        startY: y,
        originalPitch: pitch,
        originalStart: step,
        originalLength: 1,
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!dragging) return
    const { x, y } = eventToCanvasPos(e)

    if (dragging.type === 'move') {
      const dx = x - dragging.startX
      const dy = y - dragging.startY
      const stepShift = Math.round(dx / STEP_WIDTH)
      const pitchShift = -Math.round(dy / NOTE_HEIGHT)

      const newStart = Math.max(
        0,
        Math.min(stepsPerPattern - dragging.originalLength, dragging.originalStart + stepShift)
      )
      const newPitch = Math.max(LOW_PITCH, Math.min(HIGH_PITCH, dragging.originalPitch + pitchShift))

      if (newStart !== dragging.stepIndex || track.steps[dragging.stepIndex].pitch !== newPitch) {
        const steps = [...track.steps]
        const note = { ...steps[dragging.stepIndex] }
        // Remove from old position if start changed
        if (newStart !== dragging.stepIndex) {
          steps[dragging.stepIndex] = {
            ...steps[dragging.stepIndex],
            on: false,
            pitch: newPitch,
            length: 1,
          }
        }
        steps[newStart] = { ...note, on: true, pitch: newPitch, length: dragging.originalLength }
        dragging = { ...dragging, stepIndex: newStart }
        onChange({ ...track, steps })
        selectedStepIndex = newStart
      }
    } else if (dragging.type === 'resize') {
      const dx = x - dragging.startX
      const lengthShift = Math.max(1, Math.round(dx / STEP_WIDTH))
      const newLength = Math.max(
        MIN_NOTE_LENGTH,
        Math.min(
          maxNoteLength - dragging.originalStart,
          dragging.originalLength + lengthShift
        )
      )
      if (newLength !== track.steps[dragging.stepIndex].length) {
        const steps = [...track.steps]
        steps[dragging.stepIndex] = { ...steps[dragging.stepIndex], length: newLength }
        onChange({ ...track, steps })
      }
    }
  }

  function handleMouseUp() {
    dragging = null
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault()
    const { x, y } = eventToCanvasPos(e)
    const stepIndex = noteAtPos(x, y)
    if (stepIndex >= 0) {
      const steps = [...track.steps]
      steps[stepIndex] = { ...steps[stepIndex], on: false, length: 1 }
      onChange({ ...track, steps })
      if (selectedStepIndex === stepIndex) selectedStepIndex = -1
    }
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    scrollTop = Math.max(
      0,
      Math.min(totalHeight - container.clientHeight, scrollTop + e.deltaY)
    )
    scrollLeft = Math.max(
      0,
      Math.min(totalWidth - container.clientWidth, scrollLeft + e.deltaX)
    )
  }

  function updateSelectedStep(step: MelodicStep) {
    if (selectedStepIndex < 0) return
    const steps = [...track.steps]
    steps[selectedStepIndex] = step
    onChange({ ...track, steps })
  }
</script>

<div class="piano-roll">
  <div class="roll" bind:this={container}>
    <canvas
      bind:this={canvas}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
      oncontextmenu={handleContextMenu}
      onwheel={handleWheel}
    ></canvas>
  </div>

  {#if selectedStepIndex >= 0 && track.steps[selectedStepIndex]}
    <div class="note-editor">
      <label>
        Pitch
        <input
          type="range"
          min={LOW_PITCH}
          max={HIGH_PITCH}
          value={track.steps[selectedStepIndex].pitch}
          oninput={(e) =>
            updateSelectedStep({
              ...track.steps[selectedStepIndex],
              pitch: parseInt(e.currentTarget.value, 10),
            })}
        />
        <span>{pitchName(track.steps[selectedStepIndex].pitch)}</span>
      </label>
      <label>
        Length
        <input
          type="range"
          min={MIN_NOTE_LENGTH}
          max={maxNoteLength}
          value={track.steps[selectedStepIndex].length}
          oninput={(e) =>
            updateSelectedStep({
              ...track.steps[selectedStepIndex],
              length: parseInt(e.currentTarget.value, 10),
            })}
        />
        <span>{track.steps[selectedStepIndex].length} steps</span>
      </label>
      <label>
        Velocity
        <input
          type="range"
          min="1"
          max="127"
          value={track.steps[selectedStepIndex].velocity}
          oninput={(e) =>
            updateSelectedStep({
              ...track.steps[selectedStepIndex],
              velocity: parseInt(e.currentTarget.value, 10),
            })}
        />
        <span>{track.steps[selectedStepIndex].velocity}</span>
      </label>
      <label>
        Prob
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(track.steps[selectedStepIndex].probability * 100)}
          oninput={(e) =>
            updateSelectedStep({
              ...track.steps[selectedStepIndex],
              probability: parseInt(e.currentTarget.value, 10) / 100,
            })}
        />
        <span>{Math.round(track.steps[selectedStepIndex].probability * 100)}%</span>
      </label>
    </div>
  {/if}
</div>

<style>
  .piano-roll {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .roll {
    height: 240px;
    overflow: hidden;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: crosshair;
  }

  canvas {
    display: block;
  }

  .note-editor {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .note-editor label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
  }

  .note-editor span {
    color: var(--text-h);
    min-width: 64px;
  }
</style>
