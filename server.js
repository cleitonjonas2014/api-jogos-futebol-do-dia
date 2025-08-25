import express from 'express';
import { buscarJogos } from './scraper.js'; // Importa nossa função!

// Configuração do servidor
const app = express();
const PORT = 3000; // A porta que nossa API vai usar

// Cria o "endpoint" (a rota) principal da nossa API
app.get('/jogos', async (req, res) => {
  console.log('Recebida requisição para /jogos...');
  try {
    // Chama a função do scraper para pegar os dados ao vivo
    const dadosDosJogos = await buscarJogos();
    // Devolve os dados como uma resposta JSON
    res.status(200).json(dadosDosJogos);
  } catch (error) {
    // Se der erro no scraper, devolve uma mensagem de erro
    res.status(500).json({ erro: 'Não foi possível buscar os dados dos jogos.' });
  }
});

// Inicia o servidor e o faz "escutar" por requisições
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando! Acesse os jogos em http://localhost:${PORT}/jogos`);
