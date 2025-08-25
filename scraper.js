import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const urlDoSite = 'https://www.futebolnatv.com.br/';
const baseUrl = 'https://www.futebolnatv.com.br'; // NOVO: Base URL para montar os links completos

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

    $('body').find('div.gamecard:not([wire\\:snapshot])').each((index, element) => {
      const card = $(element);
      
      const campeonato = card.find('div.all-scores-widget-competition-header-container-hora b').text().trim();
      const horario = card.find('div.box_time').text().trim();
      const status = card.find('div.cardtime.badge.endgame').text().replace(/\s+/g, ' ').trim();
      
      const timesRows = card.find('div.col-9.col-sm-10 > div.d-flex');
      
      const timeCasaElement = $(timesRows[0]);
      const timeForaElement = $(timesRows[1]);

      const timeCasa = timeCasaElement.find('span').first().text().trim();
      const placarCasa = timeCasaElement.find('span').last().text().replace(/\s+/g, '').trim();
      const timeFora = timeForaElement.find('span').first().text().trim();
      const placarFora = timeForaElement.find('span').last().text().replace(/\s+/g, '').trim();

      // NOVO: Captura dos ícones dos times
      const iconeCasaSrc = timeCasaElement.find('img').attr('src');
      const iconeForaSrc = timeForaElement.find('img').attr('src');
      const iconeCasa = iconeCasaSrc ? baseUrl + iconeCasaSrc : null;
      const iconeFora = iconeForaSrc ? baseUrl + iconeForaSrc : null;

      const canaisContainer = card.children('a').first().next('div.container.text-center');
      const canais = [];
      canaisContainer.find('div.bcmact').each((i, el) => {
          const nomeCanal = $(el).text().trim().replace(/\s+/g, ' ');
          
          // NOVO: Captura do ícone do canal
          const iconeCanalSrc = $(el).find('img').attr('src');
          const iconeCanal = iconeCanalSrc ? baseUrl + iconeCanalSrc : null;

          if (nomeCanal) {
            // MODIFICADO: Adiciona o ícone ao objeto do canal
            canais.push({ 
              canal: nomeCanal,
              icone: iconeCanal 
            });
          }
      });

      if (timeCasa && timeFora) {
        jogosEncontrados.push({
          campeonato,
          horario,
          status,
          // MODIFICADO: Adiciona os ícones ao objeto da partida
          partida: { timeCasa, iconeCasa, placarCasa, timeFora, iconeFora, placarFora },
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
