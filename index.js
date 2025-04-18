import express from 'express';
import { registrarDireto } from './registrarDireto.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (_, res) => res.send('API do Autobot rodando'));
app.get('/webinarjam', async (req, res) => {
  const { nome, email } = req.query;
  if (!nome || !email) {
    return res.status(400).json({ erro: "faltando nome ou email" });
  }
  try {
    const link = await registrarDireto(nome, email);
    return res.json({ sucesso: true, link });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: e.message });
  }
});

app.listen(PORT, () => console.log(`🚀 rodando na porta ${PORT}`));
