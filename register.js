import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())

export async function registrar(nome, email) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })

  // 1) vai para a página
  await page.goto(
    'https://event.webinarjam.com/register/2/116pqiy',
    { waitUntil: 'networkidle2', timeout: 60000 }
  )

  // 2) clica no botão “REGISTRO”
  const [btn] = await page.$x(
    `//button[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registro')] 
     | //a[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registro')]`
  )
  if (!btn) {
    await browser.close()
    throw new Error('Botão “REGISTRO” não encontrado')
  }
  await btn.click()

  // 3) espera abrir o iframe de registro
  await page.waitForSelector('#registration-modal iframe', { timeout: 20000 })
  const iframeHandle = await page.$('#registration-modal iframe')
  const frame = await iframeHandle.contentFrame()

  // 4) espera e preenche os inputs dentro do iframe
  await frame.waitForSelector(
    'input[name="name"], input[name*="first"], input[placeholder*="nome" i]',
    { timeout: 20000 }
  )
  await frame.type(
    'input[name="name"], input[name*="first"], input[placeholder*="nome" i]',
    nome,
    { delay: 30 }
  )
  await frame.type(
    'input[name="email"], input[type="email"], input[placeholder*="e-mail" i]',
    email,
    { delay: 30 }
  )

  // 5) envia
  await frame.click('button[type="submit"], input[type="submit"], button.js-submit')

  // 6) aguarda a navegação pro “thank you”
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })

  // 7) captura o link da live
  await page.waitForSelector(
    'a[id^="js_live_link_"], a[href*="/go/live/"]',
    { timeout: 20000 }
  )
  const liveLink = await page.$eval(
    'a[id^="js_live_link_"], a[href*="/go/live/"]',
    el => el.href
  )

  await browser.close()
  return liveLink
}

// teste standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  registrar('Teste Puppeteer', `teste${Date.now()}@mail.com`)
    .then(console.log)
    .catch(console.error)
}
