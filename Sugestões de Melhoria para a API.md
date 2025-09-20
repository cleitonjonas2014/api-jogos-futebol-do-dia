# Sugestões de Melhoria para a API

Este relatório consolida as observações e sugestões de melhoria para a sua API, baseadas na análise dos arquivos `server.js`, `scraper.js`, `cache.js`, `cron-jobs.js`, `Dockerfile` e `package.json`.

## 1. Melhorias Gerais e Boas Práticas

### 1.1. Centralização da Manipulação de Datas e Fusos Horários

Atualmente, a função `getFormattedDate` é implementada de forma ligeiramente diferente em `server.js` e `cron-jobs.js`. Isso pode levar a inconsistências e bugs difíceis de rastrear.

**Sugestão:** Mover a função `getFormattedDate` para um arquivo de utilitário comum (ex: `utils/dateUtils.js`) e importá-la onde for necessário. Além disso, considerar o uso de bibliotecas dedicadas como `date-fns-tz` ou `moment-timezone` para lidar com fusos horários de forma mais robusta e evitar problemas com horários de verão e transições.

### 1.2. Logging Aprimorado

O uso de `console.log` e `console.error` é adequado para desenvolvimento, mas insuficiente para ambientes de produção. Eles não oferecem formatação estruturada, níveis de log, rotação de arquivos ou integração com sistemas de monitoramento.

**Sugestão:** Implementar uma biblioteca de logging robusta como `Winston` ou `Pino`. Isso permitirá:
- **Logs Estruturados**: Facilita a análise e filtragem em ferramentas de agregação de logs.
- **Níveis de Log**: Distinguir entre `info`, `warn`, `error`, `debug`, etc.
- **Monitoramento**: Integrar com sistemas de monitoramento para alertar sobre erros críticos.

### 1.3. Variáveis de Ambiente e Configuração

Algumas configurações importantes (como `baseUrl` no `scraper.js` e padrões cron no `cron-jobs.js`) estão hardcoded. A porta do servidor já utiliza `process.env.PORT`, o que é um bom começo.

**Sugestão:** Centralizar todas as configurações que podem variar entre ambientes (desenvolvimento, produção) em variáveis de ambiente. Utilizar a biblioteca `dotenv` para carregar essas variáveis em desenvolvimento a partir de um arquivo `.env`.

### 1.4. Testes Automatizados

Não há indicação de testes automatizados no projeto. Testes são fundamentais para garantir a qualidade do código, prevenir regressões e facilitar a manutenção e evolução da API.

**Sugestão:** Implementar:
- **Testes Unitários**: Para funções individuais (ex: `getFormattedDate`, `setCache`, `getCache`, partes do `scraper.js`).
- **Testes de Integração**: Para verificar a interação entre os módulos (ex: `server.js` com `cache.js` e `scraper.js`, rotas da API).
- **Testes End-to-End (E2E)**: Para simular o fluxo completo do usuário, incluindo o scraper (embora mais complexos devido à dependência de sites externos).

### 1.5. Qualidade de Código e Padronização

Manter um código limpo e consistente é vital para a colaboração e manutenção.

**Sugestão:** Integrar ferramentas de linting e formatação:
- **ESLint**: Para identificar e relatar padrões problemáticos no código JavaScript. Configurar para seguir um guia de estilo (ex: Airbnb, Standard).
- **Prettier**: Para formatar automaticamente o código, garantindo um estilo consistente em todo o projeto.

### 1.6. Documentação

O `README.md` está vazio. Uma documentação clara é essencial para novos desenvolvedores e para a manutenção.

**Sugestão:** Expandir a documentação para incluir:
- **Instruções de Instalação e Execução**: Como configurar e rodar o projeto.
- **Endpoints da API**: Descrição das rotas, parâmetros e respostas esperadas.
- **Exemplos de Uso**: Como consumir a API.
- **Como Contribuir**: Orientações para desenvolvedores que desejam colaborar.
- **Documentação de Código (JSDoc)**: Adicionar comentários JSDoc para funções, parâmetros e retornos, especialmente em módulos exportados.

## 2. Melhorias Específicas por Arquivo

### 2.1. `server.js`

- **Tratamento de Erros Mais Robusto**: Implementar um middleware de erros global para capturar e lidar com exceções de forma centralizada. Distinguir entre erros operacionais e de programação, e fornecer mensagens de erro mais informativas em desenvolvimento e genéricas em produção.
- **Validação de Entrada**: Adicionar validação explícita para o parâmetro `dia` na rota `/jogos/:dia`. Retornar `400 Bad Request` para valores inválidos, em vez de usar um valor padrão silenciosamente.
- **Mensagens de Erro para o Usuário**: A mensagem de `503 Service Unavailable` quando o cache não está pronto é informativa. No entanto, considerar `202 Accepted` com um cabeçalho `Retry-After` se a intenção é indicar que a requisição foi aceita e o processamento está em andamento.
- **Otimização do `getFormattedDate`**: Se a manipulação manual de fuso horário for mantida, usar `getFullYear`, `getMonth`, `getDate` em vez das versões `UTC` após o ajuste de `offset` para evitar confusão.

