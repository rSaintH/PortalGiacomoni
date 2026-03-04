import { supabase } from "@/integrations/supabase/client";

// ── Tipos ──

export interface FiltroRelatorio {
  sectorId?: string;
  clientId?: string;
  status?: string;
  /** Filtra registros criados/ocorridos a partir dessa data */
  dataInicio?: string;
  /** Filtra registros criados/ocorridos até essa data */
  dataFim?: string;
}

export interface PendenciaRelatorio {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  monetary_value: number | null;
  created_at: string;
  closed_at: string | null;
  client_name: string | null;
  sector_name: string | null;
  section_name: string | null;
  created_by_name: string | null;
  comments_count: number;
}

export interface OcorrenciaRelatorio {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  occurred_at: string | null;
  monetary_value: number | null;
  created_at: string;
  client_name: string | null;
  sector_name: string | null;
  section_name: string | null;
  created_by_name: string | null;
  comments_count: number;
}

export interface ParticularidadeRelatorio {
  id: string;
  title: string;
  details: string | null;
  priority: string | null;
  tags: string[] | null;
  created_at: string;
  client_name: string | null;
  sector_name: string | null;
  section_name: string | null;
}

export interface ResumoRelatorio {
  totalPendencias: number;
  pendenciasPorStatus: Record<string, number>;
  pendenciasPorPrioridade: Record<string, number>;
  pendenciasVencidas: number;
  valorTotalPendencias: number;

  totalOcorrencias: number;
  ocorrenciasPorCategoria: Record<string, number>;
  valorTotalOcorrencias: number;

  totalParticularidades: number;
  particularidadesPorPrioridade: Record<string, number>;
}

export interface RelatorioCompleto {
  pendencias: PendenciaRelatorio[];
  ocorrencias: OcorrenciaRelatorio[];
  particularidades: ParticularidadeRelatorio[];
  resumo: ResumoRelatorio;
  filtrosAplicados: FiltroRelatorio;
  geradoEm: string;
}

// ── Helpers ──

async function fetchProfileMap(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);
  const map: Record<string, string> = {};
  profiles?.forEach((p) => {
    map[p.user_id] = p.full_name || "Sem nome";
  });
  return map;
}

// ── Buscar Pendências ──

export async function fetchPendencias(filtro: FiltroRelatorio): Promise<PendenciaRelatorio[]> {
  let query = supabase
    .from("tasks")
    .select("*, sectors(name), sections(name), clients(legal_name)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (filtro.sectorId) query = query.eq("sector_id", filtro.sectorId);
  if (filtro.clientId) query = query.eq("client_id", filtro.clientId);
  if (filtro.status) query = query.eq("status", filtro.status);
  if (filtro.dataInicio) query = query.gte("created_at", filtro.dataInicio);
  if (filtro.dataFim) query = query.lte("created_at", filtro.dataFim + "T23:59:59");

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // buscar contagem de comentários
  const taskIds = data.map((t: any) => t.id);
  const { data: comments } = await supabase
    .from("task_comments")
    .select("task_id")
    .in("task_id", taskIds);

  const commentCount: Record<string, number> = {};
  comments?.forEach((c: any) => {
    commentCount[c.task_id] = (commentCount[c.task_id] || 0) + 1;
  });

  // buscar nomes dos criadores
  const creatorIds = [...new Set(data.map((t: any) => t.created_by).filter(Boolean))];
  const profileMap = await fetchProfileMap(creatorIds);

  return data.map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    monetary_value: t.monetary_value,
    created_at: t.created_at,
    closed_at: t.closed_at,
    client_name: t.clients?.legal_name || null,
    sector_name: t.sectors?.name || null,
    section_name: t.sections?.name || null,
    created_by_name: profileMap[t.created_by] || null,
    comments_count: commentCount[t.id] || 0,
  }));
}

// ── Buscar Ocorrências ──

