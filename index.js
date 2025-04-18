// index.js
import express from 'express';
import { registrarNoWebinar } from './register.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (_req, res) => res.send('API do Autobot rodando'));
app.get('/ping', (_req, res) => res.send('pong'));

app.get('/webinarjam', async (req, res) => {
  const { nome, email } = req.query;
  if (!nome || !email) {
    return res
      .status(400)
      .json({ erro: "Parâmetros 'nome' e 'email' são obrigatórios." });
  }
  try {
    const link = await registrarNoWebinar(nome, email);
    res.json({ sucesso: true, link });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: e.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
