/**
 * One well pad, as designed by the client:
 *   wellhead → colloidal conductor casing (~12 % of the depth) → ring of ten reserve slots →
 *   a tight bundle of branches that peels off in a fountain, the outer ones flaring wide and stopping at
 *   ~63 % of the depth, the inner ones running deepest to ~93 % → a motherbore probe down the middle.
 *
 * "Branches 4 → 10": a pad starts with four active branches; the other six slots are sealed until the
 * pad grows, each one deeper into hotter rock. A full pad is 6 production + 4 injection branches.
 *
 * Pure data — shared by the 3D scenes (DescentScene, CampusScene, walkthrough) and the 2D anatomy diagram.
 * Everything is normalised: depth fractions are of the total depth, lateral fractions of the maximum reach.
 * Schematic only, not to engineering scale.
 */

export const PAD = {
  /** Branches per pad */
  branches: 10,
  /** Branches that are open on day one */
  initial: 4,
  production: 6,
  injection: 4,
  /** Where the conductor casing ends and the reserve-slot ring sits, as a fraction of the total depth */
  casing: 0.12,
  /** Outer branches stop here … */
  outerEnd: 0.63,
  /** … and the innermost branch runs to here */
  innerEnd: 0.93,
};

export type PadBranch = {
  /** Order in which the slots are opened (0 is drilled first) */
  rank: number;
  role: "production" | "injection";
  /** True for the four branches that are open from the start; the rest start sealed */
  initial: boolean;
  /** Azimuth around the well, radians */
  az: number;
  /** Lateral reach, 0..1 of the maximum */
  reach: number;
  /** Depth of the branch tip, 0..1 of the total depth */
  tip: number;
  /** Where the branch leaves the bundle, 0..1 of its own length */
  peel: number;
  /** Side for a cross-section view (-1 left, +1 right) and its lateral reach, 0..1 */
  side: -1 | 1;
  reach2d: number;
};

const TAU = Math.PI * 2;
const GOLDEN = 2.399963;
/** Injection ranks: 1, 3 (open from day one, so the first four make a working loop) then 6 and 8 */
const INJECTION = new Set([1, 3, 6, 8]);

export const PAD_BRANCHES: PadBranch[] = Array.from({ length: PAD.branches }, (_, rank) => {
  const t = rank / (PAD.branches - 1);
  return {
    rank,
    role: INJECTION.has(rank) ? "injection" : "production",
    initial: rank < PAD.initial,
    az: (rank * GOLDEN + 0.35) % TAU,
    // the outer branches flare widest; the inner ones stay close to the axis and go deepest
    reach: 1 - t * 0.64,
    tip: PAD.outerEnd + (PAD.innerEnd - PAD.outerEnd) * t,
    peel: 0.05 + t * 0.2,
    side: rank % 2 === 0 ? -1 : 1,
    reach2d: 1 - Math.floor(rank / 2) * 0.17,
  } as PadBranch;
});

/**
 * Centre line of one branch as [lateral, depth] pairs, both 0..1 of the branch's own reach and tip depth:
 * a vertical run in the bundle, then a smooth curve outward — a fountain, or a tulip.
 */
export function branchProfile(branch: PadBranch, samples = 22): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k <= samples; k += 1) {
    const s = k / samples;
    const q = Math.max(0, s - branch.peel) / (1 - branch.peel);
    out.push([Math.pow(q, 1.55), s]);
  }
  return out;
}

/** A branch as a polyline in a 2D cross-section, in the caller's pixel space. */
export function branchPath2D(
  branch: PadBranch,
  o: { x0: number; yKick: number; yTD: number; maxReach: number },
): [number, number][] {
  const hole = o.yTD - o.yKick;
  return branchProfile(branch).map(([u, s]) => [o.x0 + branch.side * branch.reach2d * u * o.maxReach, o.yKick + s * (branch.tip - PAD.casing) / (1 - PAD.casing) * hole]);
}

/** Smooth SVG path (Catmull-Rom to cubic Bézier) through a polyline. */
export function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  const f = (n: number) => Math.round(n * 100) / 100;
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