export async function fetchOcorrencias(filtro: FiltroRelatorio): Promise<OcorrenciaRelatorio[]> {
  let query = supabase
    .from("occurrences")
    .select("*, sectors(name), sections(name), clients(legal_name)")
    .eq("is_archived", false)
    .order("occurred_at", { ascending: false });

  if (filtro.sectorId) query = query.eq("sector_id", filtro.sectorId);
  if (filtro.clientId) query = query.eq("client_id", filtro.clientId);
  if (filtro.dataInicio) query = query.gte("occurred_at", filtro.dataInicio);
  if (filtro.dataFim) query = query.lte("occurred_at", filtro.dataFim + "T23:59:59");

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // contagem de comentários
  const occIds = data.map((o: any) => o.id);
  const { data: comments } = await supabase
    .from("occurrence_comments" as any)
    .select("occurrence_id")
    .in("occurrence_id", occIds);

  const commentCount: Record<string, number> = {};
  (comments as any[])?.forEach((c: any) => {
    commentCount[c.occurrence_id] = (commentCount[c.occurrence_id] || 0) + 1;
  });

  const creatorIds = [...new Set(data.map((o: any) => o.created_by).filter(Boolean))];
  const profileMap = await fetchProfileMap(creatorIds);

  return data.map((o: any) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    category: o.category,
    occurred_at: o.occurred_at,
    monetary_value: o.monetary_value,
    created_at: o.created_at,
    client_name: o.clients?.legal_name || null,
    sector_name: o.sectors?.name || null,
    section_name: o.sections?.name || null,
    created_by_name: profileMap[o.created_by] || null,
    comments_count: commentCount[o.id] || 0,
  }));
}

// ── Buscar Particularidades ──

