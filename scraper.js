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
    
    // A rolagem pode não ser mais necessária se o puppeteer esperar o suficiente, mas manteremos por segurança.
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

    // Usando o seletor principal do card
    $('div.gamecard').each((index, element) => {
      const card = $(element);
      
      // --- INÍCIO DA LÓGICA ATUALIZADA ---

      // Dados comuns a ambos os layouts
      const campeonatoNome = card.find('div.all-scores-widget-competition-header-container-hora b').text().trim();
      const iconeCampeonatoSrc = card.find('div.all-scores-widget-competition-header-container-hora img').attr('src');
      
      const timeCasaElement = card.find('div.d-flex.justify-content-between').first();
      const timeForaElement = card.find('div.d-flex.justify-content-between').last();

      // Limpa os nomes dos times para pegar apenas o nome, sem o placar
      const timeCasa = timeCasaElement.find('span').first().contents().filter((i, el) => el.type === 'text').text().trim();
      const timeFora = timeForaElement.find('span').first().contents().filter((i, el) => el.type === 'text').text().trim();

      const iconeCasaSrc = timeCasaElement.find('img').attr('src');
      const iconeForaSrc = timeForaElement.find('img').attr('src');

      // Variáveis que mudarão dependendo do status do jogo
      let horario, status, placarCasa, placarFora;

      // O PONTO CHAVE: Verifica se a div de status ao vivo tem algum texto dentro
      const statusAoVivo = card.find('div.cardtime.badge.live').text().trim();

      if (statusAoVivo) {
        // É UM JOGO AO VIVO
        horario = card.find('div.box_time').text().trim();
        status = statusAoVivo;
        placarCasa = timeCasaElement.find('span').last().text().trim();
        placarFora = timeForaElement.find('span').last().text().trim();

      } else {
        // É UM JOGO AGENDADO
        horario = card.find('div.box_time').text().trim();
        status = "Agendado";
        placarCasa = "";
        placarFora = "";
      }

      // Captura de canais (a lógica parece a mesma)
      const canais = [];
      card.find('div.bcmact').each((i, el) => {
          const nomeCanal = $(el).find('img').attr('alt');
          const iconeCanalSrc = $(el).find('img').attr('src');
          if (nomeCanal && iconeCanalSrc) {
            canais.push({ canal: nomeCanal, icone: baseUrl + iconeCanalSrc });
          }
      });
      
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
