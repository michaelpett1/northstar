-- ─────────────────────────────────────────────────────────────────────────────
-- Northstar — seed data
-- Run after the schema migration: paste into Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Team members ─────────────────────────────────────────────────────────────

insert into team_members (id, name, email, avatar_url, role) values
  ('u1', 'Alex Rivera',   'alex@northstar.io',   'https://ui-avatars.com/api/?name=Alex+Rivera&background=2563EB&color=fff&size=40',   'Product Lead'),
  ('u2', 'Jordan Kim',    'jordan@northstar.io',  'https://ui-avatars.com/api/?name=Jordan+Kim&background=7C3AED&color=fff&size=40',    'Engineering Lead'),
  ('u3', 'Sam Chen',      'sam@northstar.io',     'https://ui-avatars.com/api/?name=Sam+Chen&background=16A34A&color=fff&size=40',      'Design Lead'),
  ('u4', 'Morgan Walsh',  'morgan@northstar.io',  'https://ui-avatars.com/api/?name=Morgan+Walsh&background=D97706&color=fff&size=40',  'Data Analyst'),
  ('u5', 'Casey Park',    'casey@northstar.io',   'https://ui-avatars.com/api/?name=Casey+Park&background=DC2626&color=fff&size=40',    'Growth Manager')
on conflict (id) do nothing;

-- ── Timeline items ────────────────────────────────────────────────────────────
-- Dates relative to NOW() so the seed is always current

insert into timeline_items (id, title, description, type, parent_id, status, priority, owner_id, start_date, end_date, progress, dependencies, tags) values
  -- Onboarding Redesign
  ('p1',    'Onboarding Redesign',        'Complete overhaul of the user onboarding flow to improve activation rates.',
   'project', null, 'in_progress', 'p0', 'u1', now()-'14 days'::interval, now()+'60 days'::interval, 35, '{}', '{growth,ux}'),
  ('p1-t1', 'User research & interviews', '12 user interviews to identify onboarding pain points.',
   'task', 'p1', 'complete', 'p1', 'u3', now()-'14 days'::interval, now()-'3 days'::interval,  100, '{}', '{research}'),
  ('p1-t2', 'Wireframes & prototyping',   'Design new onboarding flow wireframes in Figma.',
   'task', 'p1', 'in_progress', 'p1', 'u3', now()-'3 days'::interval,  now()+'14 days'::interval, 60, '{p1-t1}', '{design}'),
  ('p1-t3', 'Frontend implementation',    'Build the new onboarding screens and integrate with backend.',
   'task', 'p1', 'not_started', 'p0', 'u2', now()+'14 days'::interval, now()+'45 days'::interval, 0,  '{p1-t2}', '{engineering}'),
  ('p1-m1', 'Onboarding v2 Launch',       'Ship the new onboarding flow to 100% of new users.',
   'milestone', 'p1', 'not_started', 'p0', 'u1', now()+'60 days'::interval, now()+'60 days'::interval, 0, '{p1-t3}', '{launch}'),

  -- Mobile App v2
  ('p2',    'Mobile App v2',             'Rebuild the mobile app with React Native for iOS and Android.',
   'project', null, 'at_risk', 'p0', 'u2', now()-'30 days'::interval, now()+'90 days'::interval, 20, '{}', '{mobile,platform}'),
  ('p2-t1', 'Architecture planning',     'Define tech stack, component library, and navigation structure.',
   'task', 'p2', 'complete', 'p1', 'u2', now()-'30 days'::interval, now()-'10 days'::interval, 100, '{}', '{engineering}'),
  ('p2-t2', 'Core screens build',        'Build home, profile, feed, and settings screens.',
   'task', 'p2', 'at_risk', 'p0', 'u2', now()-'10 days'::interval, now()+'50 days'::interval, 25, '{p2-t1}', '{engineering}'),

  -- Analytics Dashboard
  ('p3',    'Analytics Dashboard',       'Internal analytics dashboard for tracking key business metrics.',
   'project', null, 'in_progress', 'p1', 'u4', now()-'7 days'::interval,  now()+'30 days'::interval, 50, '{}', '{data,internal}'),
  ('p3-t1', 'Data pipeline setup',       'Configure event tracking and data warehouse pipeline.',
   'task', 'p3', 'complete', 'p1', 'u4', now()-'7 days'::interval,  now()+'5 days'::interval,  100, '{}', '{data}'),
  ('p3-t2', 'Dashboard UI build',        'Build chart components and dashboard layout.',
   'task', 'p3', 'in_progress', 'p1', 'u3', now()+'5 days'::interval,  now()+'25 days'::interval, 40, '{p3-t1}', '{design,engineering}'),

  -- API v3
  ('p4',    'API v3 Migration',          'Migrate all endpoints to the new GraphQL API.',
   'project', null, 'not_started', 'p1', 'u2', now()+'30 days'::interval, now()+'120 days'::interval, 0, '{p2}', '{platform,engineering}'),

  -- Growth Experiments
  ('p5',    'Q2 Growth Experiments',     'Series of A/B tests targeting conversion and retention improvements.',
   'project', null, 'in_progress', 'p1', 'u5', now()-'5 days'::interval,  now()+'55 days'::interval, 15, '{}', '{growth}')

