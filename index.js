import express from "express";
import puppeteer from "puppeteer";
import axios from "axios";

const app = express();
app.use(express.json());

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  let browser;
  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} (${email})`);
    browser = await puppeteer.launch({
      headless: false, // Mudando para falso para depuração
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    const page = await browser.newPage();
    
    // Interceptar requisições de rede para capturar dados
    let webinarData = null;
    
    // Monitorar requisições XHR/fetch para capturar dados da API
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('api/webinar') || url.includes('webinarjam')) {
        try {
          const responseData = await response.json();
          if (responseData && responseData.webinar) {
            webinarData = responseData;
            console.log("✅ Capturei dados do webinar via rede");
          }
        } catch (e) {
          // Ignorar erros de parsing
        }
      }
    });

    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    
    // Aguardar mais tempo para garantir carregamento completo
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Tentativa 1: Extrair config do JavaScript
    const configData = await page.evaluate(() => {
      // Tentar várias abordagens para encontrar os dados
      if (window.config) return window.config;
      if (window.webinarConfig) return window.webinarConfig;
      if (window.__INITIAL_STATE__) return window.__INITIAL_STATE__;
      
      // Tentar encontrar qualquer variável que pareça conter dados do webinar
      for (let key in window) {
        if (typeof window[key] === 'object' && window[key] !== null) {
          if (window[key].webinar || window[key].schedule_id || window[key].captcha) {
            return window[key];
          }
        }
      }
      
      return null;
    });
    
    // Se não conseguimos os dados via JavaScript, vamos tentar extrair via DOM
    if (!webinarData && !configData) {
      console.log("⚠️ Tentando extrair dados via DOM e formulário");
      
      // Capturar dados do formulário
      const formData = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return null;
        
        // Capturar action do formulário
        const action = form.getAttribute('action');
        
        // Capturar campos ocultos que podem conter IDs importantes
        const hiddenInputs = {};
        document.querySelectorAll('input[type="hidden"]').forEach(input => {
          hiddenInputs[input.name] = input.value;
        });
        
        return { action, hiddenInputs };
      });
      
      if (formData) {
        console.log("✅ Capturei dados do formulário:", formData);
      }
      
      // Simular preenchimento do formulário e clicar para enviar
      await page.type('input[name="email"]', email);
      await page.type('input[name="name"]', nome);
      
      // Aguardar para garantir que todos os campos foram preenchidos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Capturar a URL antes do clique
      const currentUrl = page.url();
      
      // Clicar no botão de envio
      await Promise.all([
        page.waitForNavigation({ timeout: 60000 }).catch(() => {}),
        page.click('button[type="submit"]').catch(e => console.log("Erro ao clicar:", e.message))
      ]);
      
      // Verificar se houve redirecionamento
      const newUrl = page.url();
      if (newUrl !== currentUrl) {
        console.log("✅ Redirecionamento detectado para:", newUrl);
        await browser.close();
        return res.json({ 
          sucesso: true, 
          link: newUrl,
          metodo: "preenchimento_formulario" 
        });
      }
    } else {
      console.log("✅ Dados capturados via JavaScript ou resposta de rede");
    }
    
    const config = webinarData || configData;
    if (!config) {
      throw new Error("❌ Não foi possível capturar os dados necessários para inscrição");
    }
    
    // Extrair dados necessários do config obtido
    const schedule = config.webinar?.registrationDates?.[0] || 
                     config.registrationDates?.[0] || 
                     { schedule_id: config.schedule_id };
                     
    const processUrl = config.routes?.process || 
                       config.processUrl || 
                       "https://event.webinarjam.com/api/v2/register";
                       
    const captchaKey = config.captcha?.key || config.captchaKey;
    
    if (!schedule.schedule_id) {
      throw new Error("❌ Não foi possível determinar o schedule_id");
    }
    
    const payload = {
      name: nome,
      email: email,
      schedule_id: schedule.schedule_id,
      tz: "America/Sao_Paulo",
    };
    
    // Adicionar captcha se existir
    if (captchaKey) {
      payload.captcha = {
        challenge: "manual",
        key: captchaKey,
        response: "manual",
      };
    }
    
    console.log("📡 Enviando payload:", JSON.stringify(payload, null, 2));
    
    const register = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://event.webinarjam.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
    });
    
    console.log("📩 Resposta:", register.data);
    
    const linkFinal = register.data?.redirect?.url || register.data?.url;
    if (!linkFinal) throw new Error("❌ Inscrição falhou, sem link de redirect");
    
    console.log("✅ Inscrição concluída:", linkFinal);
    res.json({ sucesso: true, link: linkFinal });
    
  } catch (err) {
    console.error("🚨 Erro na inscrição:", err.message);
    res.status(500).json({
      erro: "Erro ao processar inscrição.",
      detalhe: err.message
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
});

app.get("/status", (req, res) => {
  res.json({ status: "online" });
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