### 2.2. `scraper.js`

- **Resiliência do Scraper**: Implementar retries com backoff exponencial para operações de rede e Puppeteer. Adicionar validações para elementos HTML esperados e logar avisos em caso de mudanças na estrutura do site. Capturar screenshots em caso de erro para facilitar a depuração.
- **Otimização de Performance do Puppeteer**: Bloquear o carregamento de recursos desnecessários (imagens, CSS, fontes) usando `page.setRequestInterception`. Considerar reutilizar a instância do browser ou implementar um pool de browsers para reduzir o overhead de inicialização e fechamento.
- **Lógica de Rolagem Otimizada**: Aprimorar a rolagem da página para carregar conteúdo dinâmico. Em vez de um tempo fixo, rolar até o final, esperar, e verificar se novos elementos foram carregados, repetindo até que não haja mais novos elementos ou um limite seja atingido. Esperar por elementos específicos em vez de um `setTimeout` fixo.
- **Seletores Mais Resilientes**: Usar seletores CSS mais específicos ou que dependam menos da estrutura HTML para evitar quebras em caso de pequenas alterações no site alvo.

### 2.3. `cache.js`

- **Operações Assíncronas**: Migrar as operações de leitura e escrita de arquivo (`fs.writeFileSync`, `fs.readFileSync`) para suas versões assíncronas (`fs.promises.writeFile`, `fs.promises.readFile`) para evitar o bloqueio do *event loop*.
- **Mecanismo de Expiração de Cache**: Adicionar um campo de `expiryTime` aos dados do cache e verificar sua validade ao recuperar. Remover caches expirados.
- **Limpeza de Cache Antigo**: Implementar uma rotina agendada para varrer o diretório `cache` e remover arquivos expirados ou muito antigos para gerenciar o espaço em disco.
- **Resiliência na Criação do Diretório**: Usar `await fs.promises.mkdir(cacheDir, { recursive: true })` para criar o diretório de cache de forma assíncrona e robusta.

### 2.4. `cron-jobs.js`

- **Notificações de Falha**: Implementar um sistema de notificação (e-mail, Slack) para alertar sobre falhas persistentes nas tarefas cron.
- **Mecanismo de Retentativa**: Adicionar um mecanismo de retentativa para `buscarJogos` dentro das funções `updateDailyCache` e `updateLiveCache` para lidar com falhas temporárias.
- **Configuração de Agendamento**: Permitir que os padrões cron sejam definidos via variáveis de ambiente para maior flexibilidade.
- **Paralelização de `updateDailyCache`**: Executar as buscas para `hoje` e `amanha` em paralelo usando `Promise.all` para reduzir o tempo total de atualização.

### 2.5. `Dockerfile`

- **Multi-stage Builds**: Utilizar multi-stage builds para criar imagens Docker menores e mais eficientes para produção, separando as dependências de build das de runtime.
- **Usuário Não-Root**: Executar a aplicação como um usuário não-root dentro do contêiner para aumentar a segurança, reduzindo o escopo de possíveis vulnerabilidades.
- **Health Checks**: Adicionar um `HEALTHCHECK` no Dockerfile para que orquestradores (como Kubernetes) possam verificar o status de saúde da aplicação.
- **`.dockerignore`**: Criar um arquivo `.dockerignore` para evitar copiar arquivos desnecessários (ex: `node_modules` local, `.git`, `cache/`) para a imagem Docker, otimizando o tamanho e o tempo de build.

### 2.6. `package.json`

- **Preencher Metadados**: Completar os campos `description`, `keywords`, `author` e `license` para melhor identificação e gerenciamento do projeto.
- **Adicionar Scripts Úteis**: Incluir scripts para desenvolvimento (`dev`), testes (`test`), linting (`lint`) e, se aplicável, build (`build`).
- **Gerenciamento de Dependências**: Realizar auditorias de segurança (`npm audit`) regularmente. Mover ferramentas de desenvolvimento para `devDependencies`. Considerar fixar versões de dependências para maior estabilidade em produção.

---

Espero que estas sugestões sejam úteis para melhorar a sua API!




## 3. Aprimoramento da Gestão de Espaço em Disco e Limpeza de Arquivos

