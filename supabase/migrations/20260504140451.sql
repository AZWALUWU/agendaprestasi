-- Allow public to read event-question links (only metadata: which question is in which event/subject).
-- Actual question content remains protected by RLS on `questions` table (auth required).
DROP POLICY IF EXISTS "Authenticated read event questions" ON public.tryout_event_questions;

CREATE POLICY "Public read event questions metadata"
ON public.tryout_event_questions
FOR SELECT
USING (true);