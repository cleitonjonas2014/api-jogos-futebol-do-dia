import express from 'express';
import { buscarJogos } from './scraper.js';

const app = express();
const PORT = process.env.PORT || 3000;

// A rota agora usa um parâmetro opcional ':dia?'
// Isso significa que tanto /jogos quanto /jogos/hoje funcionarão
app.get('/jogos/:dia?', async (req, res) => {
  // Pega o parâmetro da URL. Se não for fornecido, usa 'hoje' como padrão.
  const diaSelecionado = req.params.dia || 'hoje';
  
  // Validação simples para aceitar apenas as opções esperadas
  const diasValidos = ['agora', 'ontem', 'hoje', 'amanha'];
  if (!diasValidos.includes(diaSelecionado)) {
    return res.status(400).json({ erro: "Parâmetro inválido. Use 'agora', 'ontem', 'hoje' ou 'amanha'." });
  }

  console.log(`Recebida requisição para /jogos/${diaSelecionado}...`);
  try {
    // Passa o parâmetro para a função do scraper
    const dadosDosJogos = await buscarJogos(diaSelecionado);
    res.status(200).json(dadosDosJogos);
  } catch (error) {
    console.error(`Erro na rota /jogos/${diaSelecionado}:`, error);
    res.status(500).json({ erro: `Não foi possível buscar os dados dos jogos para '${diaSelecionado}'.` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}!`);
});
