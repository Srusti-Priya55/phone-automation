// test/utils/android-logs.ts
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import allure from '@wdio/allure-reporter'

const exec = promisify(_exec)

function sh(cmd: string) {
  return process.platform === 'win32' ? `cmd /c ${cmd}` : cmd
}

/** Clear device logcat ring buffer so we only capture fresh logs */
export async function clearLogcat() {
  try { await exec(sh('adb logcat -c')) } catch (e) {
    console.warn('logcat -c failed (non-fatal):', (e as Error).message)
  }
}

export async function attachFilteredLogcat(
  name = 'NVM logcat (filtered)',
  pattern: RegExp = /(nvm|nvmagent)/i,
  includeFullTail = true,
  tailLines = 1200
) {
  
  const { stdout } = await exec(sh('adb logcat -v time -d'))

  const lines = stdout.split(/\r?\n/)
  const filtered = lines.filter(l => pattern.test(l))
  const filteredText = filtered.length ? filtered.join('\n') : '(no matching NVM lines)'

  allure.addAttachment(name, filteredText, 'text/plain')

  if (includeFullTail) {
    const tail = lines.slice(-tailLines).join('\n')
    allure.addAttachment('logcat (tail)', tail, 'text/plain')
  }
}
