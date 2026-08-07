/**
 * Generate a Euclidean rhythm pattern using Bjorklund's algorithm.
 * @param steps Total number of steps in the pattern (e.g. 16)
 * @param hits Number of active hits to distribute evenly
 * @param rotate Number of steps to rotate the result clockwise
 * @returns Array of booleans, true = hit, false = rest
 */
export function euclidean(steps: number, hits: number, rotate = 0): boolean[] {
  if (steps <= 0) return []
  if (hits <= 0) return Array.from({ length: steps }, () => false)
  if (hits >= steps) return Array.from({ length: steps }, () => true)

  let pattern: boolean[] = []
  let counts: number[] = []
  let remainders: number[] = []

  let divisor = steps - hits
  remainders.push(hits)
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
  while (pattern.length < steps) pattern.push(false)
  while (pattern.length > steps) pattern.pop()

  if (rotate) {
    const r = ((rotate % steps) + steps) % steps
    pattern = pattern.slice(-r).concat(pattern.slice(0, -r))
  }

  return pattern
}
