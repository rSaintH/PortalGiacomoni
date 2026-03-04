# Mapa do Sistema (guia de manutencao)



## 1) Visao geral rapida

- Tipo: SPA React + Vite + TypeScript.
- UI: shadcn/ui + Tailwind.
- Estado remoto: TanStack Query (`react-query`).
- Backend: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions).
- Build/deploy: Vite (`npm run build`), com `vercel.json` no repo.

Fluxo base:

1. `src/main.tsx` monta o app.
2. `src/App.tsx` registra providers e rotas.
3. `src/lib/auth.tsx` carrega sessao, cargo e perfil.
4. Paginas usam hooks de `src/hooks/useSupabaseQuery.ts` para leitura.
5. Mutacoes ficam em `src/services/*.service.ts` (com algumas excecoes, ver secao 8).

## 2) Estrutura de pastas (o que procurar primeiro)

- `src/pages`: telas (rotas).
- `src/components`: componentes de tela/formulario.
- `src/components/admin`: painel administrativo.
- `src/hooks/useSupabaseQuery.ts`: todos os hooks de leitura (query keys do React Query).
- `src/services/query.service.ts`: leituras SQL no Supabase.
- `src/services/*.service.ts`: escritas/mutacoes por dominio.
- `src/services/*.logic.ts`: regras puras de negocio (sem IO).
- `src/lib/auth.tsx`: contexto de autenticacao.
- `src/services/permissions.logic.ts`: regras de permissao por cargo/setor.
- `src/integrations/supabase/client.ts`: cliente Supabase e env vars obrigatorias.
- `src/integrations/supabase/types.ts`: tipos de banco gerados.
- `supabase/migrations`: historico SQL.
- `supabase/functions`: edge functions (`register-user`, `create-user`, `update-user`).

## 3) Providers e pontos de entrada

Arquivo principal de composicao: `src/App.tsx`.

Ordem:

1. `QueryClientProvider`
2. `TooltipProvider`
3. `BrowserRouter`
4. `ThemeProvider`
5. `AuthProvider`
6. Rotas com `ProtectedRoute`

Regra de autenticacao:

- `ProtectedRoute` exige usuario logado.
- Se `mustChangePassword=true`, redireciona para `/change-password`.

## 4) Mapa de rotas

| Rota | Tela | Onde ler dados | Onde gravar dados |
| --- | --- | --- | --- |
| `/` | `src/pages/Index.tsx` | hooks (`clients`, `tasks`, `occurrences`, docs) | sem escrita principal |
| `/login` | `src/pages/Login.tsx` | `auth.service` | login/cadastro |
| `/change-password` | `src/pages/ChangePassword.tsx` | auth context | `changePasswordAndClearFlag` |
| `/clients` | `src/pages/Clients.tsx` | `useClients`, `useTags` | favoritos + abre `ClientFormDialog` |
| `/clients/:id` | `src/pages/ClientDetail.tsx` | cliente + estilos + tags + permissoes | edicao via `ClientFormDialog` |
| `/clients/:id/sector/:sectorId` | `src/pages/ClientSectorView.tsx` | tasks/pops/ocorrencias/particularidades | formularios de task/occ/pop/particularidade |
| `/pops` | `src/pages/Pops.tsx` | `usePops` | criar/editar/excluir POP |
| `/pops/:popId` | `src/pages/PopView.tsx` | `fetchPopById` | sem escrita |
| `/tasks` | `src/pages/Tasks.tsx` | `useTasksWithComments` | cria/edita task + comentarios + relatorio PDF |
| `/occurrences` | `src/pages/Occurrences.tsx` | `useOccurrencesWithComments` | cria ocorrencia + comentarios + relatorio PDF |
| `/particularities` | `src/pages/Particularities.tsx` | `useAllParticularities` | cria/arquiva particularidade + relatorio PDF |
| `/reinf` | `src/pages/Reinf.tsx` | `reinf.service` + hooks | entradas, lucros, status e logs REINF |
| `/documents` | `src/pages/Documents.tsx` | tipos/status/logs docs | checklist mensal + gestao tipos + gerar PDF/ZIP |
| `/accounting-ready` | `src/pages/AccountingReady.tsx` | docs + sincronismo fiscal | filtros e pull fiscal via RPC |
| `/management` | `src/pages/Management.tsx` | config + reviews + profiles | marca/desmarca conferencias |
| `/admin` | `src/pages/Admin.tsx` | componentes admin | setores, secoes, usuarios, permissoes, tags etc |
| `/customization` | `src/pages/Customization.tsx` | paletas do usuario | salvar/atualizar/remover paletas |
| `/export-data` | `src/pages/ExportData.tsx` | leitura de todas tabelas | export JSON |
| `/import-data` | `src/pages/ImportData.tsx` | arquivo JSON | gera SQL de importacao |

