-- F1 Sweepstakes Seed Data
-- Migration: 004_seed_data.sql
-- 
-- This creates:
-- 1. A current season for 2026 with Teams, Drivers, Races.
-- 2. Default point mappings

-- ============================================================================
-- CREATE 2026 SEASON
-- ============================================================================
insert into public.seasons (year, is_current)
values (2026, true);

-- ============================================================================
-- DEFAULT POINT MAPPINGS
-- Based on F1 scoring but modified to go negative for lower positions
-- - Top 10 get positive points
-- - Positions 11-13 get 0 points
-- - Positions 14-16 get -1 point
-- - Positions 17-19 get -2 points
-- - Positions 20-22 get -3 points
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
    (14, -1),   -- 14th place
    (15, -1),   -- 15th place
    (16, -1),  -- 16th place
    (17, -2),  -- 17th place
    (18, -2),  -- 18th place
    (19, -2),  -- 19th place
    (20, -3),  -- 20th place
    (21, -3),  -- 21st place
    (22, -3)   -- 22nd place
) as pm(position, points)
where s.is_current = true;

-- ============================================================================
-- 2026 F1 TEAMS
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
    ('Racing Bulls', '#6692FF'),
    ('Audi', '#000000'),
    ('Haas', '#B6BABD'),
    ('Cadillac', '#E8CC40')
) as t(name, color)
where s.is_current = true;

-- ============================================================================
-- 2026 F1 DRIVERS
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
    ('Red Bull Racing', 3, 'Max', 'Verstappen', 'VER'),
    ('Red Bull Racing', 6, 'Isack', 'Hadjar', 'HAD'),
    -- Ferrari
    ('Ferrari', 16, 'Charles', 'Leclerc', 'LEC'),
    ('Ferrari', 44, 'Lewis', 'Hamilton', 'HAM'),
    -- Mercedes
    ('Mercedes', 63, 'George', 'Russell', 'RUS'),
    ('Mercedes', 12, 'Kimi', 'Antonelli', 'ANT'),
    -- McLaren
    ('McLaren', 1, 'Lando', 'Norris', 'NOR'),
    ('McLaren', 81, 'Oscar', 'Piastri', 'PIA'),
    -- Aston Martin
    ('Aston Martin', 14, 'Fernando', 'Alonso', 'ALO'),
    ('Aston Martin', 18, 'Lance', 'Stroll', 'STR'),
    -- Alpine
    ('Alpine', 10, 'Pierre', 'Gasly', 'GAS'),
    ('Alpine', 43, 'Franco', 'Colapinto', 'COL'),
    -- Williams
    ('Williams', 23, 'Alex', 'Albon', 'ALB'),
    ('Williams', 55, 'Carlos', 'Sainz', 'SAI'),
    -- Racing Bulls
    ('Racing Bulls', 41, 'Arvid', 'Lindblad', 'LIN'),
    ('Racing Bulls', 30, 'Liam', 'Lawson', 'LAW'),
    -- Audi
    ('Audi', 27, 'Nico', 'Hulkenberg', 'HUL'),
    ('Audi', 5, 'Gabriel', 'Bortoleto', 'BOR'),
    -- Haas
    ('Haas', 31, 'Esteban', 'Ocon', 'OCO'),
    ('Haas', 87, 'Oliver', 'Bearman', 'BEA'),
    -- Cadillac
    ('Cadillac', 11, 'Sergio', 'Perez', 'PER'),
    ('Cadillac', 77, 'Valtteri', 'Bottas', 'BOT')
) as d(team_name, driver_number, first_name, last_name, abbreviation)
on ct.name = d.team_name;

-- ============================================================================
-- 2026 F1 RACE CALENDAR
-- Official 24-race calendar for 2026 season
-- ============================================================================
insert into public.races (season_id, name, location, race_date, round_number)
select 
  s.id,
  r.name,
  r.location,
  r.race_date::date,
  r.round_number
from public.seasons s
cross join (
  values 
    (1, 'Australian Grand Prix', 'Melbourne', '2026-03-08'),
    (2, 'Chinese Grand Prix', 'Shanghai', '2026-03-15'),
    (3, 'Japanese Grand Prix', 'Suzuka', '2026-03-29'),
    (4, 'Bahrain Grand Prix', 'Sakhir', '2026-04-12'),
    (5, 'Saudi Arabian Grand Prix', 'Jeddah', '2026-04-19'),
    (6, 'Miami Grand Prix', 'Miami', '2026-05-03'),
    (7, 'Canadian Grand Prix', 'Montreal', '2026-05-24'),
    (8, 'Monaco Grand Prix', 'Monte Carlo', '2026-06-07'),
    (9, 'Barcelona-Catalunya Grand Prix', 'Catalunya', '2026-06-14'),
    (10, 'Austrian Grand Prix', 'Spielberg', '2026-06-28'),
    (11, 'British Grand Prix', 'Silverstone', '2026-07-05'),
    (12, 'Belgian Grand Prix', 'Spa-Francorchamps', '2026-07-19'),
    (13, 'Hungarian Grand Prix', 'Hungaroring', '2026-07-26'),
    (14, 'Dutch Grand Prix', 'Zandvoort', '2026-08-23'),
    (15, 'Italian Grand Prix', 'Monza', '2026-09-06'),
    (16, 'Spanish Grand Prix', 'Madring', '2026-09-13'),
    (17, 'Azerbaijan Grand Prix', 'Baku', '2026-09-27'),
    (18, 'Singapore Grand Prix', 'Singapore', '2026-10-11'),
    (19, 'United States Grand Prix', 'Austin', '2026-10-25'),
    (20, 'Mexico City Grand Prix', 'Mexico City', '2026-11-01'),
    (21, 'São Paulo Grand Prix', 'Interlagos', '2026-11-08'),
    (22, 'Las Vegas Grand Prix', 'Las Vegas', '2026-11-22'),
    (23, 'Qatar Grand Prix', 'Lusail', '2026-11-29'),
    (24, 'Abu Dhabi Grand Prix', 'Yas Marina Circuit', '2026-12-06')
) as r(round_number, name, location, race_date)
where s.is_current = true;
