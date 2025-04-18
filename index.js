// Trecho modificado do endpoint /webinarjam
app.get('/webinarjam', async (req, res) => {
  const { nome, email } = req.query;
  let browser;

  try {
    // ... validações anteriores

    // 1. Configuração de timeout global
    const MAX_TIMEOUT = 120000; // 120 segundos
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), MAX_TIMEOUT);

    // 2. Navegação com monitoramento ativo
    const page = await browser.newPage();
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
      signal: timeoutController.signal
    });

    // 3. Tratamento de overlays
    const handleOverlays = async () => {
      try {
        const cookieBtn = await page.waitForSelector('button:has-text("Aceitar cookies")', { 
          timeout: 5000,
          signal: timeoutController.signal 
        });
        await cookieBtn.click();
        console.log('🍪 Cookies aceitos');
      } catch (_) {}
    };
    await handleOverlays();

    // 4. Fluxo de registro otimizado
    const registrationFlow = async () => {
      // Etapa 1: Clica no botão de registro
      const registerBtn = await page.waitForSelector(SELECTORS.registerButton, {
        visible: true,
        timeout: 15000,
        signal: timeoutController.signal
      });
      
      // Dispara clique sem esperar navegação
      await Promise.all([
        registerBtn.click(),
        page.waitForTimeout(2000) // Pequeno delay para estabilização
      ]);

      // Etapa 2: Preenchimento dinâmico
      await page.waitForSelector(SELECTORS.nameInput.join(','), {
        visible: true,
        timeout: 30000,
        signal: timeoutController.signal
      });
      
      await page.type(SELECTORS.nameInput.join(','), nome, { delay: 50 });
      await page.type(SELECTORS.emailInput.join(','), email, { delay: 50 });

      // Etapa 3: Submissão inteligente
      const [response] = await Promise.all([
        page.waitForResponse(res => 
          res.url().includes('/thank-you/') && res.status() === 200
        ),
        page.click(SELECTORS.submitButton.join(','))
      ]);
      
      return response.url();
    };

    const thankYouUrl = await registrationFlow();
    console.log('🔗 URL de confirmação:', thankYouUrl);

    // 5. Busca do link final com fallbacks
    await page.goto(thankYouUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
      signal: timeoutController.signal
    });

    const liveLink = await page.evaluate((selectors) => {
      const findLink = () => {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) return el.href || el.textContent;
        }
        return null;
      };
      return new Promise(resolve => {
        let attempts = 0;
        const check = () => {
          attempts++;
          const link = findLink();
          if (link || attempts > 30) resolve(link);
          else setTimeout(check, 500);
        };
        check();
      });
    }, SELECTORS.liveLink);

    if (!liveLink) throw new Error('Link da apresentação não encontrado');

    res.json({ 
      link: liveLink,
      debug: { finalUrl: thankYouUrl }
    });

    clearTimeout(timeoutId);

  } catch (error) {
    // ... tratamento de erro anterior
    if (error.name === 'AbortError') {
      console.error('⏰ Timeout global excedido (120s)');
      await page.screenshot({ path: '/tmp/timeout.png' });
    }
  } finally {
    // ... cleanup anterior
  }
});
