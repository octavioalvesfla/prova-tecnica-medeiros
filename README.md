# Controle de Frota — Prova Técnica Medeiros Distribuidora

Sistema de controle de motoristas e viagens. Lê uma planilha Excel, normaliza os dados, serve por uma API REST e disponibiliza uma tela de consulta e cadastro.

## Stack

- **Backend:** NestJS + TypeScript
- **Frontend:** Next.js (App Router) + TypeScript
- **Leitura da planilha:** xlsx (SheetJS)
- **Persistência:** arquivo JSON

## Estrutura

prova-tecnica-medeiros/
├── backend/
│ ├── spreadsheet/base-dados-frota.xlsx (entrada, somente leitura)
│ ├── dados.json (gerado pela importação)
│ ├── relatorio-importacao.txt (gerado pela importação)
│ └── src/
│ ├── common/normalizers.ts funções de normalização
│ ├── importer/importer.ts script de importação
│ ├── database/ leitura e gravação do JSON
│ ├── drivers/ motoristas (controller, service, module)
│ └── trips/ viagens (controller, service, module)
└── frontend/
└── app/page.tsx tela

## Como rodar

### 1. Backend

```bash
cd backend
npm install
```

### 2. Importar a planilha

```bash
npm run import
```

Lê `spreadsheet/base-dados-frota.xlsx`, normaliza os dados e gera `dados.json` e `relatorio-importacao.txt`. O script é idempotente: rodar duas vezes produz o mesmo resultado. A planilha original nunca é alterada.

### 3. Subir a API

```bash
npm run start:dev
```

API disponível em `http://localhost:3001`.

### 4. Subir a tela

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Tela disponível em `http://localhost:3000`.

## Endpoints

### Motoristas

| Método | Rota                      | Descrição                                      |
| ------ | ------------------------- | ---------------------------------------------- |
| GET    | `/motoristas`             | lista com paginação, busca, filtro e ordenação |
| GET    | `/motoristas/:id`         | detalhe                                        |
| POST   | `/motoristas`             | cria                                           |
| PATCH  | `/motoristas/:id`         | atualiza                                       |
| DELETE | `/motoristas/:id`         | remove                                         |
| GET    | `/motoristas/:id/viagens` | viagens do motorista                           |

Parâmetros da listagem:

- `?page=1&limit=20` — paginação, retorna `total` na resposta
- `?busca=joao` — busca parcial por nome ou CPF
- `?ativo=true` — filtro por status
- `?ordenarPor=nome&ordem=asc` — ordenação

### Viagens

| Método | Rota           | Descrição                             |
| ------ | -------------- | ------------------------------------- |
| GET    | `/viagens`     | lista com filtro por status e período |
| GET    | `/viagens/:id` | detalhe                               |
| POST   | `/viagens`     | cria                                  |
| PATCH  | `/viagens/:id` | atualiza                              |
| DELETE | `/viagens/:id` | remove                                |

Parâmetros da listagem:

- `?status=CONCLUIDA` — filtro por status
- `?inicio=2025-03-01&fim=2025-04-30` — filtro por período de saída

## Normalizações aplicadas

| Campo                 | Tratamento                                                                  |
| --------------------- | --------------------------------------------------------------------------- |
| CPF                   | remove pontuação, exige 11 dígitos                                          |
| Nome                  | remove espaços nas pontas                                                   |
| Categoria CNH         | converte para maiúscula, aceita apenas A–E                                  |
| ativo                 | converte Sim/Nao/S/N/1/0 para booleano                                      |
| Datas                 | converte `dd/mm/aaaa`, `dd/mm/aa` e `aaaa-mm-dd` para ISO                   |
| km_inicial / km_final | converte formato brasileiro (`145.320,00`) e americano (`88912.00`)         |
| status                | remove acento, normaliza espaço e caixa, aceita apenas os 4 valores válidos |

## Regras de negócio

Aplicadas tanto na importação quanto na API:

1. CPF deve ter 11 dígitos e ser único
2. Não é permitido excluir motorista que possua viagens (409)
3. `data_retorno` não pode ser anterior a `data_saida`
4. `km_final` não pode ser menor que `km_inicial`
5. Motorista inativo não pode receber nova viagem
6. Um motorista não pode ter duas viagens `EM_ANDAMENTO` simultâneas
7. Para status `CONCLUIDA`, `data_retorno` e `km_final` são obrigatórios

Erros de regra de negócio retornam status HTTP apropriado (400, 404, 409) com mensagem legível em JSON.

## Resultado da importação

- 19 motoristas aceitos, 5 rejeitados
- 38 viagens aceitas, 17 rejeitadas

O relatório completo, com o número da linha na planilha e o motivo de cada rejeição, é impresso no terminal e gravado em `backend/relatorio-importacao.txt`.

O número de rejeições de viagens ficou alto porque optei por rejeitar o motorista inteiro quando um campo obrigatório está inválido, e isso derruba as viagens dele em cascata. Documentei essa decisão no RESPOSTAS.md.
