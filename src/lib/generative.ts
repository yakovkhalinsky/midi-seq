import { euclidean } from './euclidean'
import { SCALE_INTERVALS, type MelodicTrack, type RhythmicTrack, type Step } from './types'

/**
 * Apply a Euclidean pattern to a rhythmic track.
 * @param beats Number of active beats in the generated pattern
 * @param length Length of the generated Euclidean pattern; the pattern is tiled across the track
 * @param offset Number of steps to rotate the pattern clockwise
 */
export function applyEuclidean(
  track: RhythmicTrack,
  beats: number,
  length = track.steps.length,
  offset = 0
): RhythmicTrack {
  const pattern = euclidean(length, beats, offset)
  const steps: Step[] = track.steps.map((step, i) => ({
    ...step,
    on: pattern[i % length],
  }))
  return { ...track, steps }
}

/**
 * Mutate a melodic track by randomly toggling some rests into scale-locked pitches.
 * Mutation amount 0-1 controls how many steps are touched.
 */
export function mutateMelodic(track: MelodicTrack, amount: number): MelodicTrack {
  const intervals = SCALE_INTERVALS[track.scaleMode]
  const steps = track.steps.map((step) => {
    if (Math.random() > amount) return step
    const on = Math.random() < 0.5 + amount * 0.3
    if (!on) return { ...step, on: false }

    const intervalIndex = Math.floor(Math.random() * intervals.length)
    const octaveShift = (Math.floor(Math.random() * 3) - 1) * 12 // -12, 0, +12
    const pitch = track.scaleRoot + intervals[intervalIndex] + octaveShift + track.octave * 12

    return {
      ...step,
      on: true,
      pitch: Math.max(0, Math.min(127, pitch)),
      velocity: Math.floor(Math.random() * 60 + 60),
    }
  })
  return { ...track, steps }
}

/**
 * Randomize velocities on active steps for human feel.
 */
export function humanizeVelocities(steps: Step[], amount: number): Step[] {
  return steps.map((step) => {
    if (!step.on) return step
    const delta = Math.round((Math.random() * 2 - 1) * amount * 40)
    return { ...step, velocity: Math.max(1, Math.min(127, step.velocity + delta)) }
  })
}
