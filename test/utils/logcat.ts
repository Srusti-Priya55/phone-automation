// test/utils/logcat.ts
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import allure from '@wdio/allure-reporter'

const exec = promisify(_exec)

export async function dumpNvmLogs(maxLines = 2000) {
  try {
    // Dump logcat with timestamps
    const { stdout } = await exec(`adb logcat -v time -d`)
    const lines = stdout.split(/\r?\n/)

    // Only keep nvmagent lines
    const filtered = lines.filter(l => /nvmagent/i.test(l)).slice(-maxLines).join('\n')

    if (filtered.trim().length > 0) {
      allure.addAttachment('NVM logcat', Buffer.from(filtered), 'text/plain')
    }

    // Clear buffer for fresh logs next time
    await exec(`adb logcat -c`).catch(() => {})
  } catch {
    // ignore failures
  }
}
