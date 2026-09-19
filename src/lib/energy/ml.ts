/**
 * In-browser machine learning (pure TypeScript).
 *
 * These are real, lightweight implementations of Random Forest regression and
 * Isolation Forest, trained on the imported dataset in the browser. They are
 * intentionally separate from the "Demo Prediction" / "Dataset Anomaly"
 * columns that ship inside the Excel file. If a Python/Scikit-learn backend is
 * connected later, this module can be swapped for API calls returning the same
 * result shapes.
 */
import type { ServerRecord } from "./types";

export const FEATURES = ["cpu", "memory", "disk", "network"] as const;
export type FeatureKey = (typeof FEATURES)[number];

// Deterministic PRNG so results are reproducible across runs.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- Random Forest Regression ---------------- */

type Node =
  | { leaf: true; value: number }
  | { leaf: false; feature: number; threshold: number; left: Node; right: Node };

function buildTree(X: number[][], y: number[], idx: number[], depth: number, rnd: () => number, maxDepth: number, minLeaf: number, nFeat: number): Node {
  const mean = idx.reduce((a, i) => a + y[i]!, 0) / idx.length;
  if (depth >= maxDepth || idx.length < minLeaf * 2) return { leaf: true, value: mean };

  const featIdx = X[0]!.map((_, i) => i).sort(() => rnd() - 0.5).slice(0, nFeat);
  let best: { f: number; th: number; score: number; L: number[]; R: number[] } | null = null;
  const baseSSE = idx.reduce((a, i) => a + (y[i]! - mean) ** 2, 0);

  for (const f of featIdx) {
    const sorted = [...idx].sort((a, b) => X[a]![f]! - X[b]![f]!);
    for (let s = minLeaf; s <= sorted.length - minLeaf; s++) {
      if (X[sorted[s - 1]!]![f] === X[sorted[s]!]![f]) continue;
      const L = sorted.slice(0, s);
      const R = sorted.slice(s);
      const mL = L.reduce((a, i) => a + y[i]!, 0) / L.length;
      const mR = R.reduce((a, i) => a + y[i]!, 0) / R.length;
      const sse = L.reduce((a, i) => a + (y[i]! - mL) ** 2, 0) + R.reduce((a, i) => a + (y[i]! - mR) ** 2, 0);
      if (!best || sse < best.score) best = { f, th: (X[sorted[s - 1]!]![f]! + X[sorted[s]!]![f]!) / 2, score: sse, L, R };
    }
  }
  if (!best || best.score >= baseSSE) return { leaf: true, value: mean };
  return {
    leaf: false,
    feature: best.f,
    threshold: best.th,
    left: buildTree(X, y, best.L, depth + 1, rnd, maxDepth, minLeaf, nFeat),
    right: buildTree(X, y, best.R, depth + 1, rnd, maxDepth, minLeaf, nFeat),
  };
}

function predictTree(node: Node, x: number[]): number {
  while (!node.leaf) node = x[node.feature]! <= node.threshold ? node.left : node.right;
  return node.value;
}

export interface RandomForestModel {
  kind: "random_forest";
  trees: Node[];
  features: readonly FeatureKey[];
  metrics: { r2: number; mae: number; rmse: number; trainSize: number; testSize: number };
  trainedAt: Date;
}

export const toFeatures = (r: ServerRecord) => FEATURES.map((f) => r[f]);

export function trainRandomForest(records: ServerRecord[], opts = { nTrees: 60, maxDepth: 8, minLeaf: 2, seed: 42 }): RandomForestModel {
  if (records.length < 10) throw new Error("At least 10 records are required to train a model.");
  const rnd = mulberry32(opts.seed);
  const shuffled = [...records].sort(() => rnd() - 0.5);
  const split = Math.max(5, Math.floor(shuffled.length * 0.8));
  const train = shuffled.slice(0, split);
  const test = shuffled.slice(split);
  const X = train.map(toFeatures);
  const y = train.map((r) => r.power);
  const nFeat = Math.max(1, Math.round(Math.sqrt(FEATURES.length)) + 1);

  const trees: Node[] = [];
  for (let t = 0; t < opts.nTrees; t++) {
    const idx = Array.from({ length: X.length }, () => Math.floor(rnd() * X.length)); // bootstrap
    trees.push(buildTree(X, y, idx, 0, rnd, opts.maxDepth, opts.minLeaf, nFeat));
  }
  const model: RandomForestModel = {
    kind: "random_forest",
    trees,
    features: FEATURES,
    metrics: { r2: 0, mae: 0, rmse: 0, trainSize: train.length, testSize: test.length },
    trainedAt: new Date(),
  };
  const evalSet = test.length >= 3 ? test : train;
  const preds = evalSet.map((r) => predictPower(model, r));
  const actual = evalSet.map((r) => r.power);
  const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
  const ssRes = actual.reduce((a, v, i) => a + (v - preds[i]!) ** 2, 0);
  const ssTot = actual.reduce((a, v) => a + (v - mean) ** 2, 0);
  model.metrics.r2 = ssTot ? 1 - ssRes / ssTot : 0;
  model.metrics.mae = actual.reduce((a, v, i) => a + Math.abs(v - preds[i]!), 0) / actual.length;
  model.metrics.rmse = Math.sqrt(ssRes / actual.length);
  return model;
}

