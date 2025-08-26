import express from 'express';
import { buscarJogos } from './scraper.js';

// Configuração do servidor
const app = express();
// Usa a porta fornecida pelo Railway (process.env.PORT) ou a 3000 como padrão
const PORT = process.env.PORT || 3000;

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
    console.error('Erro ao buscar jogos:', error); // Adiciona um log do erro no servidor
    res.status(500).json({ erro: 'Não foi possível buscar os dados dos jogos.' });
  }
}); // <--- Faltava fechar a chave da rota app.get

// Inicia o servidor e o faz "escutar" por requisições
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
}); // <--- Faltava fechar a chave da função listen
