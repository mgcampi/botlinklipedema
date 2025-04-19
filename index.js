// index.js
import express from "express";
import { inscreverNoWebinarJam } from "./inscricaoWebinar.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("🚀 API do WebinarJam está online!");
});

app.get("/inscrever", async (req, res) => {
  const { nome, email } = req.query;

  if (!nome || !email) {
    return res.status(400).json({ success: false, error: "Nome e email são obrigatórios." });
  }

  const resultado = await inscreverNoWebinarJam(nome, email);
  res.json(resultado);
});

app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${PORT}`);
});
