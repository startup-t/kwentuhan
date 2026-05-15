-- ─────────────────────────────────────────────────────────────────────────
-- Kwentuhan impact metrics — raw SQL
-- ─────────────────────────────────────────────────────────────────────────
--
-- These are the same queries the GET /api/metrics endpoint runs, written
-- here so analysts can paste them straight into the Supabase SQL Editor.
--
-- Tables in scope:
--   - session_events       (telemetry — every shown/skipped/answered/shared/reacted)
--   - contributed_questions (community-submitted questions)
--
-- Conventions:
--   - All queries default to the last 30 days. Change INTERVAL '30 days'
--     to your window of interest, or remove the WHERE clause for all-time.
--   - Rates are returned as percentages (0–100) with 2 dp precision.
-- ─────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────
-- 1. ACTIVITY — DAU / WAU / MAU
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  COUNT(DISTINCT session_id) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')   AS dau,
  COUNT(DISTINCT session_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS wau,
  COUNT(DISTINCT session_id) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS mau
FROM session_events;


-- ─────────────────────────────────────────────────────────────────────────
-- 2. ENGAGEMENT — events / shown / answered per session
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  COUNT(*)                AS total_sessions,
  ROUND(AVG(events_count)::numeric,   2) AS avg_events_per_session,
  ROUND(AVG(shown_count)::numeric,    2) AS avg_shown_per_session,
  ROUND(AVG(answered_count)::numeric, 2) AS avg_answered_per_session
FROM (
  SELECT session_id,
         COUNT(*)                                              AS events_count,
         COUNT(*) FILTER (WHERE event_type='shown')            AS shown_count,
         COUNT(*) FILTER (WHERE event_type='answered')         AS answered_count
  FROM session_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY session_id
) s;


-- ─────────────────────────────────────────────────────────────────────────
-- 3. FUNNEL — answer / share / reaction / skip rates (% of shown)
-- ─────────────────────────────────────────────────────────────────────────
WITH counts AS (
  SELECT
    COUNT(*) FILTER (WHERE event_type='shown')    AS shown,
    COUNT(*) FILTER (WHERE event_type='answered') AS answered,
    COUNT(*) FILTER (WHERE event_type='shared')   AS shared,
    COUNT(*) FILTER (WHERE event_type='reacted')  AS reacted,
    COUNT(*) FILTER (WHERE event_type='skipped')  AS skipped
  FROM session_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  shown,
  ROUND(100.0 * answered  / NULLIF(shown,0), 2) AS answer_rate_pct,
  ROUND(100.0 * shared    / NULLIF(shown,0), 2) AS share_rate_pct,
  ROUND(100.0 * reacted   / NULLIF(shown,0), 2) AS reaction_rate_pct,
  ROUND(100.0 * skipped   / NULLIF(shown,0), 2) AS skip_rate_pct
FROM counts;


-- ─────────────────────────────────────────────────────────────────────────
-- 4. QUALITY — dwell-to-answer distribution + avg answer length
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  COUNT(*)                                                     AS answered_count,
  ROUND(AVG(dwell_ms))                                         AS avg_dwell_ms,
  ROUND(PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY dwell_ms))  AS p50_dwell_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY dwell_ms))  AS p95_dwell_ms,
  ROUND(AVG(answer_length_chars)::numeric, 2)                  AS avg_answer_length_chars
FROM session_events
WHERE event_type = 'answered'
  AND created_at >= NOW() - INTERVAL '30 days';


-- ─────────────────────────────────────────────────────────────────────────
-- 5. VIRALITY — proxy K-factor (shares per session)
-- ─────────────────────────────────────────────────────────────────────────
-- This is a proxy. True K-factor requires attributing a NEW session to a
-- specific share (e.g., via UTM tags on outbound share URLs). Reasonable
-- starting signal: how many shares does the average session produce?
SELECT
  COUNT(*) FILTER (WHERE event_type='shared') AS share_count,
  COUNT(DISTINCT session_id)                  AS session_count,
  ROUND(
    COUNT(*) FILTER (WHERE event_type='shared')::numeric
      / NULLIF(COUNT(DISTINCT session_id), 0),
    2
  ) AS shares_per_session
FROM session_events
WHERE created_at >= NOW() - INTERVAL '30 days';


