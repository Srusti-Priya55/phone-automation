// test/utils/flow.ts
import allure from '@wdio/allure-reporter'

/**
 * Call this at the top of each spec's `before()` to shape the Allure tree:
 *   parentSuite = CURRENT_FLOW (Aggregation / TND / Negatives)
 *   suite       = Section name (Install via ADB, Add ASA, ...)
 * Do NOT set subSuite anywhere to avoid nested “folder inside folder”.
 */
export function labelSection(sectionName: string) {
  const flow = process.env.CURRENT_FLOW || 'Adhoc'
  allure.addLabel('parentSuite', flow)
  allure.addLabel('suite', sectionName)
}