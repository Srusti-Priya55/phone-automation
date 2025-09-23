// Adds a unique suffix to every "describe" title so Allure treats
// the same spec executed in different flows as different tests.
export const FLOW_SUFFIX = process.env.CURRENT_FLOW
  ? ` — ${process.env.CURRENT_FLOW}`   // e.g. " — Aggregation Check"
  : '';
