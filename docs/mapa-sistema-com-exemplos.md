# Mapa do Sistema com Exemplos (copia didatica)

Objetivo deste arquivo: servir como manual pratico. Em cada parte voce vai ver:

- para que aquilo serve
- o que da para mudar ali
- um exemplo real de manutencao

---

## 1) Visao geral rapida

- Tipo: SPA React + Vite + TypeScript.
- UI: shadcn/ui + Tailwind.
- Estado remoto: TanStack Query (`react-query`).
- Backend: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions).

Fluxo base:

1. `src/main.tsx` monta o app.
2. `src/App.tsx` define rotas e protecao.
3. `src/lib/auth.tsx` resolve usuario/cargo/setor.
4. `src/hooks/useSupabaseQuery.ts` + `src/services/query.service.ts` leem dados.
5. `src/services/*.service.ts` (e alguns componentes) gravam dados.

Exemplo do que da para fazer aqui:

- "Quero adicionar uma nova tela 'Financeiro'"
  - criar `src/pages/Financeiro.tsx`
  - registrar rota em `src/App.tsx`
  - adicionar item de menu em `src/components/AppLayout.tsx`

---

## 2) Estrutura de pastas (com exemplo de uso)

| Pasta/arquivo | Para que serve | Exemplo do que voce faz ali |
| --- | --- | --- |
| `src/pages` | telas de rota | mudar layout/filtro da tela de Pendencias (`Tasks.tsx`) |
| `src/components` | componentes reutilizaveis e formularios | adicionar novo campo no formulario de cliente (`ClientFormDialog.tsx`) |
| `src/components/admin` | administracao | criar opcao nova em permissoes (`PermissionsAdmin.tsx`) |
| `src/hooks/useSupabaseQuery.ts` | hooks de leitura + query keys | criar hook `useInvoices()` para nova tabela |
| `src/services/query.service.ts` | consultas de leitura no Supabase | adicionar `fetchInvoicesByClient(clientId)` |
| `src/services/*.service.ts` | mutacoes/escritas | criar funcao `createInvoice(...)` |
| `src/services/*.logic.ts` | regras puras sem banco | mudar regra de status da REINF em `reinf.logic.ts` |
| `src/lib/auth.tsx` | sessao/cargo/setor no app inteiro | ajustar comportamento de logout |
| `src/services/permissions.logic.ts` | regra de acesso | liberar aba X para supervisao |
| `supabase/migrations` | schema SQL | criar coluna nova em `clients` |
| `supabase/functions` | edge functions | ajustar criacao de usuario admin |

Exemplo rapido:

- "Quero criar um novo filtro de busca de clientes por grupo"
  - UI/filtro: `src/pages/Clients.tsx`
  - se precisar query nova: `src/services/query.service.ts`

---

## 3) Providers e ponto de entrada

Arquivo principal: `src/App.tsx`.

Ordem atual:

1. `QueryClientProvider`
2. `TooltipProvider`
3. `BrowserRouter`
4. `ThemeProvider`
5. `AuthProvider`
6. `Routes`

Exemplo do que da para fazer aqui:

- "Quero bloquear acesso a uma rota para colaborador"
  - manter `ProtectedRoute`
  - dentro da pagina alvo (ex: `Management.tsx`) usar regra de permissao e redirecionar para `/`

Exemplo tecnico real:

- Regra de senha obrigatoria ja existe:
  - se `mustChangePassword=true`, usuario vai para `/change-password`
  - arquivos: `src/App.tsx`, `src/lib/auth.tsx`, `src/services/auth.service.ts`

---

## 4) Mapa de rotas com exemplo pratico por tela

