// Friendspot database types — matches friendspot schema (v2 + rooms + bets)
// Regenerate with: npx supabase gen types typescript --project-id tocfspcqquxdcgoltrxc --schema friendspot

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  friendspot: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          job_title: string | null;
          company: string | null;
          phone: string | null;
          coins: number;
          venmo_username: string | null;
          paypal_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          job_title?: string | null;
          company?: string | null;
          phone?: string | null;
          coins?: number;
          venmo_username?: string | null;
          paypal_email?: string | null;
        };
        Update: {
          username?: string | null;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          job_title?: string | null;
          company?: string | null;
          phone?: string | null;
          coins?: number;
          venmo_username?: string | null;
          paypal_email?: string | null;
        };
        Relationships: [];
      };
      contact_imports: {
        Row: {
          id: string;
          owner_id: string;
          phone_hash: string;
          matched_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          phone_hash: string;
          matched_user_id?: string | null;
        };
        Update: { matched_user_id?: string | null };
        Relationships: [];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          context: string | null;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string | null;
          context?: string | null;
          reason: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      circles: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          livekit_room: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: { id?: string; name: string; icon?: string | null; livekit_room?: string | null; created_by: string };
        Update: { name?: string; icon?: string | null; livekit_room?: string | null };
        Relationships: [];
      };
      circle_members: {
        Row: {
          circle_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          joined_at: string;
        };
        Insert: {
          circle_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
        };
        Update: { role?: "admin" | "member" };
        Relationships: [];
      };
      circle_invites: {
        Row: {
          id: string;
          circle_id: string;
          invited_by: string;
          invitee_user_id: string | null;
          invitee_phone: string | null;
          status: "pending" | "accepted" | "declined";
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          invited_by: string;
          invitee_user_id?: string | null;
          invitee_phone?: string | null;
        };
        Update: { status?: "pending" | "accepted" | "declined" };
        Relationships: [];
      };
      circle_messages: {
        Row: {
          id: string;
          circle_id: string;
          sender_id: string;
          kind: "voice" | "text" | "photo";
          body: string | null;
          media_url: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          sender_id: string;
          kind: "voice" | "text" | "photo";
          body?: string | null;
          media_url?: string | null;
          duration_seconds?: number | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      message_reactions: {
        Row: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: { message_id: string; user_id: string; emoji: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          kind: "voice" | "text" | "photo";
          body: string | null;
          media_url: string | null;
          duration_seconds: number | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          kind: "voice" | "text" | "photo";
          body?: string | null;
          media_url?: string | null;
          duration_seconds?: number | null;
        };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      moments: {
        Row: {
          id: string;
          circle_id: string;
          title: string;
          description: string | null;
          event_date: string | null;
          location: string | null;
          is_secret: boolean;
          honoree_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          title: string;
          description?: string | null;
          event_date?: string | null;
          location?: string | null;
          is_secret?: boolean;
          honoree_id?: string | null;
          created_by: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          event_date?: string | null;
          location?: string | null;
        };
        Relationships: [];
      };
      moment_attendees: {
        Row: {
          moment_id: string;
          user_id: string;
          rsvp_status: "invited" | "going" | "maybe" | "declined";
        };
        Insert: {
          moment_id: string;
          user_id: string;
          rsvp_status?: "invited" | "going" | "maybe" | "declined";
        };
        Update: { rsvp_status?: "invited" | "going" | "maybe" | "declined" };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          moment_id: string;
          uploader_id: string;
          image_url: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          moment_id: string;
          uploader_id: string;
          image_url: string;
          caption?: string | null;
        };
        Update: { caption?: string | null };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          moment_id: string | null;
          circle_id: string | null;
          paid_by: string;
          amount_cents: number;
          currency: string;
          description: string;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          moment_id?: string | null;
          circle_id?: string | null;
          paid_by: string;
          amount_cents: number;
          currency?: string;
          description: string;
          category?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          owed_by: string;
          amount_cents: number;
          settled: boolean;
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          owed_by: string;
          amount_cents: number;
          settled?: boolean;
        };
        Update: { settled?: boolean; settled_at?: string | null };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          data?: Json;
        };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      circle_private_rooms: {
        Row: {
          id: string;
          circle_id: string;
          created_by: string;
          name: string;
          description: string | null;
          room_mode: "standard" | "encrypted";
          room_code: string;
          passcode_hash: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          created_by: string;
          name: string;
          description?: string | null;
          room_mode: "standard" | "encrypted";
          room_code: string;
          passcode_hash?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      circle_private_room_members: {
        Row: {
          private_room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: { private_room_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      bets: {
        Row: {
          id: string;
          circle_id: string;
          created_by: string;
          title: string;
          description: string | null;
          bet_type: "binary" | "multi" | "pool";
          options: Json;           // string[] of option labels
          max_stake: number;
          status: "open" | "closed" | "resolved" | "cancelled";
          resolved_option: number | null;
          winner_user_id: string | null;
          closes_at: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          bet_type: "binary" | "multi" | "pool";
          options?: Json;
          max_stake?: number;
          closes_at?: string | null;
        };
        Update: {
          status?: "open" | "closed" | "resolved" | "cancelled";
          resolved_option?: number | null;
          winner_user_id?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      bet_entries: {
        Row: {
          id: string;
          bet_id: string;
          user_id: string;
          option_index: number | null;
          amount_coins: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          bet_id: string;
          user_id: string;
          option_index?: number | null;
          amount_coins: number;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      coin_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount_coins: number;
          reason: string;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_coins: number;
          reason: string;
          reference_id?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      stories: {
        Row: {
          id: string;
          author_id: string;
          media_url: string;
          media_type: string;
          caption: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          media_url: string;
          media_type: string;
          caption?: string | null;
          expires_at: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      story_views: {
        Row: { story_id: string; viewer_id: string; viewed_at: string };
        Insert: { story_id: string; viewer_id: string; viewed_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      user_public_keys: {
        Row: { user_id: string; public_key: string; created_at: string; updated_at: string };
        Insert: { user_id: string; public_key: string };
        Update: { public_key?: string };
        Relationships: [];
      };
      circle_keys: {
        Row: {
          id: string;
          circle_id: string;
          user_id: string;
          encrypted_key: string;
          ephemeral_pub: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          user_id: string;
          encrypted_key: string;
          ephemeral_pub: string;
        };
        Update: { encrypted_key?: string; ephemeral_pub?: string };
        Relationships: [];
      };
      pending_key_shares: {
        Row: {
          id: string;
          invite_code: string;
          circle_id: string;
          wrapped_for_server: string | null;
          created_at: string;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          invite_code: string;
          circle_id: string;
          wrapped_for_server?: string | null;
        };
        Update: { claimed_at?: string | null };
        Relationships: [];
      };
      push_tokens: {
        Row: { id: string; user_id: string; token: string; platform: string; created_at: string };
        Insert: { id?: string; user_id: string; token: string; platform: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      circle_lotteries: {
        Row: {
          id: string;
          circle_id: string;
          created_by: string;
          title: string;
          entry_amount: number;
          currency: string;
          draw_date: string;
          status: "open" | "drawn" | "cancelled";
          winner_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          created_by: string;
          title: string;
          entry_amount: number;
          currency?: string;
          draw_date: string;
          status?: "open" | "drawn" | "cancelled";
        };
        Update: { status?: "open" | "drawn" | "cancelled"; winner_id?: string | null };
        Relationships: [];
      };
      lottery_entries: {
        Row: { id: string; lottery_id: string; user_id: string; paid: boolean; created_at: string };
        Insert: { id?: string; lottery_id: string; user_id: string; paid?: boolean };
        Update: { paid?: boolean };
        Relationships: [];
      };
      plan_items: {
        Row: {
          id: string;
          circle_id: string;
          text: string;
          category: string | null;
          assigned_to: string | null;
          is_done: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          text: string;
          category?: string | null;
          assigned_to?: string | null;
          is_done?: boolean;
          created_by: string;
        };
        Update: {
          text?: string;
          category?: string | null;
          assigned_to?: string | null;
          is_done?: boolean;
        };
        Relationships: [];
      };
      spot_invites: {
        Row: {
          id: string;
          circle_id: string;
          created_by: string;
          code: string;
          expires_at: string;
          uses: number;
          max_uses: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          created_by: string;
          code: string;
          expires_at?: string;
          max_uses?: number;
        };
        Update: { uses?: number };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_spot_by_invite: {
        Args: { p_code: string };
        Returns: { circle_id: string; circle_name: string; already_member: boolean } | null;
      };
      find_private_room_by_code: {
        Args: { p_code: string };
        Returns: Array<{ id: string; circle_id: string; name: string; room_mode: string; is_active: boolean }>;
      };
      join_standard_private_room: {
        Args: { p_code: string; p_passcode: string };
        Returns: Array<{ id: string; circle_id: string; name: string; room_mode: string }>;
      };
      create_standard_private_room: {
        Args: { p_circle_id: string; p_name: string; p_room_code: string; p_passcode: string };
        Returns: string;
      };
      grant_encrypted_room_access: {
        Args: { p_room_id: string };
        Returns: boolean;
      };
      place_bet: {
        Args: { p_bet_id: string; p_option_index: number | null; p_amount: number };
        Returns: string;
      };
      resolve_bet: {
        Args: { p_bet_id: string; p_winning_option: number | null; p_pool_winner: string | null };
        Returns: void;
      };
      cancel_bet: {
        Args: { p_bet_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ── Convenience aliases ──────────────────────────────────────────────────────
export type Profile = Database["friendspot"]["Tables"]["profiles"]["Row"];
export type Circle = Database["friendspot"]["Tables"]["circles"]["Row"];
export type CircleMember = Database["friendspot"]["Tables"]["circle_members"]["Row"];
export type CircleInvite = Database["friendspot"]["Tables"]["circle_invites"]["Row"];
export type CircleMessage = Database["friendspot"]["Tables"]["circle_messages"]["Row"];
export type MessageReaction = Database["friendspot"]["Tables"]["message_reactions"]["Row"];
export type DirectMessage = Database["friendspot"]["Tables"]["direct_messages"]["Row"];
export type Moment = Database["friendspot"]["Tables"]["moments"]["Row"];
export type MomentAttendee = Database["friendspot"]["Tables"]["moment_attendees"]["Row"];
export type Photo = Database["friendspot"]["Tables"]["photos"]["Row"];
export type Expense = Database["friendspot"]["Tables"]["expenses"]["Row"];
export type ExpenseSplit = Database["friendspot"]["Tables"]["expense_splits"]["Row"];
export type Notification = Database["friendspot"]["Tables"]["notifications"]["Row"];
export type CirclePrivateRoom = Database["friendspot"]["Tables"]["circle_private_rooms"]["Row"];
export type CirclePrivateRoomMember = Database["friendspot"]["Tables"]["circle_private_room_members"]["Row"];
export type Bet = Database["friendspot"]["Tables"]["bets"]["Row"];
export type BetEntry = Database["friendspot"]["Tables"]["bet_entries"]["Row"];
export type CoinTransaction = Database["friendspot"]["Tables"]["coin_transactions"]["Row"];
export type Story = Database["friendspot"]["Tables"]["stories"]["Row"];
export type StoryView = Database["friendspot"]["Tables"]["story_views"]["Row"];
export type UserPublicKey = Database["friendspot"]["Tables"]["user_public_keys"]["Row"];
export type CircleKey = Database["friendspot"]["Tables"]["circle_keys"]["Row"];
export type PendingKeyShare = Database["friendspot"]["Tables"]["pending_key_shares"]["Row"];
export type PushToken = Database["friendspot"]["Tables"]["push_tokens"]["Row"];
export type CircleLottery = Database["friendspot"]["Tables"]["circle_lotteries"]["Row"];
export type LotteryEntry = Database["friendspot"]["Tables"]["lottery_entries"]["Row"];
export type SpotInvite = Database["friendspot"]["Tables"]["spot_invites"]["Row"];
export type PlanItem = Database["friendspot"]["Tables"]["plan_items"]["Row"];

// ── Joined types used in UI ──────────────────────────────────────────────────
export type CircleMessageWithSender = CircleMessage & { sender: Profile };
/** @deprecated use CircleMessageWithSender */
export type VoiceNoteWithSender = CircleMessageWithSender;

export type MemberProfile = Profile & { role: "owner" | "admin" | "member" };
export type CircleWithMembers = Circle & { members: MemberProfile[]; member_count: number };
export type MomentWithCircle = Moment & { circle: Circle };
export type ExpenseWithSplits = Expense & {
  splits: (ExpenseSplit & { user: Profile })[];
  payer: Profile;
};

/** Bet with entries and creator profile pre-joined */
export type BetWithEntries = Bet & {
  entries: (BetEntry & { user: Profile })[];
  creator: Profile;
};

/** Summary of a single bet option for display */
export type BetOptionSummary = {
  index: number;
  label: string;
  totalCoins: number;
  entrantCount: number;
  odds: number;  // multiplier if you win (e.g. 2.5x)
};
