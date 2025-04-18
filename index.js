// index.js
import express from 'express';
import { pegaCsrf } from './pegaCsrf.js';
import { registrarDireto } from './registrarDireto.js';

const app = express();
const PORT = process.env.PORT || 8080;

// DEBUG: retorna o CSRF token para testes
app.get('/debug/csrf', async (_req, res) => {
  try {
    const token = await pegaCsrf();
    res.json({ csrfToken: token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: e.message });
  }
});

// health check
app.get('/', (_req, res) => res.send('API do Autobot rodando'));
app.get('/ping', (_req, res) => res.send('pong'));

// endpoint principal
app.get('/webinarjam', async (req, res) => {
  const { nome, email } = req.query;
  if (!nome || !email) {
    return res
      .status(400)
      .json({ erro: "Parâmetros 'nome' e 'email' são obrigatórios." });
  }

  try {
    const link = await registrarDireto(nome, email);
    return res.json({ sucesso: true, link });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
