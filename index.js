// index.js - Automação WebinarJam (Versão Final)
const express = require('express');
const puppeteer = require('puppeteer');

// 1. Inicialização do Express
const app = express();
const port = process.env.PORT || 8080;

// 2. Middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date() });
});

// 4. Endpoint principal
app.get('/webinarjam', async (req, res) => {
  // Validação de parâmetros
  const { nome, email } = req.query;
  
  if (!nome || !email) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetros obrigatórios: nome e email'
    });
  }

  console.log(`Iniciando automação para: ${nome} (${email})`);
  
  let browser = null;
  
  try {
    // Iniciar navegador com configurações otimizadas para Railway
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: null,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
    });
    
    const page = await browser.newPage();
    
    // Configurações anti-detecção
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    
    // Interceptar requisições para modificar headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Configurar token CSRF (fornecido pelo usuário)
    const csrfToken = "eyJpdiI6Im5TY2lSOWFrVDBIc05LcE1mRTB5N2c9PSIsInZhbHVlIjoid1VFU1o2RlQ3eDZKa3dMR21KbUpHdUtGdTdOdU1MeVBzLzdaK0dSWVhJOE9TZUR1N25WVGhtR0NoRnZyMVliaWFjaU9xWEsxcUNZY0VaeG1Icld6V3BhVmZua0VFaThCS0tUd2g4VEcyaklQSjFXd0ZibytWNWlvaDRvQTNyTG8iLCJtYWMiOiIxOTI2ZTAyMmMwMWRhY2EyZTViZTk0MGE4NDEyODI4MzllY2RkMDVhMmZjNGVlOTI5M2I3ODE4MTZkNzJjMjI0IiwidGFnIjoiIn0%3D";
    
    // Configurar cookies antes de acessar a página
    await page.setCookie({
      name: 'XSRF-TOKEN',
      value: csrfToken,
      domain: 'event.webinarjam.com',
      path: '/',
      httpOnly: false,
      secure: true
    });
    
    // Acessar página de registro com timeout estendido
    console.log('Acessando página de registro...');
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Aguardar carregamento completo da página
    console.log('Aguardando carregamento da página...');
    await page.waitForSelector('input[placeholder*="nome"]', { timeout: 60000 });
    
    // Simular comportamento humano: pequena pausa antes de começar a digitar
    await page.waitForTimeout(1000 + Math.random() * 1000);
    
    // Preencher formulário com digitação humana (caractere por caractere)
    console.log('Preenchendo formulário...');
    
    // Preencher nome caractere por caractere
    for (const char of nome) {
      await page.type('input[placeholder*="nome"]', char, { delay: 100 + Math.random() * 150 });
      await page.waitForTimeout(50 + Math.random() * 100);
    }
    
    // Pequena pausa entre os campos
    await page.waitForTimeout(800 + Math.random() * 1200);
    
    // Preencher email caractere por caractere
    for (const char of email) {
      await page.type('input[placeholder*="e-mail"]', char, { delay: 80 + Math.random() * 120 });
      await page.waitForTimeout(30 + Math.random() * 80);
    }
    
    // Pausa antes de enviar o formulário
    await page.waitForTimeout(1500 + Math.random() * 1000);
    
    // MÉTODO 1: Submissão via JavaScript direto
    console.log('Tentando método 1: Submissão via JavaScript...');
    const submitResult1 = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        form.submit();
        return true;
      }
      return false;
    });
    
    if (submitResult1) {
      console.log('Formulário enviado via método 1');
    } else {
      console.log('Método 1 falhou, tentando método 2...');
      
      // MÉTODO 2: Clique com eventos de mouse completos
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const registerButton = buttons.find(button => 
          button.textContent.includes('INSCREVA-SE') || 
          button.textContent.includes('Registro')
        );
        
        if (registerButton) {
          // Simular eventos completos de mouse
          const rect = registerButton.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          // Eventos de mouse em sequência
          const mouseoverEvent = new MouseEvent('mouseover', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y
          });
          
          const mousedownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y
          });
          
          const mouseupEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y
          });
          
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y
          });
          
          registerButton.dispatchEvent(mouseoverEvent);
          registerButton.dispatchEvent(mousedownEvent);
          registerButton.dispatchEvent(mouseupEvent);
          registerButton.dispatchEvent(clickEvent);
        }
      });
      
      console.log('Eventos de mouse disparados via método 2');
    }
    
    // Aguardar redirecionamento
    console.log('Aguardando redirecionamento...');
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (e) {
      console.log('Timeout no redirecionamento, tentando método 3...');
      
      // MÉTODO 3: Pressionar Enter no campo de email
      await page.focus('input[placeholder*="e-mail"]');
      await page.keyboard.press('Enter');
      
      try {
        await page.waitForNavigation({ 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
      } catch (e) {
        console.log('Método 3 falhou, tentando método 4...');
        
        // MÉTODO 4: Clique direto via Puppeteer
        const buttonSelector = 'button:not([disabled])';
        await page.waitForSelector(buttonSelector);
        await page.click(buttonSelector);
        
        try {
          await page.waitForNavigation({ 
            waitUntil: 'networkidle2',
            timeout: 30000
          });
        } catch (e) {
          throw new Error('Todos os métodos de submissão falharam');
        }
      }
    }
    
    // Verificar URL atual
    const currentUrl = page.url();
    console.log(`URL atual: ${currentUrl}`);
    
    // Procurar pelo link
    console.log('Procurando link...');
    let liveLink = await page.evaluate(() => {
      // Estratégia 1: ID específico
      let link = document.querySelector('#js-live_link_1');
      if (link) return link.href;
      
      // Estratégia 2: Links com padrão específico
      const links = Array.from(document.querySelectorAll('a[href*="go/live"]'));
      if (links.length > 0) return links[0].href;
      
      // Estratégia 3: Qualquer link com padrão do domínio
      const allLinks = Array.from(document.querySelectorAll('a[href*="event.webinarjam.com/go/"]'));
      if (allLinks.length > 0) return allLinks[0].href;
      
      return null;
    });
    
    // Verificar se encontramos o link
    if (!liveLink && (currentUrl.includes('/go/live/') || currentUrl.includes('/go/'))) {
      liveLink = currentUrl;
    }
    
    if (!liveLink) {
      throw new Error('Link não encontrado na página de agradecimento');
    }
    
    console.log(`Link encontrado: ${liveLink}`);
    
    // Retornar resultado
    return res.json({
      success: true,
      nome,
      email,
      link: liveLink,
      pagina_confirmacao: currentUrl
    });
    
  } catch (error) {
    console.error('Erro na automação:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
  } finally {
    // Fechar navegador
    if (browser) {
      await browser.close();
      console.log('Navegador fechado');
    }
    
    // Controle de memória
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Uso de memória: ${Math.round(used * 100) / 100} MB`);
    
    // Verificar se estamos próximos do limite de memória
    if (used > 350) {
      console.warn('⚠️ Uso de memória alto, considerando reiniciar o processo');
    }
  }
});

// 5. Inicialização do servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
});
```
