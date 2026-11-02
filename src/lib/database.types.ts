export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      alpha_invite_codes: {
        Row: {
          code_hash: string;
          created_at: string;
          redeemed_at: string | null;
          redeemed_by: string | null;
        };
        Insert: {
          code_hash: string;
          created_at?: string;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
        };
        Update: {
          code_hash?: string;
          created_at?: string;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'alpha_invite_codes_redeemed_by_fkey';
            columns: ['redeemed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      cloud_layouts: {
        Row: {
          layout_version: number;
          mode: string;
          positions: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          layout_version?: number;
          mode: string;
          positions?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          layout_version?: number;
          mode?: string;
          positions?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cloud_layouts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      artist_albums: {
        Row: {
          artist_id: string;
          cover_thumb_url: string | null;
          cover_url: string | null;
          created_at: string;
          id: string;
          musicbrainz_release_group_id: string;
          sort_order: number;
          title: string;
          type: string;
          year: number | null;
        };
        Insert: {
          artist_id: string;
          cover_thumb_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          musicbrainz_release_group_id: string;
          sort_order?: number;
          title: string;
          type: string;
          year?: number | null;
        };
        Update: {
          artist_id?: string;
          cover_thumb_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          musicbrainz_release_group_id?: string;
          sort_order?: number;
          title?: string;
          type?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'artist_albums_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
        ];
      };
      artist_image_gallery: {
        Row: {
          artist_id: string;
          image_role: string;
          image_url: string;
          label: string;
          sort_order: number;
          source: string;
        };
        Insert: {
          artist_id: string;
          image_role: string;
          image_url: string;
          label: string;
          sort_order?: number;
          source: string;
        };
        Update: {
          artist_id?: string;
          image_role?: string;
          image_url?: string;
          label?: string;
          sort_order?: number;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artist_image_gallery_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
        ];
      };
      artist_reports: {
        Row: {
          artist_id: string;
          created_at: string;
          details: string;
          id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          artist_id: string;
          created_at?: string;
          details: string;
          id?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          artist_id?: string;
          created_at?: string;
          details?: string;
          id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artist_reports_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artist_reports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artist_reports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artist_reports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      artist_tour_dates: {
        Row: {
          artist_id: string;
          city: string | null;
          country: string | null;
          country_code: string | null;
          created_at: string;
          event_date: string;
          event_end_date: string | null;
          event_name: string | null;
          external_id: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          region: string | null;
          source: string | null;
          status: string;
          ticket_url: string | null;
          updated_at: string;
          venue_name: string | null;
        };
        Insert: {
          artist_id: string;
          city?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string;
          event_date: string;
          event_end_date?: string | null;
          event_name?: string | null;
          external_id?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          region?: string | null;
          source?: string | null;
          status?: string;
          ticket_url?: string | null;
          updated_at?: string;
          venue_name?: string | null;
        };
        Update: {
          artist_id?: string;
          city?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string;
          event_date?: string;
          event_end_date?: string | null;
          event_name?: string | null;
          external_id?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          region?: string | null;
          source?: string | null;
          status?: string;
          ticket_url?: string | null;
          updated_at?: string;
          venue_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'artist_tour_dates_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
        ];
      };
      artists: {
        Row: {
          banner_image_url: string | null;
          begin_year: number | null;
          begin_year_source: string | null;
          bio: string | null;
          bio_attribution: string | null;
          bio_lang: string | null;
          bio_source: string | null;
          bio_url: string | null;
          created_at: string;
          created_by: string | null;
          enriched_at: string | null;
          enrichment_error: string | null;
          enrichment_status: string;
          genres: string[];
          group_image_url: string | null;
          id: string;
          image_url_large: string | null;
          image_url_thumb: string | null;
          last_enrichment_requested_at: string | null;
          last_synced_at: string | null;
          lastfm_tags: Json;
          macro_genres: string[];
          musicbrainz_id: string | null;
          name: string;
          name_normalized: string | null;
          popularity: number | null;
          primary_macro: string | null;
          is_on_tour: boolean;
          public_avg_rating: number | null;
          public_rating_count: number;
          public_weighted_rating: number | null;
          source: Database['public']['Enums']['artist_source'];
          spotify_id: string | null;
          tour_end_date: string | null;
          tour_last_checked_at: string | null;
          tour_start_date: string | null;
          user_edited_fields: string[];
          wikidata_id: string | null;
          wikipedia_title: string | null;
        };
        Insert: {
          banner_image_url?: string | null;
          begin_year?: number | null;
          begin_year_source?: string | null;
          bio?: string | null;
          bio_attribution?: string | null;
          bio_lang?: string | null;
          bio_source?: string | null;
          bio_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          enriched_at?: string | null;
          enrichment_error?: string | null;
          enrichment_status?: string;
          genres?: string[];
          group_image_url?: string | null;
          id?: string;
          image_url_large?: string | null;
          image_url_thumb?: string | null;
          last_enrichment_requested_at?: string | null;
          last_synced_at?: string | null;
          lastfm_tags?: Json;
          macro_genres?: string[];
          musicbrainz_id?: string | null;
          name: string;
          name_normalized?: string | null;
          popularity?: number | null;
          primary_macro?: string | null;
          is_on_tour?: boolean;
          public_avg_rating?: number | null;
          public_rating_count?: number;
          public_weighted_rating?: number | null;
          source: Database['public']['Enums']['artist_source'];
          spotify_id?: string | null;
          tour_end_date?: string | null;
          tour_last_checked_at?: string | null;
          tour_start_date?: string | null;
          user_edited_fields?: string[];
          wikidata_id?: string | null;
          wikipedia_title?: string | null;
        };
        Update: {
          banner_image_url?: string | null;
          begin_year?: number | null;
          begin_year_source?: string | null;
          bio?: string | null;
          bio_attribution?: string | null;
          bio_lang?: string | null;
          bio_source?: string | null;
          bio_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          enriched_at?: string | null;
          enrichment_error?: string | null;
          enrichment_status?: string;
          genres?: string[];
          group_image_url?: string | null;
          id?: string;
          image_url_large?: string | null;
          image_url_thumb?: string | null;
          last_enrichment_requested_at?: string | null;
          last_synced_at?: string | null;
          lastfm_tags?: Json;
          macro_genres?: string[];
          musicbrainz_id?: string | null;
          name?: string;
          name_normalized?: string | null;
          popularity?: number | null;
          primary_macro?: string | null;
          is_on_tour?: boolean;
          public_avg_rating?: number | null;
          public_rating_count?: number;
          public_weighted_rating?: number | null;
          source?: Database['public']['Enums']['artist_source'];
          spotify_id?: string | null;
          tour_end_date?: string | null;
          tour_last_checked_at?: string | null;
          tour_start_date?: string | null;
          user_edited_fields?: string[];
          wikidata_id?: string | null;
          wikipedia_title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'artists_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artists_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artists_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      concert_logs: {
        Row: {
          artist_id: string;
          created_at: string;
          event_date: string;
          id: string;
          rating: number | null;
          review: string | null;
          updated_at: string;
          user_id: string;
          venue_name: string | null;
          venue_type: Database['public']['Enums']['venue_type'];
        };
        Insert: {
          artist_id: string;
          created_at?: string;
          event_date: string;
          id?: string;
          rating?: number | null;
          review?: string | null;
          updated_at?: string;
          user_id: string;
          venue_name?: string | null;
          venue_type: Database['public']['Enums']['venue_type'];
        };
        Update: {
          artist_id?: string;
          created_at?: string;
          event_date?: string;
          id?: string;
          rating?: number | null;
          review?: string | null;
          updated_at?: string;
          user_id?: string;
          venue_name?: string | null;
          venue_type?: Database['public']['Enums']['venue_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'concert_logs_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'concert_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'concert_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'concert_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      log_media: {
        Row: {
          caption: string | null;
          created_at: string;
          duration_ms: number | null;
          height: number;
          id: string;
          kind: 'image' | 'video';
          log_id: string;
          mime: string;
          poster_path: string | null;
          size_bytes: number;
          slot: Database['public']['Enums']['media_slot'];
          storage_path: string;
          thumb_path: string;
          user_id: string;
          width: number;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          height: number;
          id?: string;
          kind: 'image' | 'video';
          log_id: string;
          mime: string;
          poster_path?: string | null;
          size_bytes: number;
          slot: Database['public']['Enums']['media_slot'];
          storage_path: string;
          thumb_path: string;
          user_id: string;
          width: number;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          height?: number;
          id?: string;
          kind?: 'image' | 'video';
          log_id?: string;
          mime?: string;
          poster_path?: string | null;
          size_bytes?: number;
          slot?: Database['public']['Enums']['media_slot'];
          storage_path?: string;
          thumb_path?: string;
          user_id?: string;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'log_media_log_id_fkey';
            columns: ['log_id'];
            isOneToOne: false;
            referencedRelation: 'concert_logs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'log_media_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      concert_setlists: {
        Row: {
          artist: string | null;
          city: string | null;
          event_date: string | null;
          event_year: number | null;
          log_id: string;
          setlistfm_id: string | null;
          songs: Json;
          source: string;
          source_url: string | null;
          updated_at: string;
          user_id: string;
          venue: string | null;
        };
        Insert: {
          artist?: string | null;
          city?: string | null;
          event_date?: string | null;
          event_year?: number | null;
          log_id: string;
          setlistfm_id?: string | null;
          songs?: Json;
          source: string;
          source_url?: string | null;
          updated_at?: string;
          user_id: string;
          venue?: string | null;
        };
        Update: {
          artist?: string | null;
          city?: string | null;
          event_date?: string | null;
          event_year?: number | null;
          log_id?: string;
          setlistfm_id?: string | null;
          songs?: Json;
          source?: string;
          source_url?: string | null;
          updated_at?: string;
          user_id?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'concert_setlists_log_id_fkey';
            columns: ['log_id'];
            isOneToOne: true;
            referencedRelation: 'concert_logs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'concert_setlists_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string;
          followee_id: string;
          follower_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          followee_id: string;
          follower_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          followee_id?: string;
          follower_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_followee_id_fkey';
            columns: ['followee_id'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_followee_id_fkey';
            columns: ['followee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_followee_id_fkey';
            columns: ['followee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      genre_rules: {
        Row: {
          id: string;
          keyword: string;
          macro_slug: string;
          priority: number;
        };
        Insert: {
          id?: string;
          keyword: string;
          macro_slug: string;
          priority?: number;
        };
        Update: {
          id?: string;
          keyword?: string;
          macro_slug?: string;
          priority?: number;
        };
        Relationships: [];
      };
      genre_tag_denylist: {
        Row: {
          created_at: string;
          tag: string;
        };
        Insert: {
          created_at?: string;
          tag: string;
        };
        Update: {
          created_at?: string;
          tag?: string;
        };
        Relationships: [];
      };
      log_comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          log_id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          log_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          log_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'log_comments_log_id_fkey';
            columns: ['log_id'];
            isOneToOne: false;
            referencedRelation: 'concert_logs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'log_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'log_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'log_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      log_likes: {
        Row: {
          created_at: string;
          log_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          log_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          log_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'log_likes_log_id_fkey';
            columns: ['log_id'];
            isOneToOne: false;
            referencedRelation: 'concert_logs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'log_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'log_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'log_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_picks: {
        Row: {
          artist_id: string;
          created_at: string;
          id: string;
          list_type: string;
          position: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          artist_id: string;
          created_at?: string;
          id?: string;
          list_type: string;
          position: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          artist_id?: string;
          created_at?: string;
          id?: string;
          list_type?: string;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_picks_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_picks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_picks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_picks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          banner_image_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          is_private: boolean;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          banner_image_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          is_private?: boolean;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          banner_image_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          is_private?: boolean;
          username?: string;
        };
        Relationships: [];
      };
      user_artist_overrides: {
        Row: {
          artist_id: string;
          created_at: string;
          macro_genres: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          artist_id: string;
          created_at?: string;
          macro_genres: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          artist_id?: string;
          created_at?: string;
          macro_genres?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_artist_overrides_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_artist_overrides_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_artist_overrides_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_artist_overrides_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      user_artist_image_overrides: {
        Row: {
          artist_id: string;
          banner_image_url: string | null;
          profile_image_url: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          artist_id: string;
          banner_image_url?: string | null;
          profile_image_url?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          artist_id?: string;
          banner_image_url?: string | null;
          profile_image_url?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_artist_image_overrides_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_artist_image_overrides_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      wishlist_items: {
        Row: {
          artist_id: string;
          city: string | null;
          created_at: string;
          date_flexible: boolean;
          event_name: string | null;
          id: string;
          note: string | null;
          priority: number;
          status: string;
          target_date: string | null;
          ticket_url: string | null;
          updated_at: string;
          user_id: string;
          venue_name: string | null;
          venue_type: Database['public']['Enums']['venue_type'] | null;
        };
        Insert: {
          artist_id: string;
          city?: string | null;
          created_at?: string;
          date_flexible?: boolean;
          event_name?: string | null;
          id?: string;
          note?: string | null;
          priority?: number;
          status?: string;
          target_date?: string | null;
          ticket_url?: string | null;
          updated_at?: string;
          user_id: string;
          venue_name?: string | null;
          venue_type?: Database['public']['Enums']['venue_type'] | null;
        };
        Update: {
          artist_id?: string;
          city?: string | null;
          created_at?: string;
          date_flexible?: boolean;
          event_name?: string | null;
          id?: string;
          note?: string | null;
          priority?: number;
          status?: string;
          target_date?: string | null;
          ticket_url?: string | null;
          updated_at?: string;
          user_id?: string;
          venue_name?: string | null;
          venue_type?: Database['public']['Enums']['venue_type'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wishlist_items_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wishlist_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile_overview_basics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wishlist_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wishlist_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      trending_global: {
        Row: {
          artist_id: string | null;
          artist_name: string;
          calculated_at: string;
          fetched_at: string;
          id: string;
          period_kind: string;
          period_start: string;
          public_avg_rating: number | null;
          public_listener_count: number;
          public_show_count: number;
          rank: number;
          region: string;
          score: number;
          source: string;
        };
        Insert: {
          artist_id?: string | null;
          artist_name?: string;
          calculated_at?: string;
          fetched_at?: string;
          id?: string;
          period_kind?: string;
          period_start?: string;
          public_avg_rating?: number | null;
          public_listener_count?: number;
          public_show_count?: number;
          rank: number;
          region?: string;
          score?: number;
          source?: string;
        };
        Update: {
          artist_id?: string | null;
          artist_name?: string;
          calculated_at?: string;
          fetched_at?: string;
          id?: string;
          period_kind?: string;
          period_start?: string;
          public_avg_rating?: number | null;
          public_listener_count?: number;
          public_show_count?: number;
          rank?: number;
          region?: string;
          score?: number;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trending_global_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      profile_overview_basics: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          display_name: string | null;
          id: string | null;
          is_private: boolean | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          display_name?: string | null;
          id?: string | null;
          is_private?: boolean | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          display_name?: string | null;
          id?: string | null;
          is_private?: boolean | null;
          username?: string | null;
        };
        Relationships: [];
      };
      profiles_public: {
        Row: {
          avatar_url: string | null;
          display_name: string | null;
          id: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          display_name?: string | null;
          id?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          display_name?: string | null;
          id?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      user_territory_stats: {
        Args: { p_user: string };
        Returns: {
          artist_count: number;
          average_rating: number | null;
          concert_count: number;
          first_seen: string | null;
          last_seen: string | null;
          macro_slug: string;
        }[];
      };
      user_music_identity: {
        Args: {
          p_user: string;
          p_year?: number | null;
        };
        Returns: Json;
      };
      artists_exclusive_to_venue_type: {
        Args: {
          p_type: Database['public']['Enums']['venue_type'];
          p_user: string;
          p_year?: number | null;
        };
        Returns: {
          artist_id: string;
          image_url: string;
          name: string;
          times_seen: number;
        }[];
      };
      can_modify_artist: {
        Args: { p_artist_id: string };
        Returns: {
          can_delete: boolean;
          can_edit: boolean;
          is_creator: boolean;
          other_user_log_count: number;
        }[];
      };
      can_view_log: { Args: { log_id: string }; Returns: boolean };
      can_view_profile: { Args: { profile_id: string }; Returns: boolean };
      can_view_profile_content: { Args: { p_owner: string }; Returns: boolean };
      claim_artist_enrichment: {
        Args: { p_artist_id: string; p_force?: boolean };
        Returns: boolean;
      };
      classify_genres:
        | {
            Args: { genres: string[] };
            Returns: {
              macro_genres: string[];
              primary_macro: string;
            }[];
          }
        | {
            Args: { weighted_tags: Json };
            Returns: {
              macro_genres: string[];
              primary_macro: string;
            }[];
          };
      delete_manual_artist: { Args: { p_artist_id: string }; Returns: boolean };
      find_similar_artists: {
        Args: { query_name: string; similarity_threshold?: number };
        Returns: {
          created_by: string;
          genres: string[];
          id: string;
          image_url_large: string;
          image_url_thumb: string;
          macro_genres: string[];
          name: string;
          name_normalized: string;
          popularity: number;
          primary_macro: string;
          similarity: number;
          source: Database['public']['Enums']['artist_source'];
          spotify_id: string;
        }[];
      };
      friends_leaderboard: {
        Args: { p_year?: number | null };
        Returns: {
          artist_count: number;
          avatar_url: string;
          avg_rating: number;
          display_name: string;
          rank: number;
          show_count: number;
          user_id: string;
          username: string;
        }[];
      };
      get_feed: {
        Args: { p_cursor: string; p_limit: number };
        Returns: {
          artist: Json;
          artist_id: string;
          author: Json;
          comment_count: number;
          created_at: string;
          event_date: string;
          id: string;
          like_count: number;
          liked_by_me: boolean;
          media: Json;
          media_count: number;
          rating: number;
          review: string;
          updated_at: string;
          user_id: string;
          venue_name: string;
          venue_type: Database['public']['Enums']['venue_type'];
        }[];
      };
      get_user_diary: {
        Args: {
          p_cursor?: string | null;
          p_limit?: number;
          p_only_media?: boolean;
          p_user: string;
        };
        Returns: {
          artist: Json;
          artist_id: string;
          created_at: string;
          event_date: string;
          id: string;
          media: Json;
          media_count: number;
          rating: number | null;
          review: string | null;
          updated_at: string;
          user_id: string;
          venue_name: string | null;
          venue_type: Database['public']['Enums']['venue_type'];
        }[];
      };
      get_profile_overview: { Args: { p_user: string }; Returns: Json };
      get_profile_overview_by_username: {
        Args: { p_username: string };
        Returns: Json;
      };
      artist_rating_summary: {
        Args: { p_artist: string };
        Returns: {
          artist_id: string;
          avg_rating: number | null;
          histogram: { count: number; rating: number }[];
          rating_count: number;
          rater_count: number;
          venue_averages: {
            average: number;
            count: number;
            venue_type: Database['public']['Enums']['venue_type'];
          }[];
          viewer_average: number | null;
          viewer_count: number;
          weighted_rating: number | null;
        } | null;
      };
      artists_on_tour: {
        Args: {
          p_country?: string | null;
          p_lat?: number | null;
          p_limit?: number;
          p_lng?: number | null;
          p_radius_km?: number | null;
          p_scope?: string;
        };
        Returns: {
          nearest_city: string | null;
          nearest_country: string | null;
          nearest_venue: string | null;
          dates_count: number;
          distance_km: number | null;
          id: string;
          macro_genres: string[];
          name: string;
          next_date: string;
          primary_macro: string | null;
          ticket_url: string | null;
          image_url_large: string | null;
          image_url_thumb: string | null;
        }[];
      };
      immutable_unaccent: { Args: { value: string }; Returns: string };
      is_log_owner: { Args: { log_id: string }; Returns: boolean };
      is_username_available: { Args: { p_username: string }; Returns: boolean };
      has_alpha_invite: { Args: Record<PropertyKey, never>; Returns: boolean };
      redeem_alpha_invite: {
        Args: { p_code_hash: string };
        Returns: boolean;
      };
      top_rated_artists: {
        Args: {
          p_limit?: number;
          p_macro?: string | null;
          p_min_raters?: number;
          p_query?: string | null;
          p_venue_type?: Database['public']['Enums']['venue_type'] | null;
          p_year?: number | null;
        };
        Returns: {
          avg_show_rating: number | null;
          id: string;
          image_url_large: string | null;
          image_url_thumb: string | null;
          last_logged_at: string | null;
          macro_genres: string[];
          name: string;
          primary_macro: string | null;
          rating_count: number;
          rater_count: number;
          show_count: number;
          weighted_rating: number | null;
        }[];
      };
      trending_in_app: {
        Args: { p_days?: number; p_limit?: number };
        Returns: {
          avg_show_rating: number | null;
          id: string;
          image_url_large: string | null;
          image_url_thumb: string | null;
          last_logged_at: string | null;
          macro_genres: string[];
          name: string;
          primary_macro: string | null;
          rating_count: number;
          rater_count: number;
          show_count: number;
          weighted_rating: number | null;
        }[];
      };
      set_profile_picks: {
        Args: { p_artist_ids: string[]; p_list: string };
        Returns: undefined;
      };
      user_artist_summary: {
        Args: { p_user: string };
        Returns: {
          avg_rating: number | null;
          created_at: string;
          created_by: string | null;
          first_seen: string;
          genres: string[];
          id: string;
          image_url_large: string | null;
          image_url_thumb: string | null;
          last_seen: string;
          last_synced_at: string | null;
          log_count: number;
          macro_genres: string[];
          max_rating: number | null;
          name: string;
          name_normalized: string | null;
          popularity: number | null;
          primary_macro: string | null;
          source: Database['public']['Enums']['artist_source'];
          spotify_id: string | null;
        }[];
      };
      user_artists_by_genre: {
        Args: { p_genre: string; p_user: string; p_year?: number | null };
        Returns: {
          artist_id: string;
          image_url: string;
          name: string;
          times_seen: number;
        }[];
      };
      user_artists_by_venue_type: {
        Args: {
          p_type: Database['public']['Enums']['venue_type'];
          p_user: string;
          p_year?: number | null;
        };
        Returns: {
          artist_id: string;
          image_url: string;
          name: string;
          times_seen: number;
        }[];
      };
      user_calendar_heatmap: {
        Args: { p_user: string; p_year?: number | null };
        Returns: Json;
      };
      user_cloud_data: {
        Args: { p_user: string; p_year?: number | null };
        Returns: Json;
      };
      user_genre_stats: {
        Args: { p_user: string; p_year?: number | null };
        Returns: {
          artist_count: number;
          avg_rating: number | null;
          log_count: number;
          macro_genre: string;
          top_artist: Json;
        }[];
      };
      user_stats_overview: {
        Args: { p_user: string; p_year?: number | null };
        Returns: Json;
      };
      user_taste_diversity: {
        Args: { p_user: string; p_year?: number | null };
        Returns: Json;
      };
      user_venue_stats: {
        Args: { p_user: string; p_year?: number | null };
        Returns: {
          artist_count: number;
          avg_rating: number | null;
          log_count: number;
          top_artist: Json;
          venue_type: Database['public']['Enums']['venue_type'];
        }[];
      };
    };
    Enums: {
      artist_source: 'spotify' | 'manual';
      media_slot: 'concert_photo' | 'companions_photo' | 'concert_video';
      venue_type:
        | 'festival'
        | 'concert_hall_club'
        | 'stadium'
        | 'indoor_arena'
        | 'festa_major'
        | 'other';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      artist_source: ['spotify', 'manual'],
      venue_type: [
        'festival',
        'concert_hall_club',
        'stadium',
        'indoor_arena',
        'festa_major',
        'other',
      ],
    },
  },
} as const;
