-- LocalHire marketplace outcomes, trailing 30 UTC days.
-- Denominators: application_rate = jobs with >=1 application / published jobs;
-- hire_rate = hired applications / applications. Seed/demo accounts are excluded
-- via Users.IsTestAccount, which registration never exposes to clients.
WITH real_jobs AS (
    SELECT j.*
    FROM "JobPosts" j
    JOIN "Users" employer ON employer."Id" = j."EmployerId"
    WHERE NOT employer."IsTestAccount"
      AND j."CreatedAt" >= CURRENT_DATE - INTERVAL '30 days'
), real_applications AS (
    SELECT a.*
    FROM "JobApplications" a
    JOIN real_jobs j ON j."Id" = a."JobPostId"
    JOIN "Users" worker ON worker."Id" = a."WorkerId"
    WHERE NOT worker."IsTestAccount"
), first_application AS (
    SELECT j."Id", MIN(a."CreatedAt") AS at
    FROM real_jobs j LEFT JOIN real_applications a ON a."JobPostId" = j."Id"
    GROUP BY j."Id"
), first_decision AS (
    SELECT j."Id", MIN(a."StatusUpdatedAt") AS at
    FROM real_jobs j LEFT JOIN real_applications a ON a."JobPostId" = j."Id"
      AND a."Status" IN ('Shortlisted', 'Rejected', 'Hired')
    GROUP BY j."Id"
)
SELECT
    COUNT(DISTINCT j."Id") AS published_jobs,
    COUNT(DISTINCT a."Id") AS applications,
    COUNT(DISTINCT a."Id") FILTER (WHERE a."Status" = 'Shortlisted') AS current_shortlists,
    COUNT(DISTINCT a."Id") FILTER (WHERE a."Status" = 'Hired') AS hires,
    ROUND(100.0 * COUNT(DISTINCT j."Id") FILTER (WHERE fa.at IS NOT NULL) / NULLIF(COUNT(DISTINCT j."Id"), 0), 2) AS application_rate_percent,
    ROUND(100.0 * COUNT(DISTINCT a."Id") FILTER (WHERE a."Status" = 'Hired') / NULLIF(COUNT(DISTINCT a."Id"), 0), 2) AS hire_rate_percent,
    AVG(fa.at - j."CreatedAt") FILTER (WHERE fa.at IS NOT NULL) AS average_time_to_first_application,
    AVG(fd.at - j."CreatedAt") FILTER (WHERE fd.at IS NOT NULL) AS average_time_to_first_decision
FROM real_jobs j
LEFT JOIN real_applications a ON a."JobPostId" = j."Id"
LEFT JOIN first_application fa ON fa."Id" = j."Id"
LEFT JOIN first_decision fd ON fd."Id" = j."Id";
