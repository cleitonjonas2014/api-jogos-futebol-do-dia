import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const urlDoSite = 'https://www.futebolnatv.com.br/';

export async function buscarJogos() {
  console.log('Iniciando scraper v2.0 (campeão) com Puppeteer...');
  
  let browser = null;
  try {
    browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    console.log(`Navegando para ${urlDoSite}...`);
    await page.goto(urlDoSite, { waitUntil: 'networkidle2' });

    console.log("Esperando os jogos aparecerem na página...");
    await page.waitForSelector('div.gamecard:not([wire\\:snapshot])', { timeout: 30000 });
    console.log("Conteúdo carregado. Iniciando extração...");

    const html = await page.content();
    const $ = cheerio.load(html);
    const jogosEncontrados = [];

    // Iteramos em uma estrutura maior que contém tanto o jogo quanto os canais
    $('body').find('div.gamecard:not([wire\\:snapshot])').each((index, element) => {
      const card = $(element);
      
      const campeonato = card.find('div.all-scores-widget-competition-header-container-hora b').text().trim();
      const horario = card.find('div.box_time').text().trim();
      const status = card.find('div.cardtime.badge.endgame').text().replace(/\s+/g, ' ').trim();
      
      const timesRows = card.find('div.col-9.col-sm-10 > div.d-flex');
      const timeCasa = $(timesRows[0]).find('span').first().text().trim();
      const placarCasa = $(timesRows[0]).find('span').last().text().replace(/\s+/g, '').trim();
      const timeFora = $(timesRows[1]).find('span').first().text().trim();
      const placarFora = $(timesRows[1]).find('span').last().text().replace(/\s+/g, '').trim();

      // ===================================================================
      // LÓGICA FINAL E CORRETA DOS CANAIS
      // O container de canais é o próximo elemento 'div' depois do 'a' que envolve o gamecard.
      const canaisContainer = card.children('a').first().next('div.container.text-center');
      const canais = [];
      canaisContainer.find('div.bcmact').each((i, el) => {
          const nomeCanal = $(el).text().trim().replace(/\s+/g, ' ');
          if (nomeCanal) {
            canais.push({ canal: nomeCanal });
          }
      });
      // ===================================================================

      if (timeCasa && timeFora) {
        jogosEncontrados.push({
          campeonato,
          horario,
          status,
          partida: { timeCasa, placarCasa, timeFora, placarFora },
          canais,
        });
      }
    });

    console.log(`Extração finalizada! ${jogosEncontrados.length} jogos encontrados.`);
    return jogosEncontrados;

  } catch (error) {
    console.error('Ocorreu um erro no scraper final:', error);
    throw new Error('Falha ao buscar os jogos.');
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navegador fechado.');
    }
  }
}