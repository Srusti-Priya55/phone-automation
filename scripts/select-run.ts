// scripts/select-run.ts
import prompts from 'prompts'
import { spawn } from 'child_process'
import path from 'path'

function toRelPosix(p: string) {
  const rel = path.relative(process.cwd(), p)
  return rel.split(path.sep).join('/')
}

function run(cmd: string, args: string[], allowFailure = false) {
  return new Promise<void>((resolve, reject) => {
    const bin = process.platform === 'win32' ? `${cmd}.cmd` : cmd
    const child = spawn(bin, args, { stdio: 'inherit', shell: true })
    child.on('close', (code) => {
      if (code === 0 || allowFailure) resolve()
      else reject(new Error(`${cmd} exited with code ${code}`))
    })
  })
}

async function runSpecs(specPaths: string[]) {
  const args = ['wdio', 'run', './wdio.conf.ts']
  for (const spec of specPaths) args.push('--spec', toRelPosix(spec))
  // allowFailure=true → even if tests fail, continue to Allure
  await run('npx', args, true)
}

async function buildAndOpenAllure() {
  // generate report
  await run('npx', ['allure', 'generate', './allure-results', '--clean', '-o', './allure-report'])
  // open it
  await run('npx', ['allure', 'open', './allure-report'])
}

;(async () => {
  const { method } = await prompts({
    type: 'select',
    name: 'method',
    message: 'Choose installation method',
    choices: [
      { title: 'Install via ADB', value: 'adb' },
      { title: 'Install via Play Store', value: 'play' },
    ],
  })

  if (!method) {
    console.log('No option selected.')
    process.exit(1)
  }

  const specsBase = path.resolve(__dirname, '..', 'test', 'specs')
  const chains: Record<string, string[]> = {
    adb: [
      path.join(specsBase, 'install-adb.e2e.ts'),
      path.join(specsBase, 'push-and-register.e2e.ts'),
      path.join(specsBase, 'nvm-service-check.e2e.ts'),
      path.join(specsBase, 'add-asa-and-connect.e2e.ts'),
      path.join(specsBase, 'interface-change-check.e2e.ts'),
      path.join(specsBase, 'uninstall-adb.e2e.ts'),
      path.join(specsBase, 'unregister-profile.e2e.ts'),

    ],
    play: [
      path.join(specsBase, 'install-play.e2e.ts'),
      path.join(specsBase, 'push-and-register.e2e.ts'),
      path.join(specsBase, 'nvm-service-check.e2e.ts'),
      path.join(specsBase, 'add-asa-and-connect.e2e.ts'),
      path.join(specsBase, 'interface-change-check.e2e.ts'),
      path.join(specsBase, 'uinstall-play.e2e.ts'),
      path.join(specsBase, 'unregister-profile.e2e.ts'),

    ],
  }

  const selected = chains[method]
  console.log('\nRunning in order:\n  ' + selected.map(toRelPosix).join('\n  ') + '\n')

  await runSpecs(selected)

  console.log('\nGenerating Allure report…\n')
  await buildAndOpenAllure()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})






// // scripts/select-run.ts
// import prompts from 'prompts'
// import { spawn } from 'child_process'
// import path from 'path'

// function toRelPosix(p: string) {
//   const rel = path.relative(process.cwd(), p)
//   return rel.split(path.sep).join('/')
// }

// function run(cmd: string, args: string[]) {
//   return new Promise<void>((resolve, reject) => {
//     const bin = process.platform === 'win32' ? `${cmd}.cmd` : cmd
//     const child = spawn(bin, args, { stdio: 'inherit', shell: true })
//     child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))))
//   })
// }

// async function runSpecs(specPaths: string[]) {
//   const args = ['wdio', 'run', './wdio.conf.ts']
//   for (const spec of specPaths) args.push('--spec', toRelPosix(spec))
//   await run('npx', args)
// }

// async function buildAndOpenAllure() {
//   // generate report
//   await run('npx', ['allure', 'generate', './allure-results', '--clean', '-o', './allure-report'])
//   // open it
//   await run('npx', ['allure', 'open', './allure-report'])
// }

// ;(async () => {
//   const { method } = await prompts({
//     type: 'select',
//     name: 'method',
//     message: 'Choose installation method',
//     choices: [
//       { title: 'Install via ADB', value: 'adb' },
//       { title: 'Install via Play Store', value: 'play' },
//     ],
//   })

//   if (!method) {
//     console.log('No option selected.')
//     process.exit(1)
//   }

//   const specsBase = path.resolve(__dirname, '..', 'test', 'specs')
//   const chains: Record<string, string[]> = {
//     adb: [
//       path.join(specsBase, 'install-adb.e2e.ts'),
//       path.join(specsBase, 'push-and-register.e2e.ts'),
//       path.join(specsBase, 'toggle-wifi-and-nvm.e2e.ts'), 
//     ],
//     play: [
//       path.join(specsBase, 'install-play.e2e.ts'),
//       path.join(specsBase, 'push-and-register.e2e.ts'),
//       path.join(specsBase, 'add-asa-and-connect.e2e.ts'),
//     ],
//   }

//   const selected = chains[method]
//   console.log('\nRunning in order:\n  ' + selected.map(toRelPosix).join('\n  ') + '\n')

//   await runSpecs(selected)

//   console.log('\nGenerating Allure report…\n')
//   await buildAndOpenAllure()
// })().catch((e) => {
//   console.error(e)
//   process.exit(1)
// })