export async function fetchParticularidades(filtro: FiltroRelatorio): Promise<ParticularidadeRelatorio[]> {
  let query = supabase
    .from("client_particularities")
    .select("*, sectors(name), sections(name), clients(legal_name)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (filtro.sectorId) query = query.eq("sector_id", filtro.sectorId);
  if (filtro.clientId) query = query.eq("client_id", filtro.clientId);
  if (filtro.dataInicio) query = query.gte("created_at", filtro.dataInicio);
  if (filtro.dataFim) query = query.lte("created_at", filtro.dataFim + "T23:59:59");

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  return data.map((p: any) => ({
    id: p.id,
    title: p.title,
    details: p.details,
    priority: p.priority,
    tags: p.tags,
    created_at: p.created_at,
    client_name: p.clients?.legal_name || null,
    sector_name: p.sectors?.name || null,
    section_name: p.sections?.name || null,
  }));
}

// ── Gerar Resumo ──

export function gerarResumo(
  pendencias: PendenciaRelatorio[],
  ocorrencias: OcorrenciaRelatorio[],
  particularidades: ParticularidadeRelatorio[]
): ResumoRelatorio {
  const hoje = new Date().toISOString().split("T")[0];

  // Pendências
  const pendenciasPorStatus: Record<string, number> = {};
  const pendenciasPorPrioridade: Record<string, number> = {};
  let pendenciasVencidas = 0;
  let valorTotalPendencias = 0;

  for (const p of pendencias) {
    const status = p.status || "Sem status";
    pendenciasPorStatus[status] = (pendenciasPorStatus[status] || 0) + 1;

    const prioridade = p.priority || "Sem prioridade";
    pendenciasPorPrioridade[prioridade] = (pendenciasPorPrioridade[prioridade] || 0) + 1;

    if (p.due_date && p.due_date < hoje && !["Concluída", "Cancelada"].includes(p.status || "")) {
      pendenciasVencidas++;
    }

    valorTotalPendencias += p.monetary_value || 0;
  }

  // Ocorrências
  const ocorrenciasPorCategoria: Record<string, number> = {};
  let valorTotalOcorrencias = 0;

  for (const o of ocorrencias) {
    const cat = o.category || "Sem categoria";
    ocorrenciasPorCategoria[cat] = (ocorrenciasPorCategoria[cat] || 0) + 1;
    valorTotalOcorrencias += o.monetary_value || 0;
  }

  // Particularidades
  const particularidadesPorPrioridade: Record<string, number> = {};

  for (const p of particularidades) {
    const prioridade = p.priority || "Sem prioridade";
    particularidadesPorPrioridade[prioridade] = (particularidadesPorPrioridade[prioridade] || 0) + 1;
  }

  return {
    totalPendencias: pendencias.length,
    pendenciasPorStatus,
    pendenciasPorPrioridade,
    pendenciasVencidas,
    valorTotalPendencias,
    totalOcorrencias: ocorrencias.length,
    ocorrenciasPorCategoria,
    valorTotalOcorrencias,
    totalParticularidades: particularidades.length,
    particularidadesPorPrioridade,
  };
}

// ── Relatório Completo ──

export async function fetchRelatorioCompleto(filtro: FiltroRelatorio): Promise<RelatorioCompleto> {
  const [pendencias, ocorrencias, particularidades] = await Promise.all([
    fetchPendencias(filtro),
    fetchOcorrencias(filtro),
    fetchParticularidades(filtro),
  ]);

  const resumo = gerarResumo(pendencias, ocorrencias, particularidades);

  return {
    pendencias,
    ocorrencias,
    particularidades,
    resumo,
    filtrosAplicados: filtro,
    geradoEm: new Date().toISOString(),
  };
}

// ── Agrupar por setor ──

export function agruparPorSetor<T extends { sector_name: string | null }>(
  items: T[]
): Record<string, T[]> {
  const grupos: Record<string, T[]> = {};
  for (const item of items) {
    const setor = item.sector_name || "Sem setor";
    if (!grupos[setor]) grupos[setor] = [];
    grupos[setor].push(item);
  }
  return grupos;
}

// ── Agrupar por cliente ──

export function agruparPorCliente<T extends { client_name: string | null }>(
  items: T[]
): Record<string, T[]> {
  const grupos: Record<string, T[]> = {};
  for (const item of items) {
    const cliente = item.client_name || "Sem cliente";
    if (!grupos[cliente]) grupos[cliente] = [];
    grupos[cliente].push(item);
  }
  return grupos;
}

// ── Helpers de formatação ──

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

function formatCurrency(value: number | null): string {
  if (!value) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildFilterLabel(filtro: FiltroRelatorio, nomeSetor?: string, nomeCliente?: string): string {
  const parts: string[] = [];
  if (nomeSetor) parts.push(`Setor: ${nomeSetor}`);
  else if (filtro.sectorId) parts.push(`Setor: ${filtro.sectorId}`);
  if (nomeCliente) parts.push(`Empresa: ${nomeCliente}`);
  else if (filtro.clientId) parts.push(`Empresa: ${filtro.clientId}`);
  if (filtro.status) parts.push(`Status: ${filtro.status}`);
  if (filtro.dataInicio) parts.push(`De: ${formatDate(filtro.dataInicio)}`);
  if (filtro.dataFim) parts.push(`Até: ${formatDate(filtro.dataFim)}`);
  return parts.length > 0 ? parts.join("  |  ") : "Todos os registros";
}

// ── Gerar PDF do Relatório ──

export interface OpcoesRelatorioPdf {
  /** Título customizado (padrão: "Relatório Geral") */
  titulo?: string;
  /** Incluir pendências na saída (padrão: true) */
  incluirPendencias?: boolean;
  /** Incluir ocorrências na saída (padrão: true) */
  incluirOcorrencias?: boolean;
  /** Incluir particularidades na saída (padrão: true) */
  incluirParticularidades?: boolean;
  /** Incluir resumo no início (padrão: true) */
  incluirResumo?: boolean;
  /** Nome do setor para exibir no cabeçalho */
  nomeSetor?: string;
  /** Nome do cliente para exibir no cabeçalho */
  nomeCliente?: string;
}

export async function gerarRelatorioPdf(
  relatorio: RelatorioCompleto,
  opcoes: OpcoesRelatorioPdf = {}
): Promise<Blob> {
  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;

  const {
    titulo = "Relatório Geral",
    incluirPendencias = true,
    incluirOcorrencias = true,
    incluirParticularidades = true,
    incluirResumo = true,
    nomeSetor,
    nomeCliente,
  } = opcoes;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;

  const AZUL = [30, 58, 95] as const;
  const CINZA = [107, 114, 128] as const;
  const CINZA_ESCURO = [55, 65, 81] as const;

  let cursorY = 20;

  // ── Cabeçalho ──
  doc.setFontSize(20);
  doc.setTextColor(...AZUL);
  doc.text(titulo, marginLeft, cursorY);
  cursorY += 8;

  const filterLabel = buildFilterLabel(relatorio.filtrosAplicados, nomeSetor, nomeCliente);
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  doc.text(`${filterLabel}  |  Gerado em: ${new Date().toLocaleString("pt-BR")}`, marginLeft, cursorY);
  cursorY += 5;

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(marginLeft, cursorY, pageWidth - marginRight, cursorY);
  cursorY += 8;

  // ── Resumo ──
  if (incluirResumo) {
    const r = relatorio.resumo;
    doc.setFontSize(13);
    doc.setTextColor(...AZUL);
    doc.text("Resumo", marginLeft, cursorY);
    cursorY += 6;

    const resumoData: string[][] = [];

    // Pendências
    if (incluirPendencias) {
      resumoData.push(["Pendências", String(r.totalPendencias), "", ""]);
      for (const [status, count] of Object.entries(r.pendenciasPorStatus)) {
        resumoData.push(["", "", `${status}: ${count}`, ""]);
      }
      if (r.pendenciasVencidas > 0) {
        resumoData.push(["", "", `Vencidas: ${r.pendenciasVencidas}`, ""]);
      }
      if (r.valorTotalPendencias > 0) {
        resumoData.push(["", "", "", `Valor total: ${formatCurrency(r.valorTotalPendencias)}`]);
      }
    }

    // Ocorrências
    if (incluirOcorrencias) {
      resumoData.push(["Ocorrências", String(r.totalOcorrencias), "", ""]);
      for (const [cat, count] of Object.entries(r.ocorrenciasPorCategoria)) {
        resumoData.push(["", "", `${cat}: ${count}`, ""]);
      }
      if (r.valorTotalOcorrencias > 0) {
        resumoData.push(["", "", "", `Valor total: ${formatCurrency(r.valorTotalOcorrencias)}`]);
      }
    }

    // Particularidades
    if (incluirParticularidades) {
      resumoData.push(["Particularidades", String(r.totalParticularidades), "", ""]);
      for (const [pri, count] of Object.entries(r.particularidadesPorPrioridade)) {
        resumoData.push(["", "", `${pri}: ${count}`, ""]);
      }
    }

    autoTable(doc, {
      startY: cursorY,
      head: [["Tipo", "Total", "Detalhamento", "Valores"]],
      body: resumoData,
      styles: { fontSize: 9, cellPadding: 2.5, lineColor: [209, 213, 219], lineWidth: 0.2 },
      headStyles: { fillColor: [240, 244, 255], textColor: AZUL as any, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 50 },
      },
      margin: { left: marginLeft, right: marginRight },
    });
    cursorY = (doc as any).lastAutoTable?.finalY + 10 || cursorY + 40;
  }

  // ── Tabela de Pendências ──
  if (incluirPendencias && relatorio.pendencias.length > 0) {
    // nova página se estiver perto do fim
    if (cursorY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFontSize(13);
    doc.setTextColor(...AZUL);
    doc.text(`Pendências (${relatorio.pendencias.length})`, marginLeft, cursorY);
    cursorY += 6;

    const pendBody = relatorio.pendencias.map((p, i) => [
      String(i + 1),
      p.client_name || "—",
      p.sector_name || "—",
      p.title,
      p.type || "—",
      p.priority || "—",
      p.status || "—",
      formatDate(p.due_date),
      formatCurrency(p.monetary_value),
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [["#", "Empresa", "Setor", "Título", "Tipo", "Prioridade", "Status", "Vencimento", "Valor"]],
      body: pendBody,
      styles: { fontSize: 8, cellPadding: 2, lineColor: [209, 213, 219], lineWidth: 0.2, overflow: "linebreak" },
      headStyles: { fillColor: [240, 244, 255], textColor: AZUL as any, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: "auto" },
        4: { cellWidth: 25 },
        5: { cellWidth: 22 },
        6: { cellWidth: 28 },
        7: { cellWidth: 22 },
        8: { cellWidth: 25 },
      },
      margin: { left: marginLeft, right: marginRight },
    });
    cursorY = (doc as any).lastAutoTable?.finalY + 10 || cursorY + 40;
  }

  // ── Tabela de Ocorrências ──
  if (incluirOcorrencias && relatorio.ocorrencias.length > 0) {
    if (cursorY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFontSize(13);
    doc.setTextColor(...AZUL);
    doc.text(`Ocorrências (${relatorio.ocorrencias.length})`, marginLeft, cursorY);
    cursorY += 6;

    const occBody = relatorio.ocorrencias.map((o, i) => [
      String(i + 1),
      o.client_name || "—",
      o.sector_name || "—",
      o.title,
      o.category || "—",
      formatDate(o.occurred_at),
      formatCurrency(o.monetary_value),
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [["#", "Empresa", "Setor", "Título", "Categoria", "Data", "Valor"]],
      body: occBody,
      styles: { fontSize: 8, cellPadding: 2, lineColor: [209, 213, 219], lineWidth: 0.2, overflow: "linebreak" },
      headStyles: { fillColor: [240, 244, 255], textColor: AZUL as any, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: "auto" },
        4: { cellWidth: 30 },
        5: { cellWidth: 25 },
        6: { cellWidth: 30 },
      },
      margin: { left: marginLeft, right: marginRight },
    });
    cursorY = (doc as any).lastAutoTable?.finalY + 10 || cursorY + 40;
  }

  // ── Tabela de Particularidades ──
  if (incluirParticularidades && relatorio.particularidades.length > 0) {
    if (cursorY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFontSize(13);
    doc.setTextColor(...AZUL);
    doc.text(`Particularidades (${relatorio.particularidades.length})`, marginLeft, cursorY);
    cursorY += 6;

    const partBody = relatorio.particularidades.map((p, i) => [
      String(i + 1),
      p.client_name || "—",
      p.sector_name || "—",
      p.title,
      p.priority || "—",
      p.details || "—",
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [["#", "Empresa", "Setor", "Título", "Prioridade", "Detalhes"]],
      body: partBody,
      styles: { fontSize: 8, cellPadding: 2, lineColor: [209, 213, 219], lineWidth: 0.2, overflow: "linebreak" },
      headStyles: { fillColor: [240, 244, 255], textColor: AZUL as any, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 50 },
        4: { cellWidth: 25 },
        5: { cellWidth: "auto" },
      },
      margin: { left: marginLeft, right: marginRight },
    });
    cursorY = (doc as any).lastAutoTable?.finalY + 10 || cursorY + 40;
  }

  // ── Rodapé em todas as páginas ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(
      `Portal Giacomoni — ${titulo}  |  Página ${i} de ${totalPages}`,
      marginLeft,
      pageHeight - 7
    );
  }

  return doc.output("blob");
}

// ── Atalho: buscar dados + gerar PDF de uma vez ──

export async function gerarRelatorioCompletoPdf(
  filtro: FiltroRelatorio,
  opcoes?: OpcoesRelatorioPdf
): Promise<Blob> {
  const relatorio = await fetchRelatorioCompleto(filtro);
  return gerarRelatorioPdf(relatorio, opcoes);
}

// ── Download helper (conveniência para a UI) ──

export function downloadBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