export function predictPower(model: RandomForestModel, r: Pick<ServerRecord, FeatureKey>) {
  const x = FEATURES.map((f) => r[f]);
  return model.trees.reduce((a, t) => a + predictTree(t, x), 0) / model.trees.length;
}

/* ---------------- Isolation Forest ---------------- */

type INode =
  | { leaf: true; size: number }
  | { leaf: false; feature: number; split: number; left: INode; right: INode };

const c = (n: number) => (n <= 1 ? 0 : 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n);

function buildITree(X: number[][], idx: number[], depth: number, limit: number, rnd: () => number): INode {
  if (depth >= limit || idx.length <= 1) return { leaf: true, size: idx.length };
  const f = Math.floor(rnd() * X[0]!.length);
  const vals = idx.map((i) => X[i]![f]!);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  if (lo === hi) return { leaf: true, size: idx.length };
  const split = lo + rnd() * (hi - lo);
  const L = idx.filter((i) => X[i]![f]! < split);
  const R = idx.filter((i) => X[i]![f]! >= split);
  return { leaf: false, feature: f, split, left: buildITree(X, L, depth + 1, limit, rnd), right: buildITree(X, R, depth + 1, limit, rnd) };
}

function pathLength(node: INode, x: number[], depth = 0): number {
  if (node.leaf) return depth + c(node.size);
  return pathLength(x[node.feature]! < node.split ? node.left : node.right, x, depth + 1);
}

export interface IsolationForestModel {
  kind: "isolation_forest";
  trees: INode[];
  sampleSize: number;
  threshold: number;
  contamination: number;
  trainedAt: Date;
}

const anomalyFeatures = (r: ServerRecord) => [r.cpu, r.memory, r.disk, r.network, r.power];

export function trainIsolationForest(records: ServerRecord[], opts = { nTrees: 100, sampleSize: 64, contamination: 0.05, seed: 7 }): IsolationForestModel {
  if (records.length < 10) throw new Error("At least 10 records are required for anomaly detection.");
  const rnd = mulberry32(opts.seed);
  const X = records.map(anomalyFeatures);
  const sampleSize = Math.min(opts.sampleSize, X.length);
  const limit = Math.ceil(Math.log2(sampleSize));
  const trees: INode[] = [];
  for (let t = 0; t < opts.nTrees; t++) {
    const idx = [...X.keys()].sort(() => rnd() - 0.5).slice(0, sampleSize);
    trees.push(buildITree(X, idx, 0, limit, rnd));
  }
  const model: IsolationForestModel = { kind: "isolation_forest", trees, sampleSize, threshold: 0.5, contamination: opts.contamination, trainedAt: new Date() };
  const scores = records.map((r) => anomalyScore(model, r)).sort((a, b) => b - a);
  const k = Math.max(1, Math.round(records.length * opts.contamination));
  model.threshold = Math.max(0.5, scores[k - 1] ?? 0.5);
  return model;
}

export function anomalyScore(model: IsolationForestModel, r: ServerRecord) {
  const x = anomalyFeatures(r);
  const avgPath = model.trees.reduce((a, t) => a + pathLength(t, x), 0) / model.trees.length;
  return Math.pow(2, -avgPath / c(model.sampleSize));
}

export function isMlAnomaly(model: IsolationForestModel, r: ServerRecord) {
  return anomalyScore(model, r) >= model.threshold;
}
