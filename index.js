// index.js
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const app = express();
const port = process.env.PORT || 3000;

// 📌 1. Configuração Essencial para Ambientes Cloud
puppeteer.use(StealthPlugin());
const browserConfig = {
  headless: "new",
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-zygote',
    '--disable-gpu',
    '--js-flags="--max-old-space-size=256"'
  ],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
};

// 📌 2. Middlewares de Segurança
app.use(express.json());
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  next();
});

// 📌 3. Health Check para Monitoramento
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'operacional',
    version: process.env.npm_package_version,
    node: process.version
  });
});

// 📌 4. Endpoint Principal
app.get('/webinarjam', async (req, res) => {
  const startTime = Date.now();
  let browser;
  
  try {
    // Validação de Parâmetros
    const { nome, email } = req.query;
    if (!nome || !email) {
      throw new Error('Parâmetros nome e email são obrigatórios');
    }

    // 📌 5. Inicialização Controlada do Navegador
    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log(`🚀 Iniciando registro para: ${email}`);

    // 📌 6. Navegação com Timeout Duplo
    await Promise.race([
      page.goto('https://event.webinarjam.com/register/2/116pqiy', {
        waitUntil: 'networkidle2',
        timeout: 45000
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de navegação (45s)')), 45000)
      )
    ]);

    console.log('🔍 Preenchendo formulário...');
    
    // Preenchimento dos Campos
    await page.type('input[name="name"]', nome);
    await page.type('input[name="email"]', email);

    // 📌 7. Submissão com Controle de Promise
    const navigationPromise = page.waitForNavigation({
      waitUntil: ['networkidle2', 'domcontentloaded'],
      timeout: 60000
    });

    await page.click('button[type="submit"]');
    await navigationPromise;

    console.log('⏳ Aguardando elemento do link...');
    
    // 📌 8. Espera Hierárquica
    try {
      await page.waitForSelector('#js-live_link_1', {
        visible: true,
        timeout: 90000
      });
    } catch (error) {
      await page.screenshot({ path: '/tmp/timeout-error.png' });
      throw new Error(`Elemento não encontrado após 90s: ${error.message}`);
    }

    // Extração do Link
    const presentationLink = await page.$eval(
      '#js-live_link_1',
      el => el.href
    );

    console.log(`✅ Sucesso em ${((Date.now() - startTime)/1000).toFixed(1)}s`);
    
    res.json({
      link: presentationLink,
      metadata: {
        processing_time: Date.now() - startTime,
        source: 'webinarjam-automation'
      }
    });

  } catch (error) {
    console.error(`❌ Falha crítica: ${error.message}`);
    res.status(500).json({
      error: 'Falha na automação',
      details: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  } finally {
    // 📌 9. Limpeza Garantida
    if (browser) {
      await browser.close().catch(e => 
        console.error('Erro ao fechar navegador:', e)
      );
    }
  }
});

// 📌 10. Inicialização Segura do Servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`
  ██████╗  ██████╗ ████████╗
  ██╔══██╗██╔═══██╗╚══██╔══╝
  ██████╔╝██║   ██║   ██║   
  ██╔══██╗██║   ██║   ██║   
  ██║  ██║╚██████╔╝   ██║   
  ╚═╝  ╚═╝ ╚═════╝    ╚═╝   
  `);
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'desenvolvimento'}`);
  console.log(`Node.js ${process.version}`);
});
