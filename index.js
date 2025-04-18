import express from 'express';
import { registrarDireto } from './registrarDireto.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/webinarjam', async (req, res) => {
  const { nome, email } = req.query;
  if (!nome || !email) {
    return res.status(400).json({ erro: "faltando nome ou email" });
  }
  try {
    const link = await registrarDireto(nome, email);
    res.json({ sucesso: true, link });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: e.message });
  }
});

app.listen(PORT, () => console.log(`🚀 rodando na porta ${PORT}`));
