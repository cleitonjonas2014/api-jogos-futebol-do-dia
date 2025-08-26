import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const baseUrl = 'https://www.futebolnatv.com.br';

// A função agora aceita um parâmetro 'dia', com 'hoje' sendo o valor padrão.
export async function buscarJogos(dia = 'hoje') {
  // Mapeamento dos parâmetros para as URLs reais
  const urls = {
    agora: `${baseUrl}/jogos-aovivo/`,
    ontem: `${baseUrl}/jogos-ontem/`,
    hoje: `${baseUrl}/jogos-hoje/`,
    amanha: `${baseUrl}/jogos-amanha/`,
  };

  // Escolhe a URL correta com base no parâmetro, ou usa 'hoje' se for inválido
  const urlDoSite = urls[dia] || urls['hoje'];

  console.log(`Iniciando scraper para a seção: '${dia}'...`);
  
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });
    const page = await browser.newPage();

    console.log(`Navegando para ${urlDoSite}...`);
    await page.goto(urlDoSite, { waitUntil: 'networkidle2' });

    console.log("Esperando seletor da página de jogos...");
    // O seletor para os cards de jogos parece ser o mesmo em todas as páginas
    await page.waitForSelector('div.gamecard', { timeout: 30000 });
    console.log("Conteúdo carregado. Iniciando extração...");

    const html = await page.content();
    const $ = cheerio.load(html);
    const jogosEncontrados = [];

    // O restante da lógica de extração é exatamente a mesma
    $('body').find('div.gamecard:not([wire\\:snapshot])').each((index, element) => {
      const card = $(element);
      
      const campeonato = card.find('div.all-scores-widget-competition-header-container-hora b').text().trim();
      const iconeCampeonatoSrc = card.find('div.all-scores-widget-competition-header-container-hora img').attr('src');
      const iconeCampeonato = iconeCampeonatoSrc; // Já é uma URL absoluta

      const horario = card.find('div.box_time').text().trim();
      const status = card.find('div.cardtime.badge').text().replace(/\s+/g, ' ').trim() || 'Agendado';
      
      const timesRows = card.find('div.col-9.col-sm-10 > div.d-flex');
      
      const timeCasaElement = $(timesRows[0]);
      const timeForaElement = $(timesRows[1]);

      const timeCasa = timeCasaElement.find('span').first().text().trim();
      const placarCasa = timeCasaElement.find('span').last().text().replace(/\s+/g, '').trim();
      const timeFora = timeForaElement.find('span').first().text().trim();
      const placarFora = timeForaElement.find('span').last().text().replace(/\s+/g, '').trim();
      
      const iconeCasaSrc = timeCasaElement.find('img').attr('src');
      const iconeForaSrc = timeForaElement.find('img').attr('src');
      const iconeCasa = iconeCasaSrc ? baseUrl + iconeCasaSrc : null;
      const iconeFora = iconeForaSrc ? baseUrl + iconeForaSrc : null;

      const canaisContainer = card.children('a').first().next('div.container.text-center');
      const canais = [];
      canaisContainer.find('div.bcmact').each((i, el) => {
          const nomeCanal = $(el).text().trim().replace(/\s+/g, ' ');
          const iconeCanalSrc = $(el).find('img').attr('src');
          const iconeCanal = iconeCanalSrc ? baseUrl + iconeCanalSrc : null;
          if (nomeCanal) {
            canais.push({ canal: nomeCanal, icone: iconeCanal });
          }
      });

      if (timeCasa && timeFora) {
        jogosEncontrados.push({
          campeonato: { nome: campeonato, icone: iconeCampeonato },
          horario,
          status,
          partida: { timeCasa, iconeCasa, placarCasa, timeFora, iconeFora, placarFora },
          canais,
        });
      }
    });

    console.log(`Extração finalizada! ${jogosEncontrados.length} jogos encontrados para '${dia}'.`);
    return jogosEncontrados;

  } catch (error) {
    console.error(`Ocorreu um erro no scraper para a seção '${dia}':`, error);
    throw new Error(`Falha ao buscar os jogos da seção: ${dia}.`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navegador fechado.');
    }
  }
}
