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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alpha_gate_config: {
        Row: {
          invite_only: boolean
          legacy_members_backfilled: boolean
          singleton: boolean
        }
        Insert: {
          invite_only?: boolean
          legacy_members_backfilled?: boolean
          singleton?: boolean
        }
        Update: {
          invite_only?: boolean
          legacy_members_backfilled?: boolean
          singleton?: boolean
        }
        Relationships: []
      }
      alpha_invite_codes: {
        Row: {
          code_hash: string
          created_at: string
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alpha_invite_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_invite_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_invite_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      alpha_invite_members: {
        Row: {
          granted_at: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alpha_invite_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_invite_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alpha_invite_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_albums: {
        Row: {
          artist_id: string
          cover_thumb_url: string | null
          cover_url: string | null
          created_at: string
          id: string
          musicbrainz_release_group_id: string
          sort_order: number
          title: string
          type: string
          year: number | null
        }
        Insert: {
          artist_id: string
          cover_thumb_url?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          musicbrainz_release_group_id: string
          sort_order?: number
          title: string
          type: string
          year?: number | null
        }
        Update: {
          artist_id?: string
          cover_thumb_url?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          musicbrainz_release_group_id?: string
          sort_order?: number
          title?: string
          type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_albums_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_image_gallery: {
        Row: {
          artist_id: string
          image_role: string
          image_url: string
          label: string
          sort_order: number
          source: string
        }
        Insert: {
          artist_id: string
          image_role: string
          image_url: string
          label: string
          sort_order?: number
          source: string
        }
        Update: {
          artist_id?: string
          image_role?: string
          image_url?: string
          label?: string
          sort_order?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_image_gallery_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_reports: {
        Row: {
          artist_id: string
          created_at: string
          details: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          details: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          details?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_reports_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_tour_dates: {
        Row: {
          artist_id: string
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          event_date: string
          event_end_date: string | null
          event_name: string | null
          external_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          region: string | null
          source: string | null
          status: string
          ticket_url: string | null
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          artist_id: string
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          event_date: string
          event_end_date?: string | null
          event_name?: string | null
          external_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          source?: string | null
          status?: string
          ticket_url?: string | null
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          artist_id?: string
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          event_date?: string
          event_end_date?: string | null
          event_name?: string | null
          external_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          source?: string | null
          status?: string
          ticket_url?: string | null
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_tour_dates_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          banner_image_url: string | null
          begin_year: number | null
          begin_year_source: string | null
          bio: string | null
          bio_attribution: string | null
          bio_lang: string | null
          bio_source: string | null
          bio_url: string | null
          created_at: string
          created_by: string | null
          enriched_at: string | null
          enrichment_error: string | null
          enrichment_status: string
          genres: string[]
          group_image_url: string | null
          id: string
          image_url_large: string | null
          image_url_thumb: string | null
          is_on_tour: boolean
          last_enrichment_requested_at: string | null
          last_synced_at: string | null
          lastfm_tags: Json
          macro_genres: string[]
          musicbrainz_id: string | null
          name: string
          name_normalized: string | null
          popularity: number | null
          primary_macro: string | null
          public_avg_rating: number | null
          public_rating_count: number
          public_weighted_rating: number | null
          source: Database["public"]["Enums"]["artist_source"]
          spotify_id: string | null
          sub_genres: string[]
          tour_end_date: string | null
          tour_last_checked_at: string | null
          tour_start_date: string | null
          user_edited_fields: string[]
          wikidata_id: string | null
          wikipedia_title: string | null
        }
        Insert: {
          banner_image_url?: string | null
          begin_year?: number | null
          begin_year_source?: string | null
          bio?: string | null
          bio_attribution?: string | null
          bio_lang?: string | null
          bio_source?: string | null
          bio_url?: string | null
          created_at?: string
          created_by?: string | null
          enriched_at?: string | null
          enrichment_error?: string | null
          enrichment_status?: string
          genres?: string[]
          group_image_url?: string | null
          id?: string
          image_url_large?: string | null
          image_url_thumb?: string | null
          is_on_tour?: boolean
          last_enrichment_requested_at?: string | null
          last_synced_at?: string | null
          lastfm_tags?: Json
          macro_genres?: string[]
          musicbrainz_id?: string | null
          name: string
          name_normalized?: string | null
          popularity?: number | null
          primary_macro?: string | null
          public_avg_rating?: number | null
          public_rating_count?: number
          public_weighted_rating?: number | null
          source: Database["public"]["Enums"]["artist_source"]
          spotify_id?: string | null
          sub_genres?: string[]
          tour_end_date?: string | null
          tour_last_checked_at?: string | null
          tour_start_date?: string | null
          user_edited_fields?: string[]
          wikidata_id?: string | null
          wikipedia_title?: string | null
        }
        Update: {
          banner_image_url?: string | null
          begin_year?: number | null
          begin_year_source?: string | null
          bio?: string | null
          bio_attribution?: string | null
          bio_lang?: string | null
          bio_source?: string | null
          bio_url?: string | null
          created_at?: string
          created_by?: string | null
          enriched_at?: string | null
          enrichment_error?: string | null
          enrichment_status?: string
          genres?: string[]
          group_image_url?: string | null
          id?: string
          image_url_large?: string | null
          image_url_thumb?: string | null
          is_on_tour?: boolean
          last_enrichment_requested_at?: string | null
          last_synced_at?: string | null
          lastfm_tags?: Json
          macro_genres?: string[]
          musicbrainz_id?: string | null
          name?: string
          name_normalized?: string | null
          popularity?: number | null
          primary_macro?: string | null
          public_avg_rating?: number | null
          public_rating_count?: number
          public_weighted_rating?: number | null
          source?: Database["public"]["Enums"]["artist_source"]
          spotify_id?: string | null
          sub_genres?: string[]
          tour_end_date?: string | null
          tour_last_checked_at?: string | null
          tour_start_date?: string | null
          user_edited_fields?: string[]
          wikidata_id?: string | null
          wikipedia_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_layouts: {
        Row: {
          layout_version: number
          mode: string
          positions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          layout_version?: number
          mode: string
          positions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          layout_version?: number
          mode?: string
          positions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_layouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloud_layouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloud_layouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      concert_logs: {
        Row: {
          artist_id: string
          created_at: string
          event_date: string
          id: string
          rating: number | null
          review: string | null
          updated_at: string
          user_id: string
          venue_id: string | null
          venue_name: string | null
          venue_type: Database["public"]["Enums"]["venue_type"]
        }
        Insert: {
          artist_id: string
          created_at?: string
          event_date: string
          id?: string
          rating?: number | null
          review?: string | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
          venue_name?: string | null
          venue_type: Database["public"]["Enums"]["venue_type"]
        }
        Update: {
          artist_id?: string
          created_at?: string
          event_date?: string
          id?: string
          rating?: number | null
          review?: string | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
          venue_name?: string | null
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Relationships: [
          {
            foreignKeyName: "concert_logs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concert_logs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concert_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concert_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concert_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      concert_setlists: {
        Row: {
          artist: string | null
          city: string | null
          event_date: string | null
          event_year: number | null
          log_id: string
          setlistfm_id: string | null
          songs: Json
          source: string
          source_url: string | null
          updated_at: string
          user_id: string
          venue: string | null
        }
        Insert: {
          artist?: string | null
          city?: string | null
          event_date?: string | null
          event_year?: number | null
          log_id: string
          setlistfm_id?: string | null
          songs?: Json
          source: string
          source_url?: string | null
          updated_at?: string
          user_id: string
          venue?: string | null
        }
        Update: {
          artist?: string | null
          city?: string | null
          event_date?: string | null
          event_year?: number | null
          log_id?: string
          setlistfm_id?: string | null
          songs?: Json
          source?: string
          source_url?: string | null
          updated_at?: string
          user_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concert_setlists_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: true
            referencedRelation: "concert_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concert_setlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concert_setlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concert_setlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          status: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          status?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      genre_autopages: {
        Row: {
          fetched_at: string
          payload: Json
          slug: string
        }
        Insert: {
          fetched_at?: string
          payload?: Json
          slug: string
        }
        Update: {
          fetched_at?: string
          payload?: Json
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "genre_autopages_slug_fkey"
            columns: ["slug"]
            isOneToOne: true
            referencedRelation: "genres"
            referencedColumns: ["slug"]
          },
        ]
      }
      genre_examples: {
        Row: {
          artist_id: string
          genre_slug: string
          note: string | null
          position: number
        }
        Insert: {
          artist_id: string
          genre_slug: string
          note?: string | null
          position: number
        }
        Update: {
          artist_id?: string
          genre_slug?: string
          note?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "genre_examples_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genre_examples_genre_slug_fkey"
            columns: ["genre_slug"]
            isOneToOne: false
            referencedRelation: "genre_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
      genre_pages: {
        Row: {
          content_version: number
          history: Json
          origin_place: string
          origin_years: string
          related_slugs: string[]
          reviewed: boolean
          slug: string
          summary: string
          tagline: string
          title: string
          updated_at: string
          wikipedia_title: string | null
        }
        Insert: {
          content_version?: number
          history?: Json
          origin_place: string
          origin_years: string
          related_slugs?: string[]
          reviewed?: boolean
          slug: string
          summary: string
          tagline: string
          title: string
          updated_at?: string
          wikipedia_title?: string | null
        }
        Update: {
          content_version?: number
          history?: Json
          origin_place?: string
          origin_years?: string
          related_slugs?: string[]
          reviewed?: boolean
          slug?: string
          summary?: string
          tagline?: string
          title?: string
          updated_at?: string
          wikipedia_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "genre_pages_slug_fkey"
            columns: ["slug"]
            isOneToOne: true
            referencedRelation: "genres"
            referencedColumns: ["slug"]
          },
        ]
      }
      genre_pillars: {
        Row: {
          artist_id: string
          genre_slug: string
          position: number
          why: string
        }
        Insert: {
          artist_id: string
          genre_slug: string
          position: number
          why: string
        }
        Update: {
          artist_id?: string
          genre_slug?: string
          position?: number
          why?: string
        }
        Relationships: [
          {
            foreignKeyName: "genre_pillars_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genre_pillars_genre_slug_fkey"
            columns: ["genre_slug"]
            isOneToOne: false
            referencedRelation: "genre_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
      genre_rules: {
        Row: {
          id: string
          keyword: string
          macro_slug: string
          priority: number
        }
        Insert: {
          id?: string
          keyword: string
          macro_slug: string
          priority?: number
        }
        Update: {
          id?: string
          keyword?: string
          macro_slug?: string
          priority?: number
        }
        Relationships: []
      }
      genre_tag_denylist: {
        Row: {
          created_at: string
          tag: string
        }
        Insert: {
          created_at?: string
          tag: string
        }
        Update: {
          created_at?: string
          tag?: string
        }
        Relationships: []
      }
      genres: {
        Row: {
          aliases: string[]
          created_at: string
          has_editorial: boolean
          label: string
          lastfm_tag: string | null
          level: number
          origin_years: string | null
          parent_slug: string | null
          slug: string
          wikipedia_title: string | null
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          has_editorial?: boolean
          label: string
          lastfm_tag?: string | null
          level: number
          origin_years?: string | null
          parent_slug?: string | null
          slug: string
          wikipedia_title?: string | null
        }
        Update: {
          aliases?: string[]
          created_at?: string
          has_editorial?: boolean
          label?: string
          lastfm_tag?: string | null
          level?: number
          origin_years?: string | null
          parent_slug?: string | null
          slug?: string
          wikipedia_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "genres_parent_slug_fkey"
            columns: ["parent_slug"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["slug"]
          },
        ]
      }
      log_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          log_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          log_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          log_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_comments_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "concert_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      log_likes: {
        Row: {
          created_at: string
          log_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          log_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          log_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_likes_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "concert_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      log_media: {
        Row: {
          caption: string | null
          codec: string | null
          created_at: string
          duration_ms: number | null
          height: number
          id: string
          kind: string
          log_id: string
          mime: string
          poster_path: string | null
          size_bytes: number
          slot: Database["public"]["Enums"]["media_slot"]
          storage_path: string
          thumb_path: string
          user_id: string
          width: number
        }
        Insert: {
          caption?: string | null
          codec?: string | null
          created_at?: string
          duration_ms?: number | null
          height: number
          id?: string
          kind: string
          log_id: string
          mime: string
          poster_path?: string | null
          size_bytes: number
          slot: Database["public"]["Enums"]["media_slot"]
          storage_path: string
          thumb_path: string
          user_id: string
          width: number
        }
        Update: {
          caption?: string | null
          codec?: string | null
          created_at?: string
          duration_ms?: number | null
          height?: number
          id?: string
          kind?: string
          log_id?: string
          mime?: string
          poster_path?: string | null
          size_bytes?: number
          slot?: Database["public"]["Enums"]["media_slot"]
          storage_path?: string
          thumb_path?: string
          user_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "log_media_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "concert_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          log_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          log_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          log_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "log_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "concert_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_picks: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          list_type: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          list_type: string
          position: number
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          list_type?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_picks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_image_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          home_city: string | null
          home_country: string | null
          home_country_code: string | null
          home_latitude: number | null
          home_longitude: number | null
          home_region: string | null
          id: string
          is_private: boolean
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banner_image_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          home_city?: string | null
          home_country?: string | null
          home_country_code?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          home_region?: string | null
          id: string
          is_private?: boolean
          username: string
        }
        Update: {
          avatar_url?: string | null
          banner_image_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          home_city?: string | null
          home_country?: string | null
          home_country_code?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          home_region?: string | null
          id?: string
          is_private?: boolean
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_log_id: string | null
          reported_user_id: string | null
          reporter_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_log_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_log_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_log_id_fkey"
            columns: ["reported_log_id"]
            isOneToOne: false
            referencedRelation: "concert_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_global: {
        Row: {
          artist_id: string | null
          artist_name: string
          calculated_at: string
          fetched_at: string
          id: string
          period_kind: string
          period_start: string
          public_avg_rating: number | null
          public_listener_count: number
          public_show_count: number
          rank: number
          region: string
          score: number
          source: string
        }
        Insert: {
          artist_id?: string | null
          artist_name?: string
          calculated_at?: string
          fetched_at?: string
          id?: string
          period_kind?: string
          period_start?: string
          public_avg_rating?: number | null
          public_listener_count?: number
          public_show_count?: number
          rank: number
          region?: string
          score?: number
          source?: string
        }
        Update: {
          artist_id?: string | null
          artist_name?: string
          calculated_at?: string
          fetched_at?: string
          id?: string
          period_kind?: string
          period_start?: string
          public_avg_rating?: number | null
          public_listener_count?: number
          public_show_count?: number
          rank?: number
          region?: string
          score?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "trending_global_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_artist_image_overrides: {
        Row: {
          artist_id: string
          banner_image_url: string | null
          profile_image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          banner_image_url?: string | null
          profile_image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          banner_image_url?: string | null
          profile_image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_artist_image_overrides_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_artist_image_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_artist_image_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_artist_image_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_artist_overrides: {
        Row: {
          artist_id: string
          created_at: string
          macro_genres: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          macro_genres: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          macro_genres?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_artist_overrides_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_artist_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_artist_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_artist_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          external_id: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          name_normalized: string
          source: string
          venue_type: Database["public"]["Enums"]["venue_type"]
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          name_normalized?: never
          source: string
          venue_type: Database["public"]["Enums"]["venue_type"]
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          name_normalized?: never
          source?: string
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          artist_id: string
          city: string | null
          created_at: string
          date_flexible: boolean
          event_name: string | null
          id: string
          note: string | null
          priority: number
          status: string
          target_date: string | null
          ticket_url: string | null
          updated_at: string
          user_id: string
          venue_name: string | null
          venue_type: Database["public"]["Enums"]["venue_type"] | null
        }
        Insert: {
          artist_id: string
          city?: string | null
          created_at?: string
          date_flexible?: boolean
          event_name?: string | null
          id?: string
          note?: string | null
          priority?: number
          status?: string
          target_date?: string | null
          ticket_url?: string | null
          updated_at?: string
          user_id: string
          venue_name?: string | null
          venue_type?: Database["public"]["Enums"]["venue_type"] | null
        }
        Update: {
          artist_id?: string
          city?: string | null
          created_at?: string
          date_flexible?: boolean
          event_name?: string | null
          id?: string
          note?: string | null
          priority?: number
          status?: string
          target_date?: string | null
          ticket_url?: string | null
          updated_at?: string
          user_id?: string
          venue_name?: string | null
          venue_type?: Database["public"]["Enums"]["venue_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_overview_basics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profile_overview_basics: {
        Row: {
          avatar_url: string | null
          banner_image_url: string | null
          bio: string | null
          display_name: string | null
          id: string | null
          is_private: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_image_url?: string | null
          bio?: string | null
          display_name?: string | null
          id?: string | null
          is_private?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_image_url?: string | null
          bio?: string | null
          display_name?: string | null
          id?: string | null
          is_private?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_follow_request: {
        Args: { p_follower: string }
        Returns: undefined
      }
      alpha_user_is_allowed: { Args: { p_user: string }; Returns: boolean }
      artist_rating_summary: { Args: { p_artist: string }; Returns: Json }
      artists_exclusive_to_venue_type: {
        Args: {
          p_type: Database["public"]["Enums"]["venue_type"]
          p_user: string
          p_year?: number
        }
        Returns: {
          artist_id: string
          image_url: string
          name: string
          times_seen: number
        }[]
      }
      artists_on_tour: {
        Args: {
          p_country?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_radius_km?: number
          p_scope?: string
        }
        Returns: {
          dates_count: number
          distance_km: number
          id: string
          image_url_large: string
          image_url_thumb: string
          macro_genres: string[]
          name: string
          nearest_city: string
          nearest_country: string
          nearest_venue: string
          next_date: string
          primary_macro: string
          ticket_url: string
        }[]
      }
      block_user: { Args: { p_blocked: string }; Returns: undefined }
      can_modify_artist: {
        Args: { p_artist_id: string }
        Returns: {
          can_delete: boolean
          can_edit: boolean
          is_creator: boolean
          other_user_log_count: number
        }[]
      }
      can_view_log: { Args: { log_id: string }; Returns: boolean }
      can_view_profile: { Args: { profile_id: string }; Returns: boolean }
      can_view_profile_content: { Args: { p_owner: string }; Returns: boolean }
      can_view_user: { Args: { p_owner: string }; Returns: boolean }
      claim_artist_enrichment: {
        Args: { p_artist_id: string; p_force?: boolean }
        Returns: boolean
      }
      classify_genres:
        | {
            Args: { genres: string[] }
            Returns: {
              macro_genres: string[]
              primary_macro: string
            }[]
          }
        | {
            Args: { weighted_tags: Json }
            Returns: {
              macro_genres: string[]
              primary_macro: string
              sub_genres: string[]
            }[]
          }
      common_artists: {
        Args: { p_a: string; p_b: string }
        Returns: {
          artist_id: string
          image_url: string
          macro_genres: string[]
          name: string
          primary_macro: string
          shared_dates: string[]
          shared_venues: string[]
          times_seen_a: number
          times_seen_b: number
        }[]
      }
      decline_follow_request: {
        Args: { p_follower: string }
        Returns: undefined
      }
      delete_manual_artist: { Args: { p_artist_id: string }; Returns: boolean }
      find_similar_artists: {
        Args: { query_name: string; similarity_threshold?: number }
        Returns: {
          created_by: string
          genres: string[]
          id: string
          image_url_large: string
          image_url_thumb: string
          macro_genres: string[]
          name: string
          name_normalized: string
          popularity: number
          primary_macro: string
          similarity: number
          source: Database["public"]["Enums"]["artist_source"]
          spotify_id: string
        }[]
      }
      friends_leaderboard: {
        Args: { p_year?: number }
        Returns: {
          artist_count: number
          avatar_url: string
          avg_rating: number
          display_name: string
          rank: number
          show_count: number
          user_id: string
          username: string
        }[]
      }
      friends_who_saw_artist: {
        Args: { p_artist: string; p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          logs: Json
          logs_count: number
          username: string
        }[]
      }
      get_feed: {
        Args: { p_cursor: string; p_limit: number }
        Returns: {
          artist: Json
          artist_id: string
          author: Json
          comment_count: number
          created_at: string
          event_date: string
          id: string
          like_count: number
          liked_by_me: boolean
          media: Json
          media_count: number
          rating: number
          review: string
          setlist: Json
          updated_at: string
          user_id: string
          venue_name: string
          venue_type: Database["public"]["Enums"]["venue_type"]
        }[]
      }
      get_follow_requests: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          requested_at: string
          username: string
        }[]
      }
      get_genre_catalog: {
        Args: never
        Returns: {
          aliases: string[]
          artist_count: number
          has_editorial: boolean
          label: string
          lastfm_tag: string
          level: number
          origin_years: string
          parent_slug: string
          slug: string
          viewer_seen_count: number
          wikipedia_title: string
        }[]
      }
      get_genre_page: { Args: { p_slug: string }; Returns: Json }
      get_notifications: {
        Args: { p_limit?: number }
        Returns: {
          actor_avatar_url: string
          actor_display_name: string
          actor_id: string
          actor_username: string
          comment_id: string
          created_at: string
          id: string
          log_id: string
          read: boolean
          type: string
        }[]
      }
      get_profile_overview: { Args: { p_user: string }; Returns: Json }
      get_profile_overview_by_username: {
        Args: { p_username: string }
        Returns: Json
      }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_diary:
        | {
            Args: {
              p_cursor?: string
              p_limit?: number
              p_only_media?: boolean
              p_user: string
            }
            Returns: {
              artist: Json
              artist_id: string
              created_at: string
              event_date: string
              id: string
              media: Json
              media_count: number
              rating: number
              review: string
              updated_at: string
              user_id: string
              venue_name: string
              venue_type: Database["public"]["Enums"]["venue_type"]
            }[]
          }
        | {
            Args: {
              p_cursor?: Json
              p_date?: string
              p_limit?: number
              p_macro?: string
              p_macros?: string[]
              p_max_rating?: number
              p_min_rating?: number
              p_only_reviews?: boolean
              p_order?: string
              p_q?: string
              p_user: string
              p_venue_type?: Database["public"]["Enums"]["venue_type"]
              p_venue_types?: Database["public"]["Enums"]["venue_type"][]
              p_year?: number
            }
            Returns: {
              artist_id: string
              artist_name: string
              comment_count: number
              created_at: string
              event_date: string
              genres: string[]
              id: string
              image_url_thumb: string
              like_count: number
              liked_by_me: boolean
              macro_genres: string[]
              primary_macro: string
              rating: number
              restricted: boolean
              review: string
              times_seen_before: number
              updated_at: string
              user_id: string
              venue_name: string
              venue_type: Database["public"]["Enums"]["venue_type"]
            }[]
          }
      has_alpha_invite: { Args: never; Returns: boolean }
      haversine_km: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number }
        Returns: number
      }
      immutable_unaccent: { Args: { value: string }; Returns: string }
      is_log_owner: { Args: { log_id: string }; Returns: boolean }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
      mark_notifications_read: {
        Args: { p_ids?: string[] }
        Returns: undefined
      }
      promote_frequent_tags: { Args: { p_min?: number }; Returns: number }
      reclassify_artists_batch: {
        Args: { p_after_id?: string; p_batch_size?: number }
        Returns: {
          last_id: string
          updated_count: number
        }[]
      }
      recompute_artist_rating_aggregates: {
        Args: { p_artist_id: string }
        Returns: undefined
      }
      redeem_alpha_invite: { Args: { p_code_hash: string }; Returns: boolean }
      refresh_artist_tour_status: {
        Args: { p_artist_id: string }
        Returns: undefined
      }
      claim_musicbrainz_search: {
        Args: { p_minimum_gap_ms?: number }
        Returns: boolean
      }
      defer_musicbrainz_search: {
        Args: { p_cooldown_seconds: number }
        Returns: undefined
      }
      search_profiles: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          follow_status: string
          follower_count: number
          id: string
          is_following: boolean
          username: string
        }[]
      }
      search_venues: {
        Args: {
          p_limit?: number
          p_query: string
          p_type?: Database["public"]["Enums"]["venue_type"] | null
        }
        Returns: {
          city: string | null
          country: string | null
          external_id: string | null
          id: string
          name: string
          venue_type: Database["public"]["Enums"]["venue_type"]
        }[]
      }
      send_follow_request: { Args: { p_followee: string }; Returns: string }
      set_profile_picks: {
        Args: { p_artist_ids: string[]; p_list: string }
        Returns: undefined
      }
      submit_report: {
        Args: {
          p_details?: string
          p_reason?: string
          p_reported_log?: string
          p_reported_user?: string
        }
        Returns: undefined
      }
      top_rated_artists: {
        Args: {
          p_limit?: number
          p_macro?: string
          p_min_raters?: number
          p_query?: string
          p_venue_type?: Database["public"]["Enums"]["venue_type"]
          p_year?: number
        }
        Returns: {
          avg_show_rating: number
          id: string
          image_url_large: string
          image_url_thumb: string
          last_logged_at: string
          macro_genres: string[]
          name: string
          primary_macro: string
          rater_count: number
          rating_count: number
          show_count: number
          weighted_rating: number
        }[]
      }
      trending_in_app: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          avg_show_rating: number
          id: string
          image_url_large: string
          image_url_thumb: string
          last_logged_at: string
          macro_genres: string[]
          name: string
          primary_macro: string
          rater_count: number
          rating_count: number
          show_count: number
          weighted_rating: number
        }[]
      }
      unblock_user: { Args: { p_blocked: string }; Returns: undefined }
      unfollow_user: { Args: { p_followee: string }; Returns: undefined }
      user_artist_summary: {
        Args: { p_user: string }
        Returns: {
          avg_rating: number
          created_at: string
          created_by: string
          first_seen: string
          genres: string[]
          id: string
          image_url_large: string
          image_url_thumb: string
          last_seen: string
          last_synced_at: string
          log_count: number
          macro_genres: string[]
          max_rating: number
          name: string
          name_normalized: string
          popularity: number
          primary_macro: string
          source: Database["public"]["Enums"]["artist_source"]
          spotify_id: string
        }[]
      }
      user_artists_by_genre: {
        Args: { p_genre: string; p_user: string; p_year?: number }
        Returns: {
          artist_id: string
          image_url: string
          name: string
          times_seen: number
        }[]
      }
      user_artists_by_venue_type: {
        Args: {
          p_type: Database["public"]["Enums"]["venue_type"]
          p_user: string
          p_year?: number
        }
        Returns: {
          artist_id: string
          image_url: string
          name: string
          times_seen: number
        }[]
      }
      user_calendar_heatmap: {
        Args: { p_user: string; p_year?: number }
        Returns: Json
      }
      user_cloud_data: {
        Args: { p_user: string; p_year?: number }
        Returns: Json
      }
      user_genre_stats: {
        Args: { p_user: string; p_year?: number }
        Returns: {
          artist_count: number
          avg_rating: number
          log_count: number
          macro_genre: string
          top_artist: Json
        }[]
      }
      user_music_identity: {
        Args: { p_user: string; p_year?: number }
        Returns: Json
      }
      user_stats_overview: {
        Args: { p_user: string; p_year?: number }
        Returns: Json
      }
      user_subgenre_stats: {
        Args: { p_user: string; p_year?: number }
        Returns: {
          artist_count: number
          avg_rating: number
          log_count: number
          parent_macro: string
          sub_genre: string
        }[]
      }
      user_taste_diversity: {
        Args: { p_user: string; p_year?: number }
        Returns: Json
      }
      user_territory_stats: {
        Args: { p_user: string }
        Returns: {
          artist_count: number
          average_rating: number
          concert_count: number
          first_seen: string
          last_seen: string
          macro_slug: string
        }[]
      }
      user_venue_stats: {
        Args: { p_user: string; p_year?: number }
        Returns: {
          artist_count: number
          avg_rating: number
          log_count: number
          top_artist: Json
          venue_type: Database["public"]["Enums"]["venue_type"]
        }[]
      }
      user_venue_deep_stats: {
        Args: { p_user: string }
        Returns: Json
      }
      user_venue_map_points: {
        Args: { p_user: string }
        Returns: {
          city: string | null
          lat: number
          log_count: number
          lng: number
          venue_name: string | null
        }[]
      }
      user_venue_city_log_ids: {
        Args: { p_city: string; p_country?: string; p_user: string }
        Returns: string[]
      }
      get_public_concert_log_share: {
        Args: { p_log_id: string }
        Returns: Json
      }
    }
    Enums: {
      artist_source: "spotify" | "manual"
      media_slot: "concert_photo" | "companions_photo" | "concert_video"
      venue_type:
        | "festival"
        | "concert_hall_club"
        | "stadium"
        | "indoor_arena"
        | "festa_major"
        | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      artist_source: ["spotify", "manual"],
      media_slot: ["concert_photo", "companions_photo", "concert_video"],
      venue_type: [
        "festival",
        "concert_hall_club",
        "stadium",
        "indoor_arena",
        "festa_major",
        "other",
      ],
    },
  },
} as const
