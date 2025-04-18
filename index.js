import express from 'express'
import { registrar } from './register.js'

const app = express()
const PORT = process.env.PORT || 8080

app.get('/', (_req, res) => {
  res.send('API do Autobot rodando')
})

app.get('/webinarjam', async (req, res) => {
  const { nome, email } = req.query
  if (!nome || !email) {
    return res
      .status(400)
      .json({ erro: "Parâmetros 'nome' e 'email' são obrigatórios." })
  }

  try {
    const link = await registrar(nome, email)
    return res.json({ sucesso: true, link })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ erro: e.message })
  }
})

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`))
