import puppeteer from 'puppeteer';
import fs from 'fs';

const urlDoSite = 'https://www.futebolnatv.com.br/';
const arquivoDeSaida = 'pagina_completa.html';

async function salvarPaginaCompleta() {
  console.log('Iniciando Raio-X com Puppeteer...');
  let browser = null;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    console.log(`Navegando para ${urlDoSite}...`);
    await page.goto(urlDoSite, { waitUntil: 'networkidle2' });

    console.log("Esperando pelo conteúdo principal ('.gamecard')...");
    await page.waitForSelector('div.gamecard', { timeout: 30000 });
    console.log("Conteúdo carregado.");

    console.log('Extraindo o HTML final da página...');
    const htmlCompleto = await page.content();

    console.log(`Salvando o HTML no arquivo: ${arquivoDeSaida}`);
    fs.writeFileSync(arquivoDeSaida, htmlCompleto);
    console.log(`Arquivo salvo com sucesso! Por favor, inspecione o ${arquivoDeSaida}.`);

  } catch (error) {
    console.error('Ocorreu um erro durante o Raio-X:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navegador fechado.');
    }
  }
}

salvarPaginaCompleta();