import { launch } from 'puppeteer-core'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function buildPdf() {
  const browser = await launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  const htmlPath = path.join(__dirname, 'doc_template.html')
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' })

  const pdfPath = path.join(__dirname, '..', 'ArhamAvaz_Complete_Project_Documentation.pdf')
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  })

  console.log(`PDF successfully generated at: ${pdfPath}`)
  await browser.close()
}

buildPdf().catch((err) => {
  console.error('Error generating PDF:', err)
  process.exit(1)
})