-- ─────────────────────────────────────────────────────────────────────────
-- 6. TOP QUESTIONS — performance leaderboard
-- ─────────────────────────────────────────────────────────────────────────
-- The seed for the question-quality graph (data moat #1).
--
-- `min_shown` filters out tiny-sample noise — a question shown once and
-- answered once shouldn't dominate at 100%.
SELECT question_id,
       COUNT(*) FILTER (WHERE event_type='shown')     AS shown,
       COUNT(*) FILTER (WHERE event_type='answered')  AS answered,
       COUNT(*) FILTER (WHERE event_type='shared')    AS shared,
       COUNT(*) FILTER (WHERE event_type='reacted')   AS reacted,
       COUNT(*) FILTER (WHERE event_type='skipped')   AS skipped,
       ROUND(
         100.0 * COUNT(*) FILTER (WHERE event_type='answered')::numeric
              / NULLIF(COUNT(*) FILTER (WHERE event_type='shown'), 0),
         2
       ) AS answer_rate_pct,
       -- v0 composite engagement score: any positive interaction over shown
       ROUND(
         100.0 * (
           COUNT(*) FILTER (WHERE event_type='answered')
         + COUNT(*) FILTER (WHERE event_type='shared')
         + COUNT(*) FILTER (WHERE event_type='reacted')
         )::numeric
         / NULLIF(COUNT(*) FILTER (WHERE event_type='shown'), 0),
         2
       ) AS engagement_rate_pct
FROM session_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY question_id
HAVING COUNT(*) FILTER (WHERE event_type='shown') >= 5  -- min_shown
ORDER BY answer_rate_pct DESC NULLS LAST
LIMIT 20;


-- ─────────────────────────────────────────────────────────────────────────
-- 7. WORST QUESTIONS — flip the leaderboard for content pruning
-- ─────────────────────────────────────────────────────────────────────────
-- Use this to identify low-engagement questions worth rewriting or removing.
SELECT question_id,
       COUNT(*) FILTER (WHERE event_type='shown')    AS shown,
       COUNT(*) FILTER (WHERE event_type='skipped')  AS skipped,
       ROUND(
         100.0 * COUNT(*) FILTER (WHERE event_type='skipped')::numeric
              / NULLIF(COUNT(*) FILTER (WHERE event_type='shown'), 0),
         2
       ) AS skip_rate_pct
FROM session_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY question_id
HAVING COUNT(*) FILTER (WHERE event_type='shown') >= 5
ORDER BY skip_rate_pct DESC NULLS LAST
LIMIT 20;


-- ─────────────────────────────────────────────────────────────────────────
-- 8. COMMUNITY — contributions + community-question performance
-- ─────────────────────────────────────────────────────────────────────────
-- Contributed in window
SELECT COUNT(*) AS contributed_questions_30d
FROM contributed_questions
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Answers on community questions (ids starting q_)
SELECT COUNT(*) AS answers_on_community_qs_30d
FROM session_events
WHERE event_type = 'answered'
  AND question_id LIKE 'q\_%' ESCAPE '\'
  AND created_at >= NOW() - INTERVAL '30 days';


-- ─────────────────────────────────────────────────────────────────────────
-- 9. SESSION TIMELINE — replay a single session's events
-- ─────────────────────────────────────────────────────────────────────────
-- Useful for debugging a specific user's flow / understanding why a
-- particular question caused a drop-off.
SELECT created_at, question_id, event_type, answer_length_chars, dwell_ms
FROM session_events
WHERE session_id = '<paste session_id here>'
ORDER BY created_at;


-- ─────────────────────────────────────────────────────────────────────────
-- 9b. COMMUNITY QUESTION PERFORMANCE — full feed with per-Q signals
-- ─────────────────────────────────────────────────────────────────────────
-- The query that powers `GET /api/contribute?sort=…` (moat #2 read path).
-- Each community question gets a LATERAL aggregate of its session_events.
-- Replace the ORDER BY and HAVING to slice differently.
SELECT
  cq.id,
  cq.hook,
  cq.level,
  cq.category,
  cq.mode,
  cq.contributor_username,
  cq.created_at,
  COALESCE(s.shown, 0)    AS shown,
  COALESCE(s.answered, 0) AS answered,
  COALESCE(s.reacted, 0)  AS reacted,
  COALESCE(s.shared, 0)   AS shared,
  COALESCE(s.skipped, 0)  AS skipped,
  ROUND(
    100.0 * COALESCE(s.answered,0)::numeric
         / NULLIF(COALESCE(s.shown,0), 0), 2
  ) AS answer_rate_pct,
  ROUND(
    100.0 * (COALESCE(s.answered,0) + COALESCE(s.reacted,0) + COALESCE(s.shared,0))::numeric
         / NULLIF(COALESCE(s.shown,0), 0), 2
  ) AS engagement_rate_pct,
  ROUND(
    100.0 * COALESCE(s.skipped,0)::numeric
         / NULLIF(COALESCE(s.shown,0), 0), 2
  ) AS skip_rate_pct
FROM contributed_questions cq
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE event_type='shown')    AS shown,
    COUNT(*) FILTER (WHERE event_type='answered') AS answered,
    COUNT(*) FILTER (WHERE event_type='reacted')  AS reacted,
    COUNT(*) FILTER (WHERE event_type='shared')   AS shared,
    COUNT(*) FILTER (WHERE event_type='skipped')  AS skipped
  FROM session_events se
  WHERE se.question_id = cq.id
    AND se.created_at >= NOW() - INTERVAL '30 days'
) s ON true
WHERE cq.is_published = TRUE
ORDER BY engagement_rate_pct DESC NULLS LAST, cq.created_at DESC
LIMIT 50;


-- ─────────────────────────────────────────────────────────────────────────
-- 10. NEW vs RETURNING — repeat-usage signal
-- ─────────────────────────────────────────────────────────────────────────
-- A session is "returning" if it has activity on >= 2 distinct days.
WITH session_days AS (
  SELECT session_id, COUNT(DISTINCT DATE(created_at)) AS days_active
  FROM session_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY session_id
)
SELECT
  COUNT(*) FILTER (WHERE days_active = 1) AS one_day_sessions,
  COUNT(*) FILTER (WHERE days_active >= 2) AS returning_sessions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE days_active >= 2)::numeric
         / NULLIF(COUNT(*), 0),
    2
  ) AS returning_rate_pct
FROM session_days;