on conflict (id) do nothing;

-- ── Objectives ────────────────────────────────────────────────────────────────

insert into objectives (id, title, description, owner_id, period, status) values
  ('o1', 'Improve user activation and onboarding',
   'Drive more new users to complete the core activation actions within their first week.',
   'u1', '2026-Q2', 'at_risk'),
  ('o2', 'Scale revenue through platform partnerships',
   'Build integrations and partnerships that drive enterprise revenue.',
   'u5', '2026-Q2', 'on_track'),
  ('o3', 'Accelerate engineering velocity',
   'Reduce cycle time and increase deployment frequency to ship faster.',
   'u2', '2026-Q2', 'on_track')
on conflict (id) do nothing;

-- ── Key results ───────────────────────────────────────────────────────────────

insert into key_results (id, objective_id, title, owner_id, metric_type, start_value, current_value, target_value, confidence) values
  ('kr1', 'o1', 'Increase activation rate from 34% to 55%',         'u1', 'percentage', 34,    41,     55,    'at_risk'),
  ('kr2', 'o1', 'Reduce time-to-first-value from 8 min to 3 min',   'u3', 'number',      8,     6,      3,     'at_risk'),
  ('kr3', 'o1', 'Ship onboarding A/B test with 3 variants',         'u5', 'binary',      0,     0,      1,     'on_track'),
  ('kr4', 'o2', 'Close 5 new enterprise contracts',                  'u5', 'number',      0,     3,      5,     'on_track'),
  ('kr5', 'o2', 'Grow MRR from $85k to $130k',                      'u5', 'currency',    85000, 103000, 130000,'on_track'),
  ('kr6', 'o3', 'Reduce average PR cycle time from 4 days to 1 day','u2', 'number',      4,     2.1,    1,     'on_track'),
  ('kr7', 'o3', 'Increase deploy frequency from 3x to 10x per week','u2', 'number',      3,     7,      10,    'on_track'),
  ('kr8', 'o3', 'Achieve 95% test coverage on core modules',        'u2', 'percentage',  62,    81,     95,    'on_track')
on conflict (id) do nothing;

-- ── Check-ins ─────────────────────────────────────────────────────────────────

insert into check_ins (id, key_result_id, value, note, created_at) values
  ('ci1',  'kr1', 36,    'Slight improvement after email nudge changes.',          now()-'21 days'::interval),
  ('ci2',  'kr1', 41,    'New tooltip onboarding helping. Still below pace.',      now()-'7 days'::interval),
  ('ci3',  'kr2', 7,     'Removed 2 steps from flow.',                             now()-'21 days'::interval),
  ('ci4',  'kr2', 6,     'Progress, but need bigger redesign to hit target.',      now()-'7 days'::interval),
  ('ci5',  'kr3', 0,     'Variants designed, awaiting engineering implementation.',now()-'14 days'::interval),
  ('ci6',  'kr4', 1,     'Signed Acme Corp.',                                      now()-'28 days'::interval),
  ('ci7',  'kr4', 3,     'Two more in. Pipeline looks healthy.',                   now()-'7 days'::interval),
  ('ci8',  'kr5', 91000, 'January close.',                                         now()-'28 days'::interval),
  ('ci9',  'kr5', 103000,'February close. Strong month.',                          now()-'7 days'::interval),
  ('ci10', 'kr6', 3.2,   'Async review culture starting to take hold.',            now()-'21 days'::interval),
  ('ci11', 'kr6', 2.1,   'New bot reminders helping a lot.',                       now()-'7 days'::interval),
  ('ci12', 'kr7', 5,     'CI pipeline improvements shipped.',                      now()-'21 days'::interval),
  ('ci13', 'kr7', 7,     'Consistent. Targeting 10 by EOQ.',                       now()-'7 days'::interval),
  ('ci14', 'kr8', 71,    'Auth and billing modules done.',                         now()-'21 days'::interval),
  ('ci15', 'kr8', 81,    'Good progress on payment flows.',                        now()-'7 days'::interval)
on conflict (id) do nothing;

-- ── Activity events ───────────────────────────────────────────────────────────

insert into activity_events (id, text, type, created_at) values
  ('a1', 'OKR ''Grow MRR to $130k'' updated to $103k',                     'progress',      now()-'1 day'::interval),
  ('a2', 'Project ''Mobile App v2'' status changed to At Risk',             'status_change', now()-'2 days'::interval),
  ('a3', 'OKR ''Reduce PR cycle time'' check-in: 2.1 days',                'checkin',       now()-'3 days'::interval),
  ('a4', 'Milestone ''Onboarding v2 Launch'' added to timeline',            'created',       now()-'4 days'::interval),
  ('a5', 'Task ''Data pipeline setup'' marked complete',                    'status_change', now()-'5 days'::interval),
  ('a6', 'OKR ''Close 5 enterprise contracts'' — 3 of 5 closed',           'progress',      now()-'5 days'::interval),
  ('a7', 'Project ''Q2 Growth Experiments'' created',                       'created',       now()-'7 days'::interval),
  ('a8', 'Task ''Wireframes & prototyping'' progress 60%',                  'progress',      now()-'8 days'::interval)
on conflict (id) do nothing;