| Rota | Tela | O que voce costuma mudar | Exemplo pratico |
| --- | --- | --- | --- |
| `/` | `src/pages/Index.tsx` | dashboard e busca de cliente | incluir card "clientes sem cnpj" |
| `/login` | `src/pages/Login.tsx` | UX de login e cadastro | trocar texto de erro de dominio |
| `/change-password` | `src/pages/ChangePassword.tsx` | regra de troca de senha | aumentar minimo de 6 para 8 chars |
| `/clients` | `src/pages/Clients.tsx` | filtros/lista/favoritos | novo filtro por status "Ativo" |
| `/clients/:id` | `src/pages/ClientDetail.tsx` | resumo do cliente | exibir campo novo `billing_email` |
| `/clients/:id/sector/:sectorId` | `src/pages/ClientSectorView.tsx` | operacao do cliente por setor | ocultar aba POP para colaborador |
| `/pops` | `src/pages/Pops.tsx` | biblioteca geral de POP | ordenar por "atualizado em" |
| `/pops/:popId` | `src/pages/PopView.tsx` | visualizacao e PDF | mudar cabecalho do PDF |
| `/tasks` | `src/pages/Tasks.tsx` | filtros e relatorio | adicionar filtro "com valor monetario" |
| `/occurrences` | `src/pages/Occurrences.tsx` | filtros e relatorio | filtrar por intervalo de datas |
| `/particularities` | `src/pages/Particularities.tsx` | lista e arquivamento | mostrar somente prioridade Alta por padrao |
| `/reinf` | `src/pages/Reinf.tsx` | fluxo trimestral | travar edicao apos status "enviado" |
| `/documents` | `src/pages/Documents.tsx` | checklist e PDF em massa | incluir logo no PDF |
| `/accounting-ready` | `src/pages/AccountingReady.tsx` | cruzamento docs x fiscal | adicionar alerta de cnpj invalido |
| `/management` | `src/pages/Management.tsx` | conferencia mensal | aumentar meses visiveis de 6 para 12 |
| `/admin` | `src/pages/Admin.tsx` | abas administrativas | criar aba "Auditoria" |
| `/customization` | `src/pages/Customization.tsx` | paleta visual | salvar tema padrao por cargo |
| `/export-data` | `src/pages/ExportData.tsx` | export banco | incluir tabela nova no export |
| `/import-data` | `src/pages/ImportData.tsx` | gerar SQL de import | melhorar relatorio de fallback de usuarios |

---

## 5) Mapa por dominio (com exemplo por parte)

### Clientes

Arquivos principais:

- `src/pages/Clients.tsx`
- `src/components/ClientFormDialog.tsx`
- `src/services/clients.service.ts`

Tabelas:

- `clients`, `client_sector_styles`, `client_tags`, `client_partners`, `client_favorites`, `client_particularities`

Exemplo real:

- "Quero cadastrar campo 'inscricao_estadual' no cliente"
  1. migration em `supabase/migrations`
  2. atualizar tipo em `src/integrations/supabase/types.ts`
  3. adicionar campo no formulario (`ClientFormDialog.tsx`)
  4. incluir no `saveClientWithRelations` (`clients.service.ts`)
  5. exibir na tela de detalhe (`ClientDetail.tsx`)

### Pendencias (Tasks)

Arquivos principais:

- `src/pages/Tasks.tsx`
- `src/components/TaskFormDialog.tsx`
- `src/services/tasks.logic.ts`

Tabelas:

- `tasks`, `task_comments`

Exemplo real:

- "Quero novo status 'Bloqueada'"
  1. cadastrar em `parameter_options` (aba Admin > Parametros)
  2. validar filtros em `Tasks.tsx`
  3. revisar regra de fechado em `src/lib/constants.ts` (`CLOSED_TASK_STATUSES`)

### Ocorrencias

Arquivos principais:

- `src/pages/Occurrences.tsx`
- `src/components/OccurrenceFormDialog.tsx`

Tabelas:

- `occurrences`, `occurrence_comments`

Exemplo real:

- "Quero categoria 'Risco Alto'"
  1. incluir em `parameter_options` tipo `occurrence_category`
  2. filtro ja passa a mostrar automaticamente

### Particularidades

Arquivos principais:

- `src/pages/Particularities.tsx`
- `src/components/ParticularityFormDialog.tsx`
- `src/services/relatorioPendencias.ts`

Tabela:

- `client_particularities`

Exemplo real:

- "Quero arquivar em lote por cliente"
  - implementar acao em `Particularities.tsx`
  - atualizar query key `all_particularities` apos a mutacao

