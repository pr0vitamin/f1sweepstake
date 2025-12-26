-- F1 Sweepstakes Seed Data
-- Migration: 004_seed_data.sql
-- 
-- This creates:
-- 1. A current season (2025)
-- 2. Default F1 point mappings (modified for sweepstakes with negative points for low positions)

-- ============================================================================
-- CREATE 2025 SEASON
-- ============================================================================
insert into public.seasons (year, is_current)
values (2025, true);

-- ============================================================================
-- DEFAULT POINT MAPPINGS
-- Based on F1 scoring but modified:
-- - Top 10 get positive points
-- - Positions 11-15 get 0 points  
-- - Positions 16-20 get negative points (penalty for picking poorly)
-- ============================================================================
insert into public.point_mappings (season_id, position, points)
select 
  s.id,
  pm.position,
  pm.points
from public.seasons s
cross join (
  values 
    (1, 25),   -- 1st place
    (2, 18),   -- 2nd place
    (3, 15),   -- 3rd place
    (4, 12),   -- 4th place
    (5, 10),   -- 5th place
    (6, 8),    -- 6th place
    (7, 6),    -- 7th place
    (8, 4),    -- 8th place
    (9, 2),    -- 9th place
    (10, 1),   -- 10th place
    (11, 0),   -- 11th place
    (12, 0),   -- 12th place
    (13, 0),   -- 13th place
    (14, 0),   -- 14th place
    (15, 0),   -- 15th place
    (16, -1),  -- 16th place (penalty)
    (17, -2),  -- 17th place (penalty)
    (18, -3),  -- 18th place (penalty)
    (19, -4),  -- 19th place (penalty)
    (20, -5),  -- 20th place (penalty)
    (21, -6),  -- 21st place / DNF penalty
    (22, -7)   -- 22nd place / DNF penalty
) as pm(position, points)
where s.is_current = true;

-- ============================================================================
-- 2025 F1 TEAMS
-- ============================================================================
insert into public.teams (season_id, name, color, is_active)
select 
  s.id,
  t.name,
  t.color,
  true
from public.seasons s
cross join (
  values 
    ('Red Bull Racing', '#3671C6'),
    ('Ferrari', '#E80020'),
    ('Mercedes', '#27F4D2'),
    ('McLaren', '#FF8000'),
    ('Aston Martin', '#229971'),
    ('Alpine', '#FF87BC'),
    ('Williams', '#64C4FF'),
    ('RB', '#6692FF'),
    ('Kick Sauber', '#52E252'),
    ('Haas', '#B6BABD')
) as t(name, color)
where s.is_current = true;

-- ============================================================================
-- 2025 F1 DRIVERS
-- Note: This is based on announced 2025 lineups, update as needed
-- ============================================================================
with current_teams as (
  select t.id, t.name
  from public.teams t
  join public.seasons s on t.season_id = s.id
  where s.is_current = true
)
insert into public.drivers (team_id, driver_number, first_name, last_name, abbreviation, is_active)
select 
  ct.id,
  d.driver_number,
  d.first_name,
  d.last_name,
  d.abbreviation,
  true
from current_teams ct
join (
  values 
    -- Red Bull Racing
    ('Red Bull Racing', 1, 'Max', 'Verstappen', 'VER'),
    ('Red Bull Racing', 30, 'Liam', 'Lawson', 'LAW'),
    -- Ferrari
    ('Ferrari', 16, 'Charles', 'Leclerc', 'LEC'),
    ('Ferrari', 44, 'Lewis', 'Hamilton', 'HAM'),
    -- Mercedes
    ('Mercedes', 63, 'George', 'Russell', 'RUS'),
    ('Mercedes', 12, 'Andrea Kimi', 'Antonelli', 'ANT'),
    -- McLaren
    ('McLaren', 4, 'Lando', 'Norris', 'NOR'),
    ('McLaren', 81, 'Oscar', 'Piastri', 'PIA'),
    -- Aston Martin
    ('Aston Martin', 14, 'Fernando', 'Alonso', 'ALO'),
    ('Aston Martin', 18, 'Lance', 'Stroll', 'STR'),
    -- Alpine
    ('Alpine', 10, 'Pierre', 'Gasly', 'GAS'),
    ('Alpine', 7, 'Jack', 'Doohan', 'DOO'),
    -- Williams
    ('Williams', 23, 'Alex', 'Albon', 'ALB'),
    ('Williams', 55, 'Carlos', 'Sainz', 'SAI'),
    -- RB (formerly AlphaTauri)
    ('RB', 22, 'Yuki', 'Tsunoda', 'TSU'),
    ('RB', 6, 'Isack', 'Hadjar', 'HAD'),
    -- Kick Sauber
    ('Kick Sauber', 27, 'Nico', 'Hulkenberg', 'HUL'),
    ('Kick Sauber', 5, 'Gabriel', 'Bortoleto', 'BOR'),
    -- Haas
    ('Haas', 31, 'Esteban', 'Ocon', 'OCO'),
    ('Haas', 87, 'Oliver', 'Bearman', 'BEA')
) as d(team_name, driver_number, first_name, last_name, abbreviation)
on ct.name = d.team_name;
