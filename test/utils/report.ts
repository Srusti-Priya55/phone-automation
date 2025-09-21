// test/utils/report.ts
import allure from '@wdio/allure-reporter'
import { Status } from 'allure-js-commons'
import { driver } from '@wdio/globals'

/** convenience labels */
export function feature(name: string)  { allure.addFeature(name) }
export function story(name: string)    { allure.addStory(name) }
export function severity(level: 'blocker'|'critical'|'normal'|'minor'|'trivial') {
  allure.addSeverity(level)
}

/** used by wdio.conf afterTest on failures */
export async function attachScreenshot(name: string) {
  try {
    const b64 = await driver.takeScreenshot()
    allure.addAttachment(name, Buffer.from(b64, 'base64'), 'image/png')
  } catch { /* ignore */ }
}

/**
 * Step wrapper with retry-on-failure.
 *
 * - Tries once.
 * - If the body throws: wait, then retry (up to maxRetries).
 * - If it succeeds on any attempt: returns immediately (NO extra retries).
 * - If all attempts fail: attaches screenshots and rethrows.
 *
 * Defaults:
 *   STEP_RETRIES (env)          → number of extra tries (default 1)
 *   STEP_RETRY_DELAY_MS (env)   → wait between tries in ms (default 2000)
 *
 * You can override per step: step('title', fn, 3, 1000)
 */
export async function step<T>(
  title: string,
  body: () => Promise<T>,
  retriesParam?: number,
  delayParam?: number
): Promise<T> {
  const maxRetries =
    typeof retriesParam === 'number'
      ? retriesParam
      : Number(process.env.STEP_RETRIES ?? 1)

  const delayMs =
    typeof delayParam === 'number'
      ? delayParam
      : Number(process.env.STEP_RETRY_DELAY_MS ?? 2000)

  let lastErr: any

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const label = maxRetries ? `${title} (attempt ${attempt})` : title
    allure.startStep(label)
    try {
      const out = await body()
      allure.endStep(Status.PASSED)
      return out                          // ✅ success → NO more retries
    } catch (err) {
      lastErr = err
      await attachScreenshot(`${title} (failed attempt ${attempt})`)
      allure.endStep(Status.FAILED)

      if (attempt <= maxRetries) {
        await new Promise(res => setTimeout(res, delayMs)) // wait then retry
        continue
      }
      // all attempts failed
      throw lastErr
    }
  }
  // TS happiness
  throw lastErr
}