Com base na sua preocupação com o esgotamento de memória em ambientes como um VPS devido ao acúmulo de arquivos gerados, é crucial detalhar e reforçar as estratégias de limpeza e gestão de espaço em disco. A sugestão de "Limpeza de Cache Antigo" já foi abordada na seção 2.3 (`cache.js`), mas podemos expandir e adicionar outras considerações.

### 3.1. Estratégias Detalhadas para Limpeza de Cache

A sugestão de implementar uma rotina de limpeza periódica para o diretório `cache` é fundamental. Para torná-la mais eficaz, considere os seguintes pontos:

-   **Mecanismo de Expiração Aprimorado**: Conforme sugerido para `cache.js`, cada item de cache deve ter um `expiryTime`. A rotina de limpeza deve iterar sobre os arquivos no diretório `cache`, ler seus metadados (incluindo o `expiryTime`) e remover aqueles que já expiraram. Isso garante que apenas dados relevantes e recentes sejam mantidos.
-   **Limites de Armazenamento (Opcional)**: Além da expiração por tempo, pode-se considerar a implementação de um limite de armazenamento. Por exemplo, manter apenas os últimos `N` dias de cache ou um tamanho máximo em disco para o diretório `cache`. Se o limite for excedido, os arquivos mais antigos (mesmo que não expirados) seriam removidos.
-   **Execução da Rotina de Limpeza**: A tarefa de limpeza pode ser agendada no `cron-jobs.js` (ex: uma vez por dia, em um horário de baixo tráfego) ou executada como um script separado. É importante que essa tarefa seja robusta e logue suas ações.

**Exemplo de lógica de limpeza (conceitual para `cron-jobs.js` ou script separado):**

```javascript
import fs from 'fs/promises';
import path from 'path';

const cacheDir = path.join(process.cwd(), 'cache');

async function cleanExpiredCache() {
    console.log('Iniciando rotina de limpeza de cache...');
    try {
        const files = await fs.readdir(cacheDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(cacheDir, file);
                try {
                    const data = await fs.readFile(filePath, 'utf-8');
                    const cachedItem = JSON.parse(data);
                    if (cachedItem.expiryTime && cachedItem.expiryTime < Date.now()) {
                        await fs.unlink(filePath);
                        console.log(`Cache expirado removido: ${file}`);
                    }
                } catch (readError) {
                    console.error(`Erro ao processar arquivo de cache ${file}:`, readError);
                    // Opcional: remover arquivos corrompidos
                    // await fs.unlink(filePath);
                }
            }
        }
        console.log('Rotina de limpeza de cache finalizada.');
    } catch (error) {
        console.error('Erro na rotina de limpeza de cache:', error);
    }
}

// Agendar esta função no cron-jobs.js
// cron.schedule('0 0 * * *', cleanExpiredCache, { timezone: "America/Sao_Paulo" });
```

### 3.2. Gerenciamento de Logs

Se a aplicação gerar logs em arquivos (especialmente com uma biblioteca de logging como Winston ou Pino), esses arquivos também podem crescer indefinidamente e consumir espaço em disco.

-   **Rotação de Logs**: Configurar a biblioteca de logging para realizar a rotação de logs. Isso significa que os arquivos de log serão automaticamente arquivados e/ou excluídos após atingirem um certo tamanho ou idade. Bibliotecas como `winston-daily-rotate-file` (para Winston) ou configurações nativas de Pino podem gerenciar isso.
-   **Compressão de Logs Antigos**: Opcionalmente, logs antigos podem ser compactados para economizar espaço antes de serem excluídos.

### 3.3. Otimização do Dockerfile para Limpeza

O `.dockerignore` já foi sugerido na seção 2.5 (`Dockerfile`) para evitar copiar arquivos desnecessários para a imagem. É importante garantir que o diretório `cache/` seja incluído no `.dockerignore` para que os arquivos de cache gerados localmente durante o desenvolvimento não sejam incluídos na imagem final, que deve ser o mais limpa possível.

-   **`.dockerignore` para `cache/`**: Adicionar `cache/` ao seu arquivo `.dockerignore`.

### 3.4. Monitoramento de Disco

Para proativamente evitar problemas de espaço em disco, é recomendável implementar monitoramento.

-   **Ferramentas de Monitoramento**: Utilizar ferramentas de monitoramento de sistema (como Prometheus com Node Exporter, ou soluções de cloud como AWS CloudWatch, Google Cloud Monitoring) para acompanhar o uso de disco do VPS. Configurar alertas para quando o uso de disco atingir um determinado limite (ex: 80% da capacidade).

Ao implementar essas estratégias, você terá um controle muito mais robusto sobre o espaço em disco utilizado pela sua API, prevenindo o esgotamento de memória e garantindo a estabilidade do serviço no VPS.

