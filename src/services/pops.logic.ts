// ── POP (Procedimento Operacional Padrão) Logic ──
// Centralized POP scope filtering extracted from ClientSectorView.

export interface PopLike {
  sector_id: string;
  scope: string;
  client_id?: string | null;
  tag_ids?: string[] | null;
  [key: string]: unknown;
}

/**
 * Filter POPs that apply to a given client in a given sector.
 * Scope rules:
 * - "Geral": always visible in the sector
 * - "Cliente": visible only if the POP's client_id matches
 * - "Tag": visible if the POP shares at least one tag with the client
 */
export function filterPopsByScope(
  pops: PopLike[],
  sectorId: string,
  clientId: string,
  clientTagIds: string[],
): PopLike[] {
  return pops.filter((p) => {
    if (p.sector_id !== sectorId) return false;
    if (p.scope === "Geral") return true;
    if (p.scope === "Cliente" && p.client_id === clientId) return true;
    if (p.scope === "Tag") {
      return p.tag_ids?.some((tagId: string) => clientTagIds.includes(tagId)) ?? false;
    }
    return false;
  });
}