### POPs

Arquivos principais:

- `src/pages/Pops.tsx`
- `src/components/PopFormDialog.tsx`
- `src/components/PopViewDialog.tsx`
- `src/services/pops.service.ts`
- `src/components/RichTextEditor.tsx`

Tabelas/storage:

- `pops`, `pop_versions`, `client_pop_notes`, bucket `pop-images`

Exemplo real:

- "Quero limitar upload de imagem a 3MB"
  - validar tamanho no `RichTextEditor.tsx` antes de chamar `uploadPopImage`

### Documentos

Arquivos principais:

- `src/pages/Documents.tsx`
- `src/components/DocumentMonthlyChecklist.tsx`
- `src/components/DocumentTypeManager.tsx`
- `src/services/documents.service.ts`
- `src/services/documents.logic.ts`

Tabelas:

- `document_types`, `document_monthly_status`, `document_report_logs`, `doc_tags`, `document_type_doc_tags`

Exemplo real:

- "Quero que documento Irrelevante nunca apareca no PDF"
  - regra de filtro em `src/services/documents.logic.ts` (na geracao do PDF)

### Gerencia

Arquivos principais:

- `src/pages/Management.tsx`
- `src/services/management.logic.ts`
- `src/services/management.service.ts`
- `src/components/admin/ManagementAdmin.tsx`

Tabelas:

- `management_config`, `management_reviews`

Exemplo real:

- "Quero 3 conferentes ao inves de 2"
  1. ajustar configuracao (`management_config`)
  2. alterar tela Admin (`ManagementAdmin.tsx`)
  3. atualizar render e logica da tela `Management.tsx`

### REINF

Arquivos principais:

- `src/pages/Reinf.tsx`
- `src/services/reinf.logic.ts`
- `src/services/reinf.service.ts`

Tabelas:

- `reinf_entries`, `reinf_partner_profits`, `reinf_logs`, `client_partners`

Exemplo real:

- "Quero impedir volta de status depois de enviado"
  - bloquear em `buildRevertMesStatusUpdate` (`reinf.logic.ts`)

### Contabilidades prontas / fiscal sync

Arquivos principais:

- `src/pages/AccountingReady.tsx`
- `src/services/accounting.logic.ts`
- `src/services/accounting.service.ts`

Tabelas/RPC:

- `fator_r_fiscal_sync`, `fator_r_sync_cursor`, rpc `run_fator_r_fiscal_pull`

Exemplo real:

- "Quero mostrar ultima hora de sincronizacao"
  - usar `fetchFatorSyncCursor()` em `AccountingReady.tsx`

### Admin

Arquivos principais:

- `src/pages/Admin.tsx`
- `src/components/admin/*`
- `src/services/admin.service.ts`

Exemplo real:

- "Quero impedir supervisao de editar senha de usuarios"
  - regra no `UsersAdmin.tsx` (UI)
  - reforco na edge function `update-user` (backend)

---

## 6) Autenticacao e permissoes (com exemplos)

### Autenticacao

Arquivos:

- `src/lib/auth.tsx`
- `src/services/auth.service.ts`

Tabelas:

- `user_roles`, `profiles`

Exemplo real:

- "Quero trocar dominio permitido para @empresa.com"
  - frontend: `ALLOWED_DOMAIN` em `auth.service.ts`
  - backend: valida no `supabase/functions/register-user/index.ts`

### Permissoes

Arquivos:

- `src/services/permissions.logic.ts`
- `src/components/admin/PermissionsAdmin.tsx`

Tabela:

- `permission_settings`

Exemplo real:

- "Somente setor Fiscal pode ver Contabilidades Prontas"
  1. abrir Admin > Permissoes
  2. chave `view_accounting_ready`
  3. marcar apenas setor Fiscal

---

## 7) Onde mexer para cada tipo de ajuste (com mini receita)

### Receita A: adicionar item de menu

- Arquivo: `src/components/AppLayout.tsx`
- Fazer:
  1. incluir em `navItems`
  2. se precisar permissao, definir `permKey`

