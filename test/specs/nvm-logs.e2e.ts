// test/specs/nvm-logs-snapshot.e2e.ts
import { driver } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'

const exec = promisify(_exec)

async function runCmd(cmd: string) {
  const wrapped = process.platform === 'win32' ? `cmd /c ${cmd}` : cmd
  return exec(wrapped, { maxBuffer: 10 * 1024 * 1024 })
}

async function fetchNvmLogs(lines = 5000, filter = 'nvmagent'): Promise<string> {
  // Windows uses findstr, Linux/mac uses grep
  const filterCmd =
    process.platform === 'win32'
      ? `findstr /i "${filter}"`
      : `grep -i "${filter.replace(/"/g, '\\"')}"`

  const cmd = `adb logcat -v time -t ${lines} | ${filterCmd}`
  const { stdout } = await runCmd(cmd)
  return stdout || ''
}

async function saveAndAttach(logText: string, label = 'NVM logs') {
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace('Z', '')
  const outDir = path.resolve(process.cwd(), 'artifacts', 'logs')
  const outFile = path.join(outDir, `nvm_logs_${ts}.txt`)

  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(outFile, logText, 'utf8')

  allure.addAttachment(`${label} (saved: ${path.basename(outFile)})`, logText, 'text/plain')
}

export async function captureNvmLogsSnapshot(
  lines = 5000,
  filter = 'nvmagent'
): Promise<void> {
  await driver.getWindowSize() // just to ensure driver session is alive
  const logs = await fetchNvmLogs(lines, filter)
  await saveAndAttach(logs, `NVM logs (last ${lines} lines, filter="${filter}")`)
}

describe('NVM logs snapshot', () => {
  it('captures and attaches filtered NVM logs to Allure', async () => {
    await captureNvmLogsSnapshot(8000, 'nvmagent')
  })
})
