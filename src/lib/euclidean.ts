/**
 * Generate a Euclidean rhythm pattern using Bjorklund's algorithm.
 * @param length Total number of steps in the pattern (e.g. 16)
 * @param beats Number of active beats to distribute evenly
 * @param offset Number of steps to rotate the result clockwise
 * @returns Array of booleans, true = hit, false = rest
 */
export function euclidean(length: number, beats: number, offset = 0): boolean[] {
  if (length <= 0) return []
  if (beats <= 0) return Array.from({ length: length }, () => false)
  if (beats >= length) return Array.from({ length: length }, () => true)

  let pattern: boolean[] = []
  let counts: number[] = []
  let remainders: number[] = []

  let divisor = length - beats
  remainders.push(beats)
  let level = 0

  while (true) {
    counts.push(Math.floor(divisor / remainders[level]))
    remainders.push(divisor % remainders[level])
    divisor = remainders[level]
    level += 1
    if (remainders[level] <= 1) break
  }
  counts.push(divisor)

  const build = (level: number): boolean[] => {
    if (level === -1) {
      pattern.push(false)
      return []
    }
    if (level === 0) {
      pattern.push(true)
      return []
    }
    for (let i = 0; i < counts[level]; i++) {
      build(level - 1)
    }
    if (remainders[level] !== 0) {
      build(level - 2)
    }
    return []
  }

  build(level)

  // Trim or pad in case algorithm produced a different length due to edge cases
  while (pattern.length < length) pattern.push(false)
  while (pattern.length > length) pattern.pop()

  if (offset) {
    const r = ((offset % length) + length) % length
    pattern = pattern.slice(-r).concat(pattern.slice(0, -r))
  }

  return pattern
}
