// ---------------------------------------------------------------------------
// The shape of src/data/training-losses.json.
//
// Both charts import these types, and the generator script
// (src/data/make-training-losses.mjs) is written to produce exactly this
// shape. If you swap in real experiment data, matching these interfaces is
// all the charts require.
// ---------------------------------------------------------------------------

/** One measured (or simulated) point on a loss curve. */
export interface LossPoint {
  /** Optimiser step. */
  step: number;
  /** Cross-entropy loss in nats/token. */
  loss: number;
}

/** One learning-rate run: a full curve plus enough metadata to draw it. */
export interface LossSeries {
  /** Learning rate as a number, e.g. 0.003. */
  lr: number;
  /** Compact display label, e.g. "3e-3". */
  label: string;
  /** Which colour to use: an index into --chart-1 / --chart-2 / --chart-3. */
  colorIndex: number;
  /** True when the curve shows large step-to-step jumps. */
  unstable: boolean;
  points: LossPoint[];
}

/** End-of-run and best loss for one learning rate. Drives the second chart. */
export interface LossSummary {
  lr: number;
  label: string;
  colorIndex: number;
  /** Loss at the final step. */
  finalLoss: number;
  /** Lowest loss reached at any step. */
  bestLoss: number;
  unstable: boolean;
}

export interface TrainingLossMeta {
  description: string;
  steps: number;
  unit: string;
}

export interface TrainingLossData {
  meta: TrainingLossMeta;
  series: LossSeries[];
  summary: LossSummary[];
}