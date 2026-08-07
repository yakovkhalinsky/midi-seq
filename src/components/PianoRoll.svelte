<script lang="ts">
  import type { MelodicTrack, MelodicStep } from '../lib/types'

  interface Props {
    track: MelodicTrack
    stepsPerPattern: number
    currentStep: number
    compact?: boolean
    onChange: (track: MelodicTrack) => void
  }

  let { track, stepsPerPattern, currentStep, compact = false, onChange }: Props = $props()

  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const LOW_PITCH = 36 // C2
  const HIGH_PITCH = 84 // C6
  const NOTE_HEIGHT = 18
  const HEADER_HEIGHT = 24
  const KEY_WIDTH = 44
  const BASE_STEP_WIDTH = 48
  const MIN_NOTE_LENGTH = 1
  const MIN_STEP_WIDTH = 20
  const maxNoteLength = $derived(stepsPerPattern)

  let zoom = $state(1)
  let fitToWidth = $state(true)

  let canvas: HTMLCanvasElement
  let container: HTMLDivElement
  let containerWidth = $state(0)
  let scrollTop = $state(0)
  let scrollLeft = $state(0)
  let selectedStepIndex = $state(-1)
  let cursorStep = $state(0)
  let cursorPitch = $state(60)
  let canvasFocused = $state(false)

  let dragging: {
    type: 'move' | 'resize'
    stepIndex: number
    startX: number
    startY: number
    originalPitch: number
    originalStart: number
    originalLength: number
  } | null = $state(null)

  const visibleLowPitch = $derived.by(() => {
    if (!compact) return LOW_PITCH
    const used = track.steps.filter((s) => s.on).map((s) => s.pitch)
    if (used.length === 0) return 48
    const min = Math.min(...used)
    const max = Math.max(...used)
    const center = Math.round((min + max) / 2)
    const span = 12
    return Math.max(LOW_PITCH, Math.min(HIGH_PITCH - span + 1, center - Math.floor(span / 2)))
  })

  const visibleHighPitch = $derived.by(() => {
    if (!compact) return HIGH_PITCH
    return Math.min(HIGH_PITCH, visibleLowPitch + 12 - 1)
  })

  const STEP_WIDTH = $derived(
    fitToWidth && containerWidth > 0
      ? Math.max(MIN_STEP_WIDTH, (containerWidth - KEY_WIDTH) / stepsPerPattern)
      : Math.max(MIN_STEP_WIDTH, BASE_STEP_WIDTH * zoom)
  )

  const totalWidth = $derived(KEY_WIDTH + stepsPerPattern * STEP_WIDTH)
  const totalHeight = $derived(
    HEADER_HEIGHT + (visibleHighPitch - visibleLowPitch + 1) * NOTE_HEIGHT
  )

  $effect(() => {
    if (!container) return
    const cssHeight = container.clientHeight
    const cssWidth = container.clientWidth
    scrollTop = Math.max(0, Math.min(totalHeight - cssHeight, scrollTop))
    scrollLeft = Math.max(0, Math.min(totalWidth - cssWidth, scrollLeft))
  })

  $effect(() => {
    if (!container) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          containerWidth = entry.contentRect.width
        }
      }
    })
    resizeObserver.observe(container)
    containerWidth = container.clientWidth
    return () => resizeObserver.disconnect()
  })

  $effect(() => {
    track
    currentStep
    scrollTop
    scrollLeft
    selectedStepIndex
    containerWidth
    zoom
    fitToWidth
    compact
    canvasFocused
    cursorStep
    cursorPitch
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
    if (!ctx || !container) return

    const dpr = window.devicePixelRatio || 1
    const cssWidth = container.clientWidth
    const cssHeight = container.clientHeight

    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const low = visibleLowPitch
    const high = visibleHighPitch

    ctx.clearRect(0, 0, cssWidth, cssHeight)

    ctx.fillStyle = '#1a1a20'
    ctx.fillRect(0, 0, cssWidth, cssHeight)

    ctx.fillStyle = '#22222a'
    ctx.fillRect(0, 0, cssWidth, HEADER_HEIGHT)

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

    for (let p = low; p <= high; p++) {
      const y = HEADER_HEIGHT + (high - p) * NOTE_HEIGHT - scrollTop
      if (y > cssHeight || y + NOTE_HEIGHT < 0) continue

      const black = isBlackKey(p)
      ctx.fillStyle = black ? '#111115' : '#2a2a34'
      ctx.fillRect(0, y, KEY_WIDTH, NOTE_HEIGHT)

      ctx.strokeStyle = '#3f3f4a'
      ctx.beginPath()
      ctx.moveTo(0, y + NOTE_HEIGHT)
      ctx.lineTo(cssWidth, y + NOTE_HEIGHT)
      ctx.stroke()

      if (p % 12 === 0) {
        ctx.fillStyle = '#c8c6d2'
        ctx.textAlign = 'left'
        ctx.fillText(pitchName(p), 6, y + NOTE_HEIGHT / 2)
      }
    }

    const playX = KEY_WIDTH + currentStep * STEP_WIDTH - scrollLeft
    ctx.fillStyle = 'rgba(0, 217, 192, 0.25)'
    ctx.fillRect(playX, HEADER_HEIGHT, STEP_WIDTH, cssHeight - HEADER_HEIGHT)
    ctx.strokeStyle = '#00d9c0'
    ctx.beginPath()
    ctx.moveTo(playX, 0)
    ctx.lineTo(playX, cssHeight)
    ctx.stroke()

    for (let i = 0; i < track.steps.length; i++) {
      const step = track.steps[i]
      if (!step.on) continue
      if (step.pitch < low || step.pitch > high) continue

      const x = KEY_WIDTH + i * STEP_WIDTH - scrollLeft
      const y = HEADER_HEIGHT + (high - step.pitch) * NOTE_HEIGHT - scrollTop
      if (x + step.length * STEP_WIDTH < KEY_WIDTH || x > cssWidth) continue
      if (y > cssHeight || y + NOTE_HEIGHT < 0) continue

      const w = step.length * STEP_WIDTH - 2
      const isSelected = selectedStepIndex === i

      ctx.fillStyle = isSelected ? '#00f0d4' : '#00d9c0'
      ctx.fillRect(x + 1, y + 1, Math.max(2, w), NOTE_HEIGHT - 2)

      ctx.fillStyle = isSelected ? '#ffffff' : '#007a6b'
      ctx.fillRect(x + Math.max(2, w) - 6, y + 1, 6, NOTE_HEIGHT - 2)

      ctx.fillStyle = '#000'
      ctx.textAlign = 'left'
      ctx.font = '10px system-ui, sans-serif'
      if (w > 30) {
        ctx.fillText(pitchName(step.pitch), x + 5, y + NOTE_HEIGHT / 2)
      }
    }

    // Draw keyboard cursor when focused
    if (canvasFocused && selectedStepIndex < 0) {
      const cx = KEY_WIDTH + cursorStep * STEP_WIDTH - scrollLeft
      const cy = HEADER_HEIGHT + (high - cursorPitch) * NOTE_HEIGHT - scrollTop
      if (cx + STEP_WIDTH >= KEY_WIDTH && cx <= cssWidth && cy + NOTE_HEIGHT >= 0 && cy <= cssHeight) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.strokeRect(cx + 1, cy + 1, STEP_WIDTH - 2, NOTE_HEIGHT - 2)
        ctx.lineWidth = 1
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
    const high = visibleHighPitch
    const low = visibleLowPitch
    const step = Math.floor((x + scrollLeft - KEY_WIDTH) / STEP_WIDTH)
    const pitch = high - Math.floor((y + scrollTop - HEADER_HEIGHT) / NOTE_HEIGHT)
    return {
      step: Math.max(0, Math.min(stepsPerPattern - 1, step)),
      pitch: Math.max(low, Math.min(high, pitch)),
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
      const newPitch = Math.max(
        visibleLowPitch,
        Math.min(visibleHighPitch, dragging.originalPitch + pitchShift)
      )

      if (newStart !== dragging.stepIndex || track.steps[dragging.stepIndex].pitch !== newPitch) {
        const steps = [...track.steps]
        const note = { ...steps[dragging.stepIndex] }
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
        Math.min(maxNoteLength - dragging.originalStart, dragging.originalLength + lengthShift)
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
    if (!container) return
    const cssHeight = container.clientHeight
    scrollTop = Math.max(0, Math.min(totalHeight - cssHeight, scrollTop + e.deltaY))
    scrollLeft = Math.max(0, Math.min(totalWidth - container.clientWidth, scrollLeft + e.deltaX))
  }

  function ensureCursorVisible() {
    const x = KEY_WIDTH + cursorStep * STEP_WIDTH - scrollLeft
    const y = HEADER_HEIGHT + (visibleHighPitch - cursorPitch) * NOTE_HEIGHT - scrollTop
    const cssWidth = container?.clientWidth || 0
    const cssHeight = container?.clientHeight || 0
    if (x < KEY_WIDTH + 10 || x > cssWidth - STEP_WIDTH - 10) {
      scrollLeft = Math.max(0, KEY_WIDTH + cursorStep * STEP_WIDTH - cssWidth / 2)
    }
    if (y < HEADER_HEIGHT + 10 || y > cssHeight - NOTE_HEIGHT - 10) {
      scrollTop = Math.max(0, HEADER_HEIGHT + (visibleHighPitch - cursorPitch) * NOTE_HEIGHT - cssHeight / 2)
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    const step = selectedStepIndex >= 0 ? selectedStepIndex : cursorStep
    const pitch = selectedStepIndex >= 0 ? track.steps[selectedStepIndex].pitch : cursorPitch
    const existing = track.steps[step]

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (e.shiftKey && selectedStepIndex >= 0) {
        const newLength = Math.max(MIN_NOTE_LENGTH, existing.length - 1)
        updateSelectedStep({ ...existing, length: newLength })
      } else {
        cursorStep = Math.max(0, step - 1)
        cursorPitch = pitch
        const s = track.steps[cursorStep]
        selectedStepIndex = s?.on ? cursorStep : -1
        ensureCursorVisible()
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (e.shiftKey && selectedStepIndex >= 0) {
        const newLength = Math.min(maxNoteLength - step, existing.length + 1)
        updateSelectedStep({ ...existing, length: newLength })
      } else {
        cursorStep = Math.min(stepsPerPattern - 1, step + 1)
        cursorPitch = pitch
        const s = track.steps[cursorStep]
        selectedStepIndex = s?.on ? cursorStep : -1
        ensureCursorVisible()
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (selectedStepIndex >= 0) {
        const newPitch = Math.min(visibleHighPitch, existing.pitch + 1)
        updateSelectedStep({ ...existing, pitch: newPitch })
      } else {
        cursorPitch = Math.min(visibleHighPitch, pitch + 1)
        ensureCursorVisible()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (selectedStepIndex >= 0) {
        const newPitch = Math.max(visibleLowPitch, existing.pitch - 1)
        updateSelectedStep({ ...existing, pitch: newPitch })
      } else {
        cursorPitch = Math.max(visibleLowPitch, pitch - 1)
        ensureCursorVisible()
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (selectedStepIndex >= 0) {
        const steps = [...track.steps]
        steps[selectedStepIndex] = { ...steps[selectedStepIndex], on: false, length: 1 }
        onChange({ ...track, steps })
        selectedStepIndex = -1
      } else {
        const steps = [...track.steps]
        steps[cursorStep] = {
          ...steps[cursorStep],
          on: true,
          pitch: cursorPitch,
          length: 1,
          velocity: 100,
          probability: 1,
        }
        onChange({ ...track, steps })
        selectedStepIndex = cursorStep
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      if (selectedStepIndex >= 0) {
        const steps = [...track.steps]
        steps[selectedStepIndex] = { ...steps[selectedStepIndex], on: false, length: 1 }
        onChange({ ...track, steps })
        selectedStepIndex = -1
      }
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      if (selectedStepIndex >= 0) {
        const newLength = Math.min(maxNoteLength - step, existing.length + 1)
        updateSelectedStep({ ...existing, length: newLength })
      }
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      if (selectedStepIndex >= 0) {
        const newLength = Math.max(MIN_NOTE_LENGTH, existing.length - 1)
        updateSelectedStep({ ...existing, length: newLength })
      }
    } else if (e.key === 'Escape') {
      selectedStepIndex = -1
    }
  }

  function updateSelectedStep(step: MelodicStep) {
    if (selectedStepIndex < 0) return
    const steps = [...track.steps]
    steps[selectedStepIndex] = step
    onChange({ ...track, steps })
  }

  function setZoom(next: number) {
    zoom = Math.max(0.5, Math.min(3, next))
    if (zoom !== 1) fitToWidth = false
  }

  function toggleFit() {
    fitToWidth = !fitToWidth
  }
</script>

<div class="piano-roll" class:compact>
  <div class="toolbar">
    <label class="fit-toggle">
      <input type="checkbox" checked={fitToWidth} onchange={toggleFit} />
      Fit
    </label>
    <div class="zoom-group" class:disabled={fitToWidth}>
      <button onclick={() => setZoom(zoom - 0.25)} aria-label="Zoom out">−</button>
      <input
        type="range"
        min="0.5"
        max="3"
        step="0.25"
        value={zoom}
        disabled={fitToWidth}
        oninput={(e) => setZoom(parseFloat(e.currentTarget.value))}
      />
      <button onclick={() => setZoom(zoom + 0.25)} aria-label="Zoom in">+</button>
      <span>{Math.round(zoom * 100)}%</span>
    </div>
  </div>

  <div class="roll" bind:this={container} class:compact>
    <canvas
      bind:this={canvas}
      tabindex="0"
      aria-label="Piano roll editor. Use arrow keys to move, Enter or Space to toggle a note, Delete to remove, Shift plus arrows to resize."
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
      oncontextmenu={handleContextMenu}
      onwheel={handleWheel}
      onkeydown={handleKeyDown}
      onfocus={() => (canvasFocused = true)}
      onblur={() => (canvasFocused = false)}
    ></canvas>
  </div>

  {#if selectedStepIndex >= 0 && track.steps[selectedStepIndex]}
    <div class="note-editor">
      <label>
        Pitch
        <input
          type="range"
          min={visibleLowPitch}
          max={visibleHighPitch}
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

  .toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .fit-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    user-select: none;
  }

  .zoom-group {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
  }

  .zoom-group.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .zoom-group input[type='range'] {
    width: 100px;
  }

  .zoom-group span {
    min-width: 40px;
    color: var(--text-h);
  }

  .roll {
    height: 360px;
    overflow: hidden;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: crosshair;
  }

  .roll.compact {
    height: 180px;
  }

  canvas {
    display: block;
  }

  canvas:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    border-radius: 4px;
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
