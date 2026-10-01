// Führt alle Testdateien aus. Aufruf: npm test  (oder: node test/run.js)
const files = ['hotkey-guard', 'toggle', 'toggle-state', 'step-base', 'seek', 'cinema']

;(async () => {
  let failed = 0

  for (const file of files) {
    console.log(`\n── ${file} ──`)
    const { run } = require(`./${file}.test.js`)
    failed += await run()
  }

  console.log(`\n${failed === 0 ? 'Alles grün.' : `${failed} Test(s) fehlgeschlagen.`}`)
  process.exit(failed ? 1 : 0)
})()
