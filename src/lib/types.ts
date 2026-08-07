export type TrackType = 'melodic' | 'rhythmic'

export interface Step {
  on: boolean
  velocity: number // 0-127
  probability: number // 0-1
}

export interface MelodicStep extends Step {
  pitch: number // MIDI note number, 0-127
  length: number // in steps
}

export interface Track {
  id: string
  name: string
  type: TrackType
  midiChannel: number // 1-16
  steps: Step[]
  muted: boolean
  solo: boolean
  volume: number // 0-1
}

export interface MelodicTrack extends Track {
  type: 'melodic'
  steps: MelodicStep[]
  scaleRoot: number
  scaleMode: ScaleMode
  octave: number
}

export interface RhythmicTrack extends Track {
  type: 'rhythmic'
  steps: Step[]
}

export type ScaleMode =
  | 'chromatic'
  | 'major'
  | 'minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'locrian'
  | 'pentatonic-major'
  | 'pentatonic-minor'
  | 'blues'

export interface Pattern {
  id: string
  name: string
  tracks: Track[]
  collapsedTracks?: Record<string, boolean>
}

export interface SongSlot {
  patternId: string
  repeats: number
}

export interface Project {
  bpm: number
  swing: number // 0-1
  stepsPerPattern: number
  patterns: Pattern[]
  selectedPatternId: string
  song: SongSlot[]
  playMode: 'loop' | 'song'
  midiClock: boolean
  sidePanelTab: 'song' | 'midi' | null
}

export const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
}

export function createEmptySteps(count: number): Step[] {
  return Array.from({ length: count }, () => ({
    on: false,
    velocity: 100,
    probability: 1,
  }))
}

export function createMelodicSteps(count: number, basePitch: number): MelodicStep[] {
  return Array.from({ length: count }, () => ({
    on: false,
    velocity: 100,
    probability: 1,
    pitch: basePitch,
    length: 1,
  }))
}

export function createDefaultTracks(steps: number): Track[] {
  return [
    {
      id: 'mel-1',
      name: 'Melody A',
      type: 'melodic',
      midiChannel: 1,
      steps: createMelodicSteps(steps, 60),
      muted: false,
      solo: false,
      volume: 0.8,
      scaleRoot: 60,
      scaleMode: 'minor',
      octave: 0,
    } as MelodicTrack,
    {
      id: 'mel-2',
      name: 'Melody B',
      type: 'melodic',
      midiChannel: 2,
      steps: createMelodicSteps(steps, 62),
      muted: false,
      solo: false,
      volume: 0.8,
      scaleRoot: 60,
      scaleMode: 'minor',
      octave: 0,
    } as MelodicTrack,
    {
      id: 'rhy-1',
      name: 'Kick',
      type: 'rhythmic',
      midiChannel: 3,
      steps: createEmptySteps(steps),
      muted: false,
      solo: false,
      volume: 0.9,
    },
    {
      id: 'rhy-2',
      name: 'Snare',
      type: 'rhythmic',
      midiChannel: 4,
      steps: createEmptySteps(steps),
      muted: false,
      solo: false,
      volume: 0.9,
    },
    {
      id: 'rhy-3',
      name: 'Hi-hat',
      type: 'rhythmic',
      midiChannel: 5,
      steps: createEmptySteps(steps),
      muted: false,
      solo: false,
      volume: 0.7,
    },
    {
      id: 'rhy-4',
      name: 'Perc',
      type: 'rhythmic',
      midiChannel: 6,
      steps: createEmptySteps(steps),
      muted: false,
      solo: false,
      volume: 0.7,
    },
  ]
}

export function createDefaultPattern(id: string, name: string, steps: number): Pattern {
  return {
    id,
    name,
    tracks: createDefaultTracks(steps),
  }
}

const PATTERN_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export function createDefaultProject(): Project {
  const steps = 16
  return {
    bpm: 120,
    swing: 0,
    stepsPerPattern: steps,
    patterns: PATTERN_NAMES.map((name) => createDefaultPattern(name, name, steps)),
    selectedPatternId: 'A',
    song: [
      { patternId: 'A', repeats: 2 },
      { patternId: 'B', repeats: 2 },
    ],
    playMode: 'loop',
    midiClock: false,
    sidePanelTab: null,
  }
}

export function getSelectedPattern(project: Project): Pattern {
  return project.patterns.find((p) => p.id === project.selectedPatternId) ?? project.patterns[0]
}

export function updatePattern(project: Project, pattern: Pattern): Project {
  return {
    ...project,
    patterns: project.patterns.map((p) => (p.id === pattern.id ? pattern : p)),
  }
}

export function setTrackCollapsed(
  project: Project,
  patternId: string,
  trackId: string,
  collapsed: boolean
): Project {
  return {
    ...project,
    patterns: project.patterns.map((p) => {
      if (p.id !== patternId) return p
      return {
        ...p,
        collapsedTracks: { ...p.collapsedTracks, [trackId]: collapsed },
      }
    }),
  }
}

export function duplicatePattern(project: Project, sourceId: string, targetId: string): Project {
  const source = project.patterns.find((p) => p.id === sourceId)
  if (!source) return project
  return {
    ...project,
    patterns: project.patterns.map((p) =>
      p.id === targetId
        ? {
            ...source,
            id: targetId,
            name: targetId,
            tracks: source.tracks.map((t) => ({ ...t, steps: t.steps.map((s) => ({ ...s })) })),
          }
        : p
    ),
  }
}