Exemplo:

- adicionar "Financeiro" com `permKey: "view_finance"`.

### Receita B: criar nova pagina

- Arquivos:
  - `src/pages/NovaPagina.tsx`
  - `src/App.tsx`
  - opcional `src/components/AppLayout.tsx`

Exemplo:

- criar pagina `/auditoria` e colocar no menu Admin.

### Receita C: alterar formulario

- Arquivo UI: componente de formulario (`ClientFormDialog`, `PopFormDialog`, etc.)
- Arquivo de persistencia: `src/services/*`

Exemplo:

- novo campo em task:
  - UI em `TaskFormDialog.tsx`
  - gravacao em `tasks` (hoje no proprio componente)

### Receita D: alterar relatorio PDF

- Arquivo: `src/services/relatorioPendencias.ts` ou `src/services/documents.logic.ts`

Exemplo:

- incluir coluna "Responsavel" na tabela do PDF de pendencias.

### Receita E: alterar permissao de acesso

- Regras: `src/services/permissions.logic.ts`
- Config admin: `PermissionsAdmin.tsx` + tabela `permission_settings`

Exemplo:

- liberar `Management` para `supervisao` via `view_management`.

---

## 8) Excecoes importantes (onde a escrita esta espalhada)

Hoje existe escrita direta no componente/pagina (nao centralizada em service):

- `src/components/TaskFormDialog.tsx`
- `src/components/OccurrenceFormDialog.tsx`
- `src/components/ParticularityFormDialog.tsx`
- `src/pages/Particularities.tsx` (arquivamento)

Exemplo de impacto:

- voce altera regra de task em `tasks.service.ts`, mas a tela continua gravando diferente porque `TaskFormDialog.tsx` nao usa esse service.

Checklist antes de mexer:

1. buscar `supabase.from(` na area.
2. garantir que nao existem duas regras diferentes para a mesma acao.

Comando util:

```bash
rg -n "supabase\.from\(" src
```

---

## 9) Variaveis de ambiente (com exemplo de uso)

Arquivo: `.env.local`

Chaves detectadas:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_OLD_URL`
- `VITE_SUPABASE_OLD_PUBLISHABLE_KEY`

Exemplos:

- app nao sobe e mostra erro de env: conferir `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- exportar banco antigo localmente: usa `VITE_SUPABASE_OLD_URL` no `ExportData.tsx` quando em localhost.

---

## 10) Fluxo seguro de manutencao (com exemplo completo)

Passos:

1. rodar `npm run dev`
2. achar rota em `src/App.tsx`
3. abrir pagina em `src/pages`
4. mapear leitura (`useSupabaseQuery`) e escrita (`service` ou `supabase` direto)
5. se mudar schema: migration + types + query + UI
6. validar `npm run lint` e `npm run test`

Exemplo completo: "Adicionar campo `billing_email` em clientes"

1. SQL migration criando coluna em `clients`.
2. atualizar `src/integrations/supabase/types.ts`.
3. adicionar input em `ClientFormDialog.tsx`.
4. incluir campo no `saveClientWithRelations` (`clients.service.ts`).
5. exibir em `ClientDetail.tsx`.
6. testar criar/editar cliente.

---

## 11) Arquivos-chave para voce dominar (com treino)

Arquivos:

- `src/App.tsx`
- `src/components/AppLayout.tsx`
- `src/lib/auth.tsx`
- `src/hooks/useSupabaseQuery.ts`
- `src/services/query.service.ts`
- `src/services/permissions.logic.ts`
- `src/services/clients.service.ts`
- `src/services/pops.service.ts`
- `src/services/documents.service.ts`
- `src/services/reinf.service.ts`
- `src/components/admin/UsersAdmin.tsx`
- `src/components/admin/PermissionsAdmin.tsx`

Exercicio pratico sugerido (1 dia):

1. trocar nome de um item do menu
2. adicionar filtro simples na tela de clientes
3. criar parametro novo em Admin > Parametros
4. gerar um PDF de relatorio para validar

Se esses 4 funcionarem, voce ja domina o fluxo principal do sistema.
