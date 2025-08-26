import express from 'express';
import cors from 'cors'; // <-- 1. IMPORTAR O PACOTE
import { buscarJogos } from './scraper.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // <-- 2. HABILITAR O CORS PARA TODAS AS REQUISIÇÕES

// Esta é uma função auxiliar para não repetir o código
const handleJogosRequest = async (dia, res) => {
  // ... (o resto do código continua exatamente igual)
  const diasValidos = ['agora', 'ontem', 'hoje', 'amanha'];
  if (!diasValidos.includes(dia)) {
    return res.status(400).json({ erro: "Parâmetro inválido. Use 'agora', 'ontem', 'hoje' ou 'amanha'." });
  }

  console.log(`Recebida requisição para /jogos/${dia}...`);
  try {
    const dadosDosJogos = await buscarJogos(dia);
    res.status(200).json(dadosDosJogos);
  } catch (error) {
    console.error(`Erro na rota /jogos/${dia}:`, error);
    res.status(500).json({ erro: `Não foi possível buscar os dados dos jogos para '${dia}'.` });
  }
};

// ROTA 1: Rota para um dia específico (ex: /jogos/ontem)
app.get('/jogos/:dia', (req, res) => {
  handleJogosRequest(req.params.dia, res);
});

// ROTA 2: Rota padrão para /jogos, que sempre busca os jogos de 'hoje'
app.get('/jogos', (req, res) => {
  handleJogosRequest('hoje', res);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}!`);
});