## 5) Mapa por dominio (tela -> servico -> tabela)

### Clientes

- Tela/lista: `src/pages/Clients.tsx`
- Formulario: `src/components/ClientFormDialog.tsx`
- Escrita principal: `src/services/clients.service.ts`
- Tabelas: `clients`, `client_sector_styles`, `client_tags`, `client_partners`, `client_favorites`, `client_particularities`.

### Pendencias (Tasks)

- Tela: `src/pages/Tasks.tsx`
- Formulario: `src/components/TaskFormDialog.tsx`
- Regras: `src/services/tasks.logic.ts`
- Servico (tambem existe): `src/services/tasks.service.ts`
- Tabelas: `tasks`, `task_comments`.

### Ocorrencias

- Tela: `src/pages/Occurrences.tsx`
- Formulario: `src/components/OccurrenceFormDialog.tsx`
- Tabelas: `occurrences`, `occurrence_comments`.

### Particularidades

- Tela: `src/pages/Particularities.tsx`
- Formulario: `src/components/ParticularityFormDialog.tsx`
- Relatorios: `src/services/relatorioPendencias.ts`
- Tabela: `client_particularities`.

### POPs

- Biblioteca: `src/pages/Pops.tsx`
- Visualizacao: `src/pages/PopView.tsx` + `src/components/PopViewDialog.tsx`
- Formulario: `src/components/PopFormDialog.tsx`
- Regras: `src/services/pops.logic.ts`
- Servico: `src/services/pops.service.ts`
- Tabelas: `pops`, `pop_versions`, `client_pop_notes`.
- Storage bucket: `pop-images` (upload no `RichTextEditor`).

### Documentos

- Tela: `src/pages/Documents.tsx`
- Checklist mensal: `src/components/DocumentMonthlyChecklist.tsx`
- Gestao de tipos: `src/components/DocumentTypeManager.tsx`
- Logica de PDF/ZIP: `src/services/documents.logic.ts`
- Escritas: `src/services/documents.service.ts`
- Tabelas: `document_types`, `document_monthly_status`, `document_report_logs`, `doc_tags`, `document_type_doc_tags`.

### Gerencia

- Tela: `src/pages/Management.tsx`
- Logica: `src/services/management.logic.ts`
- Mutacao: `src/services/management.service.ts`
- Config admin: `src/components/admin/ManagementAdmin.tsx`
- Tabelas: `management_config`, `management_reviews`.

### REINF

- Tela: `src/pages/Reinf.tsx`
- Regras de transicao: `src/services/reinf.logic.ts`
- IO: `src/services/reinf.service.ts`
- Tabelas: `reinf_entries`, `reinf_partner_profits`, `reinf_logs`, `client_partners`.

### Contabilidades prontas / fiscal sync

- Tela: `src/pages/AccountingReady.tsx`
- Logica: `src/services/accounting.logic.ts`
- IO: `src/services/accounting.service.ts`
- Tabelas: `fator_r_fiscal_sync`, `fator_r_sync_cursor`
- RPC: `run_fator_r_fiscal_pull`.

### Admin

- Container: `src/pages/Admin.tsx`
- Componentes: `src/components/admin/*` + `src/components/ParametersAdmin.tsx` + `src/components/ClientCsvImport.tsx`
- Servicos: `src/services/admin.service.ts`, `src/services/parameters.service.ts`, `src/services/clients.service.ts`.

## 6) Autenticacao e permissoes

### Autenticacao

- Contexto: `src/lib/auth.tsx`
- Service: `src/services/auth.service.ts`
- Busca:
  - `user_roles` (cargo)
  - `profiles` (setor, `must_change_password`)

### Permissoes

- Regras centrais: `src/services/permissions.logic.ts`
- Configuracao dinamica (banco): tabela `permission_settings`
- Tela admin para configurar: `src/components/admin/PermissionsAdmin.tsx`
- Uso nas paginas/menu:
  - `AppLayout` (itens de menu)
  - `AccountingReady`
  - `Management`
  - `ClientDetail` / `ClientSectorView` (restricao por setor)
  - `Index` (dashboard visivel)

## 7) Onde mexer para cada tipo de ajuste

- Adicionar/remover item no menu lateral:
  - `src/components/AppLayout.tsx` (`navItems`).

