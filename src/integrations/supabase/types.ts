export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      document_types: {
        Row: {
          id: string
          client_id: string
          name: string
          classification: string
          is_active: boolean
          include_in_report: boolean
          order_index: number
          internal_observation: string | null
          created_by: string | null
          created_at: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          classification?: string
          is_active?: boolean
          include_in_report?: boolean
          order_index?: number
          internal_observation?: string | null
          created_by?: string | null
          created_at?: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          classification?: string
          is_active?: boolean
          include_in_report?: boolean
          order_index?: number
          internal_observation?: string | null
          created_by?: string | null
          created_at?: string
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_types_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_tags: {
        Row: {
          id: string
          name: string
          color: string | null
          text_color: string | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          text_color?: string | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          text_color?: string | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      document_type_doc_tags: {
        Row: {
          id: string
          document_type_id: string
          doc_tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          document_type_id: string
          doc_tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          document_type_id?: string
          doc_tag_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_type_doc_tags_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_type_doc_tags_doc_tag_id_fkey"
            columns: ["doc_tag_id"]
            isOneToOne: false
            referencedRelation: "doc_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      document_monthly_status: {
        Row: {
          id: string
          document_type_id: string
          client_id: string
          year_month: string
          has_document: boolean
          observation: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          document_type_id: string
          client_id: string
          year_month: string
          has_document?: boolean
          observation?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          document_type_id?: string
          client_id?: string
          year_month?: string
          has_document?: boolean
          observation?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_monthly_status_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_monthly_status_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      document_report_logs: {
        Row: {
          id: string
          client_id: string
          year_month: string
          generated_by: string
          generated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          year_month: string
          generated_by: string
          generated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          year_month?: string
          generated_by?: string
          generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_report_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_particularities: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          details: string | null
          id: string
          is_archived: boolean
          priority: string
          section_id: string | null
          sector_id: string
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          details?: string | null
          id?: string
          is_archived?: boolean
          priority?: string
          section_id?: string | null
          sector_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          details?: string | null
          id?: string
          is_archived?: boolean
          priority?: string
          section_id?: string | null
          sector_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_particularities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_particularities_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_particularities_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      client_partners: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_partners_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pop_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          pop_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          created_by: string
          id?: string
          pop_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          pop_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_pop_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_pop_notes_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "pops"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sector_styles: {
        Row: {
          client_id: string
          created_at: string
          id: string
          sector_id: string
          style_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          sector_id: string
          style_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          sector_id?: string
          style_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sector_styles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sector_styles_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sector_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "sector_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          client_id: string
          created_at: string
          id: string
          sector_id: string | null
          tag_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          sector_id?: string | null
          tag_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          sector_id?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tags_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          cnpj: string | null
          created_at: string
          created_by: string | null
          exclude_from_doc_report: boolean
          group_name: string | null
          id: string
          is_archived: boolean
          legal_name: string
          notes_quick: string | null
          status: string
          trade_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          exclude_from_doc_report?: boolean
          group_name?: string | null
          id?: string
          is_archived?: boolean
          legal_name: string
          notes_quick?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          exclude_from_doc_report?: boolean
          group_name?: string | null
          id?: string
          is_archived?: boolean
          legal_name?: string
          notes_quick?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fator_r_fiscal_sync: {
        Row: {
          cnpj: string
          cnpj_digits: string
          competencia: string
          fiscal_fechou: boolean
          id: string
          pulled_at: string
          source_payload: Json | null
          source_row_id: string | null
          source_updated_at: string
          updated_at: string
        }
        Insert: {
          cnpj: string
          cnpj_digits?: string
          competencia: string
          fiscal_fechou?: boolean
          id?: string
          pulled_at?: string
          source_payload?: Json | null
          source_row_id?: string | null
          source_updated_at: string
          updated_at?: string
        }
        Update: {
          cnpj?: string
          cnpj_digits?: string
          competencia?: string
          fiscal_fechou?: boolean
          id?: string
          pulled_at?: string
          source_payload?: Json | null
          source_row_id?: string | null
          source_updated_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fator_r_pull_config: {
        Row: {
          id: boolean
          source_anon_key: string
          source_url: string
          sync_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          source_anon_key?: string
          source_url?: string
          sync_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          source_anon_key?: string
          source_url?: string
          sync_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fator_r_sync_cursor: {
        Row: {
          id: boolean
          last_pull_at: string | null
          last_pull_message: string | null
          last_pull_status: string
          last_source_updated_at: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          last_pull_at?: string | null
          last_pull_message?: string | null
          last_pull_status?: string
          last_source_updated_at?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          last_pull_at?: string | null
          last_pull_message?: string | null
          last_pull_status?: string
          last_source_updated_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      occurrence_comments: {
        Row: {
          comment: string
          created_at: string
          created_by: string
          id: string
          occurrence_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          created_by: string
          id?: string
          occurrence_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          created_by?: string
          id?: string
          occurrence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrence_comments_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrences: {
        Row: {
          category: string
          client_id: string | null
          created_at: string
          created_by: string
          description: string | null
          editor_roles: string[]
          id: string
          is_archived: boolean
          monetary_value: number | null
          occurred_at: string
          related_task_id: string | null
          section_id: string | null
          sector_id: string
          title: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          editor_roles?: string[]
          id?: string
          is_archived?: boolean
          monetary_value?: number | null
          occurred_at?: string
          related_task_id?: string | null
          section_id?: string | null
          sector_id: string
          title: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          editor_roles?: string[]
          id?: string
          is_archived?: boolean
          monetary_value?: number | null
          occurred_at?: string
          related_task_id?: string | null
          section_id?: string | null
          sector_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      parameter_options: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          order_index: number
          type: string
          value: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          order_index?: number
          type: string
          value: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          order_index?: number
          type?: string
          value?: string
        }
        Relationships: []
      }
      pop_revisions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          pop_id: string
          proposed_changes: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          pop_id: string
          proposed_changes: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          pop_id?: string
          proposed_changes?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pop_revisions_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "pops"
            referencedColumns: ["id"]
          },
        ]
      }
      pop_versions: {
        Row: {
          client_id: string | null
          editor_roles: string[]
          id: string
          links: string[] | null
          objective: string | null
          pop_id: string
          saved_at: string
          saved_by: string | null
          scope: string
          section_id: string | null
          sector_id: string
          status: string
          steps: string | null
          tag_ids: string[] | null
          title: string
          version_number: number
        }
        Insert: {
          client_id?: string | null
          editor_roles?: string[]
          id?: string
          links?: string[] | null
          objective?: string | null
          pop_id: string
          saved_at?: string
          saved_by?: string | null
          scope: string
          section_id?: string | null
          sector_id: string
          status: string
          steps?: string | null
          tag_ids?: string[] | null
          title: string
          version_number: number
        }
        Update: {
          client_id?: string | null
          editor_roles?: string[]
          id?: string
          links?: string[] | null
          objective?: string | null
          pop_id?: string
          saved_at?: string
          saved_by?: string | null
          scope?: string
          section_id?: string | null
          sector_id?: string
          status?: string
          steps?: string | null
          tag_ids?: string[] | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pop_versions_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "pops"
            referencedColumns: ["id"]
          },
        ]
      }
      pops: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          editor_roles: string[]
          id: string
          is_archived: boolean
          links: string[] | null
          objective: string | null
          published_at: string | null
          scope: string
          section_id: string | null
          sector_id: string
          status: string
          steps: string | null
          tag_ids: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          editor_roles?: string[]
          id?: string
          is_archived?: boolean
          links?: string[] | null
          objective?: string | null
          published_at?: string | null
          scope?: string
          section_id?: string | null
          sector_id: string
          status?: string
          steps?: string | null
          tag_ids?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          editor_roles?: string[]
          id?: string
          is_archived?: boolean
          links?: string[] | null
          objective?: string | null
          published_at?: string | null
          scope?: string
          section_id?: string | null
          sector_id?: string
          status?: string
          steps?: string | null
          tag_ids?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pops_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pops_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pops_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_settings: {
        Row: {
          id: string
          key: string
          allowed_roles: string[]
          allowed_sectors: string[]
          enabled: boolean
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          allowed_roles?: string[]
          allowed_sectors?: string[]
          enabled?: boolean
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          allowed_roles?: string[]
          allowed_sectors?: string[]
          enabled?: boolean
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          sector_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          sector_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          sector_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      regime_period_config: {
        Row: {
          created_at: string
          id: string
          periodo_tipo: string
          regime: string
        }
        Insert: {
          created_at?: string
          id?: string
          periodo_tipo?: string
          regime: string
        }
        Update: {
          created_at?: string
          id?: string
          periodo_tipo?: string
          regime?: string
        }
        Relationships: []
      }
      reinf_entries: {
        Row: {
          ano: number
          client_id: string
          contabil_preenchido_em: string | null
          contabil_preenchido_em_mes1: string | null
          contabil_preenchido_em_mes2: string | null
          contabil_preenchido_em_mes3: string | null
          contabil_usuario_id: string | null
          contabil_usuario_id_mes1: string | null
          contabil_usuario_id_mes2: string | null
          contabil_usuario_id_mes3: string | null
          created_at: string
          created_by: string | null
          dp_aprovado_em: string | null
          dp_aprovado_em_mes1: string | null
          dp_aprovado_em_mes2: string | null
          dp_aprovado_em_mes3: string | null
          dp_usuario_id: string | null
          dp_usuario_id_mes1: string | null
          dp_usuario_id_mes2: string | null
          dp_usuario_id_mes3: string | null
          fiscal_enviado_em: string | null
          fiscal_enviado_em_mes1: string | null
          fiscal_enviado_em_mes2: string | null
          fiscal_enviado_em_mes3: string | null
          fiscal_usuario_id: string | null
          fiscal_usuario_id_mes1: string | null
          fiscal_usuario_id_mes2: string | null
          fiscal_usuario_id_mes3: string | null
          id: string
          lucro_mes1: number | null
          lucro_mes2: number | null
          lucro_mes3: number | null
          status: string
          status_mes1: string
          status_mes2: string
          status_mes3: string
          trimestre: number
          updated_at: string
        }
        Insert: {
          ano: number
          client_id: string
          contabil_preenchido_em?: string | null
          contabil_preenchido_em_mes1?: string | null
          contabil_preenchido_em_mes2?: string | null
          contabil_preenchido_em_mes3?: string | null
          contabil_usuario_id?: string | null
          contabil_usuario_id_mes1?: string | null
          contabil_usuario_id_mes2?: string | null
          contabil_usuario_id_mes3?: string | null
          created_at?: string
          created_by?: string | null
          dp_aprovado_em?: string | null
          dp_aprovado_em_mes1?: string | null
          dp_aprovado_em_mes2?: string | null
          dp_aprovado_em_mes3?: string | null
          dp_usuario_id?: string | null
          dp_usuario_id_mes1?: string | null
          dp_usuario_id_mes2?: string | null
          dp_usuario_id_mes3?: string | null
          fiscal_enviado_em?: string | null
          fiscal_enviado_em_mes1?: string | null
          fiscal_enviado_em_mes2?: string | null
          fiscal_enviado_em_mes3?: string | null
          fiscal_usuario_id?: string | null
          fiscal_usuario_id_mes1?: string | null
          fiscal_usuario_id_mes2?: string | null
          fiscal_usuario_id_mes3?: string | null
          id?: string
          lucro_mes1?: number | null
          lucro_mes2?: number | null
          lucro_mes3?: number | null
          status?: string
          status_mes1?: string
          status_mes2?: string
          status_mes3?: string
          trimestre: number
          updated_at?: string
        }
        Update: {
          ano?: number
          client_id?: string
          contabil_preenchido_em?: string | null
          contabil_preenchido_em_mes1?: string | null
          contabil_preenchido_em_mes2?: string | null
          contabil_preenchido_em_mes3?: string | null
          contabil_usuario_id?: string | null
          contabil_usuario_id_mes1?: string | null
          contabil_usuario_id_mes2?: string | null
          contabil_usuario_id_mes3?: string | null
          created_at?: string
          created_by?: string | null
          dp_aprovado_em?: string | null
          dp_aprovado_em_mes1?: string | null
          dp_aprovado_em_mes2?: string | null
          dp_aprovado_em_mes3?: string | null
          dp_usuario_id?: string | null
          dp_usuario_id_mes1?: string | null
          dp_usuario_id_mes2?: string | null
          dp_usuario_id_mes3?: string | null
          fiscal_enviado_em?: string | null
          fiscal_enviado_em_mes1?: string | null
          fiscal_enviado_em_mes2?: string | null
          fiscal_enviado_em_mes3?: string | null
          fiscal_usuario_id?: string | null
          fiscal_usuario_id_mes1?: string | null
          fiscal_usuario_id_mes2?: string | null
          fiscal_usuario_id_mes3?: string | null
          id?: string
          lucro_mes1?: number | null
          lucro_mes2?: number | null
          lucro_mes3?: number | null
          status?: string
          status_mes1?: string
          status_mes2?: string
          status_mes3?: string
          trimestre?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reinf_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reinf_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          reinf_entry_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          reinf_entry_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          reinf_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reinf_logs_reinf_entry_id_fkey"
            columns: ["reinf_entry_id"]
            isOneToOne: false
            referencedRelation: "reinf_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      reinf_partner_profits: {
        Row: {
          created_at: string
          id: string
          mes: number
          partner_id: string
          reinf_entry_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          mes: number
          partner_id: string
          reinf_entry_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          mes?: number
          partner_id?: string
          reinf_entry_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "reinf_partner_profits_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "client_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reinf_partner_profits_reinf_entry_id_fkey"
            columns: ["reinf_entry_id"]
            isOneToOne: false
            referencedRelation: "reinf_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          sector_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          sector_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          sector_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_styles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          sector_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          sector_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          sector_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sector_styles_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string
          created_by: string
          id: string
          task_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          created_by: string
          id?: string
          task_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          created_by?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          client_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          editor_roles: string[]
          id: string
          is_archived: boolean
          monetary_value: number | null
          priority: string
          section_id: string | null
          sector_id: string
          status: string
          title: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignee_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          editor_roles?: string[]
          id?: string
          is_archived?: boolean
          monetary_value?: number | null
          priority?: string
          section_id?: string | null
          sector_id: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignee_id?: string | null
          client_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          editor_roles?: string[]
          id?: string
          is_archived?: boolean
          monetary_value?: number | null
          priority?: string
          section_id?: string | null
          sector_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      pull_fator_r_fiscal_changes: {
        Args: {
          p_batch_size?: number
          p_source_anon_key?: string
          p_source_url?: string
          p_sync_key?: string
        }
        Returns: Json
      }
      run_fator_r_fiscal_pull: {
        Args: {
          p_batch_size?: number
        }
        Returns: Json
      }
      set_fator_r_pull_config: {
        Args: {
          p_source_anon_key?: string
          p_source_url?: string
          p_sync_key?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "supervisao" | "colaborador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "supervisao", "colaborador"],
    },
  },
} as const
