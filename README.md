# scraper-worker

Worker/API intermediária para scraping de sites de compra, com arquitetura preparada para múltiplos providers por marketplace.

## Objetivo

Este projeto tem como finalidade realizar buscas em sites de e-commerce e retornar dados padronizados para sistemas consumidores.

A responsabilidade deste serviço é:

- receber uma solicitação de busca
- executar o scraper correspondente ao site solicitado
- aplicar validações técnicas e regras específicas de extração
- retornar os dados em DTOs padronizados

Este projeto **não** possui regra de negócio de domínio, persistência em banco de dados ou tratamento final do resultado.  
Essas responsabilidades ficam a cargo da API ou serviço consumidor.

## Stack

- Node.js
- Express
- Axios
- Cheerio
- Docker
- Pino

## Características do projeto

- arquitetura modular e preparada para múltiplos scrapers
- cliente HTTP centralizado
- interceptors para padronização de request/response
- tratamento global de erros
- variáveis de ambiente centralizadas
- logger estruturado
- healthcheck para validação da aplicação
- base pronta para evolução por marketplace

## Estrutura do projeto

.
├── .docker/
│   ├── docker-compose.yml
│   └── node/
│       └── Dockerfile
├── app/
│   ├── package.json
│   └── src/
│       ├── application/
│       ├── config/
│       ├── infrastructure/
│       ├── presentation/
│       ├── shared/
│       ├── app.js
│       └── server.js
├── .dockerignore
├── .gitignore
└── README.md