- Criar nova rota/tela:
  1. criar `src/pages/NovaTela.tsx`
  2. registrar lazy import + `<Route>` em `src/App.tsx`
  3. opcional: adicionar no menu em `AppLayout.tsx`

- Alterar regra de acesso por cargo/setor:
  - `src/services/permissions.logic.ts`
  - e, se parametrico, `permission_settings` + `PermissionsAdmin`.

- Alterar dominio de email permitido no login/cadastro:
  - frontend: `src/services/auth.service.ts` (`ALLOWED_DOMAIN`)
  - backend: `supabase/functions/register-user/index.ts`.

- Mudar workflow de troca de senha obrigatoria:
  - `src/services/auth.service.ts` (`changePasswordAndClearFlag`)
  - `src/pages/ChangePassword.tsx`
  - edge function `create-user`/`update-user` (campo `must_change_password`).

- Alterar status/tipo/prioridade de pendencia e categoria de ocorrencia:
  - tabela `parameter_options`
  - tela admin: `src/components/ParametersAdmin.tsx`

- Mudar formulario de cliente:
  - UI: `src/components/ClientFormDialog.tsx`
  - persistencia: `src/services/clients.service.ts`

- Mudar formulario de POP:
  - UI: `src/components/PopFormDialog.tsx`
  - persistencia: `src/services/pops.service.ts`
  - editor/imagem: `src/components/RichTextEditor.tsx`

- Mudar checklist de documentos:
  - `src/components/DocumentMonthlyChecklist.tsx`
  - `src/services/documents.service.ts`

- Mudar logica de PDF de documentos:
  - `src/services/documents.logic.ts`

- Mudar relatorio geral (pendencias/ocorrencias/particularidades):
  - `src/services/relatorioPendencias.ts`

- Mudar dashboard inicial:
  - `src/pages/Index.tsx`
  - regras agregadas em `src/services/dashboard.logic.ts`

- Mudar fluxo de REINF (status e transicoes):
  - `src/services/reinf.logic.ts`
  - efeitos no banco em `src/pages/Reinf.tsx` + `src/services/reinf.service.ts`

- Mudar usuarios/cargos/setores no admin:
  - UI: `src/components/admin/UsersAdmin.tsx`
  - backend: `src/services/admin.service.ts`
  - edge functions: `supabase/functions/create-user`, `update-user`

## 8) Excecoes importantes (pontos de atencao)

Nem toda escrita passa por `*.service.ts`. Hoje existem escritas diretas no componente/pagina:

- `src/components/TaskFormDialog.tsx` grava `tasks` direto.
- `src/components/OccurrenceFormDialog.tsx` grava `occurrences` direto.
- `src/components/ParticularityFormDialog.tsx` grava `client_particularities` direto.
- `src/pages/Tasks.tsx`, `src/pages/Occurrences.tsx`, `src/pages/Particularities.tsx` criam canais realtime direto.
- `src/pages/Particularities.tsx` arquiva particularidade com `supabase.from(...)` direto.

Impacto:

- manutencao fica espalhada;
- mesma regra pode existir em mais de um lugar.

Quando for mexer nesses modulos, sempre busque primeiro por `supabase.from(` no projeto.

## 9) Variaveis de ambiente usadas

Arquivo local: `.env.local`.

Chaves identificadas:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_OLD_URL`
- `VITE_SUPABASE_OLD_PUBLISHABLE_KEY`

Obrigatorias para subir app: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`).

## 10) Fluxo seguro para manutencao (checklist)

1. Rodar app: `npm run dev`.
2. Encontrar tela/rota em `src/App.tsx`.
3. Abrir pagina em `src/pages/...`.
4. Identificar leitura (`useSupabaseQuery`) e escrita (`services` ou `supabase` direto).
5. Se alterar estrutura de dados:
   - criar migration em `supabase/migrations`
   - atualizar tipos em `src/integrations/supabase/types.ts`
   - ajustar query service + formularios + invalidacoes de query.
6. Validar:
   - `npm run lint`
   - `npm run test`

Comando util para regenerar tipos (quando usar Supabase CLI):

```bash
supabase gen types typescript --project-id "$VITE_SUPABASE_PROJECT_ID" --schema public > src/integrations/supabase/types.ts
```

## 11) Arquivos-chave para decorar

Se voce decorar estes 12 arquivos, ja consegue manter 80% do sistema:

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

---

Se quiser, no proximo passo eu posso montar um **mapa visual por fluxo** (ex: "clicou em Salvar task -> arquivos/tabelas executados") para voce usar como cola diaria.
