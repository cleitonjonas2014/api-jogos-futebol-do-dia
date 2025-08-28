import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const baseUrl = 'https://www.futebolnatv.com.br';

export async function buscarJogos(dia = 'hoje') {
  const urls = {
    agora: `${baseUrl}/jogos-aovivo/`,
    hoje: `${baseUrl}/jogos-hoje/`,
    amanha: `${baseUrl}/jogos-amanha/`,
  };
  const urlDoSite = urls[dia] || urls['hoje'];
  console.log(`Iniciando scraper para a seção: '${dia}'...`);
  
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
    });
    const page = await browser.newPage();
    console.log(`Navegando para ${urlDoSite}...`);

    await page.goto(urlDoSite, { waitUntil: 'networkidle2', timeout: 120000 });
    
    // Rola a página para garantir que todos os elementos (lazy-loaded) sejam carregados
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight; 
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 250);
        });
    });

    await new Promise(resolve => setTimeout(resolve, 3000)); 
    console.log('Rolagem finalizada. Extraindo HTML...');

    const html = await page.content();
    const $ = cheerio.load(html);
    const jogosEncontrados = [];

    $('div.gamecard').each((index, element) => {
      const card = $(element);
      
      // Captura de dados comuns
      const campeonatoNome = card.find('div.all-scores-widget-competition-header-container-hora b').text().trim();
      const iconeCampeonatoSrc = card.find('div.all-scores-widget-competition-header-container-hora img').attr('src');
      
      const timeCasaElement = card.find('div.d-flex.justify-content-between').first();
      const timeForaElement = card.find('div.d-flex.justify-content-between').last();

      // Pega o nome do time, ignorando o span do placar
      const timeCasa = timeCasaElement.find('span').first().clone().children().remove().end().text().trim();
      const timeFora = timeForaElement.find('span').first().clone().children().remove().end().text().trim();

      const iconeCasaSrc = timeCasaElement.find('img').attr('src');
      const iconeForaSrc = timeForaElement.find('img').attr('src');

      let horario, status, placarCasa, placarFora;

      // A chave para a lógica: verifica o texto dentro da div de status ao vivo
      const liveTimeText = card.find('div.cardtime.badge.live').text().trim();
      
      if (liveTimeText && (liveTimeText.includes("'") || liveTimeText.toLowerCase().includes('intervalo'))) {
        // Se a div tem texto (ex: "55'" ou "Intervalo"), o jogo está ao vivo
        horario = card.find('div.box_time').text().trim();
        status = liveTimeText;
        placarCasa = timeCasaElement.find('span').last().text().trim();
        placarFora = timeForaElement.find('span').last().text().trim();

      } else {
        // Se a div está vazia, o jogo está agendado
        horario = card.find('div.box_time').text().trim();
        status = "Agendado";
        placarCasa = "";
        placarFora = "";
      }

      // Captura dos canais
      const canais = [];
      card.find('div.bcmact').each((i, el) => {
          const nomeCanal = $(el).find('img').attr('alt');
          const iconeCanalSrc = $(el).find('img').attr('src');
          if (nomeCanal && iconeCanalSrc) {
            canais.push({ canal: nomeCanal, icone: baseUrl + iconeCanalSrc });
          }
      });
      
      // Adiciona o jogo à lista se os dados essenciais foram encontrados
      if (timeCasa && timeFora) {
        jogosEncontrados.push({
          campeonato: { nome: campeonatoNome, icone: iconeCampeonatoSrc },
          horario,
          status,
          partida: { 
            timeCasa, 
            iconeCasa: iconeCasaSrc ? baseUrl + iconeCasaSrc : null, 
            placarCasa, 
            timeFora, 
            iconeFora: iconeForaSrc ? baseUrl + iconeForaSrc : null, 
            placarFora 
          },
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
