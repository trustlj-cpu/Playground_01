-- DailyDrop 08:00 KST 현황 보고 쿼리 (대시보드와 같음). 개인 정보 열은 조회하지 않는다.

-- [dailydrop-users f3291f00-21f6-4f8a-b1bc-0e25b6ab1767] 일별 실방문 (로그인한 팀 방문 제외)
WITH team AS (SELECT DISTINCT day, vid_hash FROM pageviews WHERE user_id IS NOT NULL)
SELECT p.day AS day,
       COUNT(DISTINCT CASE WHEN t.vid_hash IS NULL THEN p.vid_hash END) AS real_visitors,
       SUM(CASE WHEN t.vid_hash IS NULL THEN 1 ELSE 0 END) AS real_views
FROM pageviews p LEFT JOIN team t ON t.day = p.day AND t.vid_hash = p.vid_hash
WHERE p.day >= date('now', '+9 hours', '-8 days') GROUP BY p.day ORDER BY p.day;

-- [dailydrop-users] 최근 7일 유입·판별 방문자
WITH team AS (SELECT DISTINCT day, vid_hash FROM pageviews WHERE user_id IS NOT NULL),
r AS (SELECT p.* FROM pageviews p LEFT JOIN team t ON t.day = p.day AND t.vid_hash = p.vid_hash
      WHERE t.vid_hash IS NULL AND p.day >= date('now', '+9 hours', '-6 days'))
SELECT * FROM (SELECT 'source' AS kind, COALESCE(ref_host, '(직접 방문)') AS name, COUNT(DISTINCT day || vid_hash) AS visitors FROM r GROUP BY 2 ORDER BY 3 DESC LIMIT 5)
UNION ALL SELECT * FROM (SELECT 'edition', COALESCE(region, '-'), COUNT(DISTINCT day || vid_hash) FROM r GROUP BY 2 ORDER BY 3 DESC LIMIT 4);

-- [dailydrop-users] 최근 7일 많이 본 페이지
WITH team AS (SELECT DISTINCT day, vid_hash FROM pageviews WHERE user_id IS NOT NULL)
SELECT p.path AS page, COUNT(*) AS views FROM pageviews p
LEFT JOIN team t ON t.day = p.day AND t.vid_hash = p.vid_hash
WHERE t.vid_hash IS NULL AND p.day >= date('now', '+9 hours', '-6 days')
GROUP BY p.path ORDER BY views DESC LIMIT 5;

-- [dailydrop-users] 계정·북마크
SELECT (SELECT COUNT(*) FROM users) AS accounts,
       (SELECT COUNT(*) FROM users WHERE created_at >= (strftime('%s', 'now') - 7 * 86400) * 1000) AS new_accounts_7d,
       (SELECT COUNT(*) FROM bookmarks) AS bookmarks,
       (SELECT COUNT(*) FROM bookmarks WHERE created_at >= (strftime('%s', 'now') - 7 * 86400) * 1000) AS bookmarks_7d;

-- [dailydrop-feed 0f239386-f7cf-42ed-838d-46eb896bea87] 일별 수집 횟수 (130회 미만이면 이상)
SELECT substr(batch, 1, 10) AS day, COUNT(*) AS runs FROM batches
WHERE batch >= strftime('%Y-%m-%d', 'now', '-7 days') AND batch NOT LIKE '%bf-%' GROUP BY 1 ORDER BY 1;
