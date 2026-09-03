# RESPOSTAS

## Uso de IA

Usei o Claude durante todo o desenvolvimento. Não conhecia NestJS nem Next.js antes desta prova, então o uso foi tanto para aprender os conceitos quanto para escrever o código.

### Onde usei

**Normalização dos dados (`src/common/normalizers.ts`)**
Pedi ajuda para estruturar as cinco funções de normalização. Como conferi: rodei cada função isoladamente com os casos reais da planilha antes de integrar ao importador. Testei `normalizeNumber` com `145.320,00` e `88912.00` para confirmar que os dois formatos resultavam nos números corretos, e `normalizeDate` com os três formatos de data presentes na planilha.

**Importador (`src/importer/importer.ts`)**
Estruturei com ajuda a lógica de validação e rejeição. Como conferi: comparei o relatório gerado com a planilha aberta, linha a linha, confirmando que cada rejeição correspondia a um problema real. O CPF de 9 dígitos da linha 15, o CPF duplicado da linha 23, a categoria de CNH `F` da linha 19.

**API (NestJS)**
Como não conhecia o framework, pedi explicação da arquitetura de controller, service e module antes de escrever. Como conferi: testei cada rota no navegador, incluindo os casos de erro, verificando se o status HTTP e a mensagem estavam corretos. Confirmei que excluir um motorista com viagens retorna 409 com a mensagem explicando o motivo.

**Tela (Next.js)**
Mesma situação: não conhecia React nem Next.js. Como conferi: testei cada funcionalidade no navegador, incluindo o caso da exclusão bloqueada, para confirmar que a mensagem de erro da API chega até o usuário.

## Decisões tomadas

**CPF como identificador.** A planilha não tem coluna de id, e o arquivo "Leia-me" indica que o CPF é o identificador do motorista. As viagens também referenciam o motorista por CPF.

**Rigor na rejeição.** Optei por rejeitar o registro inteiro quando um campo obrigatório está inválido, inclusive categoria de CNH vazia e campo `ativo` em branco. Isso tem efeito em cascata: as viagens de um motorista rejeitado também são rejeitadas, já que não há como associá-las. A alternativa seria aceitar o motorista com o campo em branco e registrar apenas um aviso. Escolhi o caminho mais rigoroso por seguir o enunciado, que diz que uma linha que não pode ser corrigida com segurança é rejeitada, não consertada por chute.

**Ano com dois dígitos.** Datas como `19/04/24` são interpretadas como 2024. É uma suposição, mas segura no contexto, já que todos os registros da planilha são de 2024 e 2025.

**Validação em duas camadas.** As mesmas funções de normalização são usadas pelo importador e pela API, evitando duplicação de regra.

## O que eu faria diferente com mais tempo

- Escreveria testes automatizados para as funções de normalização e para as regras de negócio
- Separaria as regras de negócio em um arquivo próprio, compartilhado entre importador e API
- Substituiria os `alert` e `prompt` da tela por componentes próprios
- Adicionaria filtro por status na listagem de viagens da tela
