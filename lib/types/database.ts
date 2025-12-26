/**
 * Database types for F1 Sweepstakes
 * 
 * These types match the Supabase schema defined in migrations.
 * Run `npx supabase gen types typescript` to regenerate from live DB.
 */

// ============================================================================
// Base Types
// ============================================================================

export type UUID = string;
export type Timestamp = string;

// ============================================================================
// Profiles
// ============================================================================

export interface Profile {
  id: UUID;
  email: string;
  display_name: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'email' | 'created_at'>>;

// ============================================================================
// Seasons
// ============================================================================

export interface Season {
  id: UUID;
  year: number;
  is_current: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type SeasonInsert = Omit<Season, 'id' | 'created_at' | 'updated_at'>;
export type SeasonUpdate = Partial<Omit<Season, 'id' | 'created_at'>>;

// ============================================================================
// Point Mappings
// ============================================================================

export interface PointMapping {
  id: UUID;
  season_id: UUID;
  position: number;
  points: number;
  created_at: Timestamp;
}

export type PointMappingInsert = Omit<PointMapping, 'id' | 'created_at'>;
export type PointMappingUpdate = Partial<Omit<PointMapping, 'id' | 'season_id' | 'created_at'>>;

// ============================================================================
// Teams
// ============================================================================

export interface Team {
  id: UUID;
  season_id: UUID;
  name: string;
  color: string;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type TeamInsert = Omit<Team, 'id' | 'created_at' | 'updated_at'>;
export type TeamUpdate = Partial<Omit<Team, 'id' | 'season_id' | 'created_at'>>;

// ============================================================================
// Drivers
// ============================================================================

export interface Driver {
  id: UUID;
  team_id: UUID;
  driver_number: number;
  first_name: string;
  last_name: string;
  abbreviation: string;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type DriverInsert = Omit<Driver, 'id' | 'created_at' | 'updated_at'>;
export type DriverUpdate = Partial<Omit<Driver, 'id' | 'created_at'>>;

// Driver with team info (for display)
export interface DriverWithTeam extends Driver {
  team: Team;
}

// ============================================================================
// Races
// ============================================================================

export interface Race {
  id: UUID;
  season_id: UUID;
  name: string;
  location: string;
  race_date: string; // ISO date string YYYY-MM-DD
  round_number: number;
  results_finalized: boolean;
  picks_open: boolean;
  draft_order: any | null; // JSONB storage for DraftOrderEntry[]
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type RaceInsert = Omit<Race, 'id' | 'created_at' | 'updated_at'>;
export type RaceUpdate = Partial<Omit<Race, 'id' | 'season_id' | 'created_at'>>;

// ============================================================================
// Race Results
// ============================================================================

export interface RaceResult {
  id: UUID;
  race_id: UUID;
  driver_id: UUID;
  position: number | null;
  dnf: boolean;
  dsq: boolean;
  created_at: Timestamp;
}

export type RaceResultInsert = Omit<RaceResult, 'id' | 'created_at'>;
export type RaceResultUpdate = Partial<Omit<RaceResult, 'id' | 'race_id' | 'driver_id' | 'created_at'>>;

// Race result with driver info (for display)
export interface RaceResultWithDriver extends RaceResult {
  driver: DriverWithTeam;
}

// ============================================================================
// Picks
// ============================================================================

export interface Pick {
  id: UUID;
  race_id: UUID;
  user_id: UUID;
  driver_id: UUID;
  pick_order: number;
  draft_round: 1 | 2;
  created_at: Timestamp;
}

export type PickInsert = Omit<Pick, 'id' | 'created_at'>;
export type PickUpdate = Partial<Omit<Pick, 'id' | 'race_id' | 'user_id' | 'created_at'>>;

// Pick with related info (for display)
export interface PickWithDetails extends Pick {
  driver: DriverWithTeam;
  profile: Profile;
}

// ============================================================================
// Notifications
// ============================================================================

export type NotificationType = 'race_upcoming' | 'results_available' | 'your_turn_to_pick';

export interface Notification {
  id: UUID;
  user_id: UUID;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Timestamp;
}

export type NotificationInsert = Omit<Notification, 'id' | 'created_at' | 'read'>;
export type NotificationUpdate = { read?: boolean; };

// ============================================================================
// Changelog
// ============================================================================

export type ChangelogAction = 'create' | 'update' | 'delete';
export type ChangelogEntityType =
  | 'profiles'
  | 'seasons'
  | 'teams'
  | 'drivers'
  | 'races'
  | 'race_results'
  | 'picks'
  | 'point_mappings';

export interface ChangelogEntry {
  id: UUID;
  user_id: UUID | null;
  action: ChangelogAction;
  entity_type: ChangelogEntityType;
  entity_id: UUID | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: Timestamp;
}

// Changelog with user info (for display)
export interface ChangelogEntryWithUser extends ChangelogEntry {
  profile: Profile | null;
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface LeaderboardEntry {
  user_id: UUID;
  profile: Profile;
  total_points: number;
  races_participated: number;
  picks: {
    race_id: UUID;
    race_name: string;
    round_number: number;
    points: number;
  }[];
}

// ============================================================================
// Draft Order Types
// ============================================================================

export interface DraftSlot {
  pick_order: number;
  draft_round: 1 | 2;
  user_id: UUID;
  profile: Profile;
  has_picked: boolean;
  driver?: DriverWithTeam;
}

export interface DraftState {
  race: Race;
  slots: DraftSlot[];
  current_slot: DraftSlot | null;
  available_drivers: DriverWithTeam[];
  is_complete: boolean;
}
