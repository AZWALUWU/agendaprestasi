-- 1. Subjects
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  duration_minutes int not null default 30,
  order_index int not null,
  created_at timestamptz not null default now()
);

insert into public.subjects (code, name, duration_minutes, order_index) values
  ('KPU',  'Kemampuan Penalaran Umum',         30, 1),
  ('KK',   'Kemampuan Kuantitatif',             20, 2),
  ('PPU',  'Pengetahuan dan Pemahaman Umum',    25, 3),
  ('PMM',  'Pemahaman Membaca dan Menulis',     25, 4),
  ('PM',   'Penalaran Matematika',              30, 5),
  ('LBI',  'Literasi Bahasa Indonesia',         25, 6),
  ('LBE',  'Literasi Bahasa Inggris',           25, 7),
  ('PKU',  'Pengetahuan Kuantitatif',           20, 8);

-- 2. Questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade not null,
  question_text text not null,
  image_url text,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  option_e text not null,
  correct_answer text check (correct_answer in ('A','B','C','D','E')) not null,
  explanation text,
  explanation_image_url text,
  difficulty text check (difficulty in ('easy','medium','hard')) default 'medium',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger update_questions_updated_at
before update on public.questions
for each row execute function public.update_updated_at_column();

-- 3. Tryout events
create table public.tryout_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status text check (status in ('draft','published','ended')) default 'draft',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger update_tryout_events_updated_at
before update on public.tryout_events
for each row execute function public.update_updated_at_column();

-- 4. Event questions
create table public.tryout_event_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.tryout_events(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) not null,
  question_id uuid references public.questions(id) not null,
  order_index int not null default 0,
  unique(event_id, question_id)
);

-- 5. Sessions
create table public.tryout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_id uuid references public.tryout_events(id) on delete cascade not null,
  current_subject_id uuid references public.subjects(id),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  total_score numeric(6,2),
  status text check (status in ('in_progress','submitted')) default 'in_progress'
);

-- 6. Answers
create table public.tryout_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.tryout_sessions(id) on delete cascade not null,
  question_id uuid references public.questions(id) not null,
  subject_id uuid references public.subjects(id) not null,
  selected_answer text check (selected_answer in ('A','B','C','D','E')),
  is_correct boolean,
  answered_at timestamptz not null default now(),
  unique(session_id, question_id)
);

-- 7. Subject timers
create table public.tryout_subject_timers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.tryout_sessions(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  unique(session_id, subject_id)
);

-- Indexes
create index idx_questions_subject on public.questions(subject_id);
create index idx_event_questions_event on public.tryout_event_questions(event_id);
create index idx_event_questions_subject on public.tryout_event_questions(event_id, subject_id);
create index idx_sessions_user on public.tryout_sessions(user_id);
create index idx_sessions_event on public.tryout_sessions(event_id);
create index idx_answers_session on public.tryout_answers(session_id);
create index idx_timers_session on public.tryout_subject_timers(session_id);

-- RLS
alter table public.subjects enable row level security;
alter table public.questions enable row level security;
alter table public.tryout_events enable row level security;
alter table public.tryout_event_questions enable row level security;
alter table public.tryout_sessions enable row level security;
alter table public.tryout_answers enable row level security;
alter table public.tryout_subject_timers enable row level security;

-- Subjects: public read
create policy "Public read subjects"
  on public.subjects for select using (true);

-- Questions: admin only (full manage). Authenticated users read questions only via event_questions join in app code; correct_answer/explanation gated client-side until submitted.
create policy "Admin manage questions"
  on public.questions for all
  using (public.has_user_role(auth.uid(), array['admin','super_admin']))
  with check (public.has_user_role(auth.uid(), array['admin','super_admin']));

create policy "Authenticated read questions"
  on public.questions for select
  using (auth.uid() is not null);

-- Tryout events
create policy "Public read published events"
  on public.tryout_events for select
  using (status = 'published' or public.has_user_role(auth.uid(), array['admin','super_admin']));

create policy "Admin manage events"
  on public.tryout_events for all
  using (public.has_user_role(auth.uid(), array['admin','super_admin']))
  with check (public.has_user_role(auth.uid(), array['admin','super_admin']));

-- Event questions
create policy "Authenticated read event questions"
  on public.tryout_event_questions for select
  using (auth.uid() is not null);

create policy "Admin manage event questions"
  on public.tryout_event_questions for all
  using (public.has_user_role(auth.uid(), array['admin','super_admin']))
  with check (public.has_user_role(auth.uid(), array['admin','super_admin']));

-- Sessions: users own
create policy "Users manage own sessions"
  on public.tryout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read all submitted sessions for ranking"
  on public.tryout_sessions for select
  using (status = 'submitted' and auth.uid() is not null);

-- Answers: users own
create policy "Users manage own answers"
  on public.tryout_answers for all
  using (
    session_id in (select id from public.tryout_sessions where user_id = auth.uid())
  )
  with check (
    session_id in (select id from public.tryout_sessions where user_id = auth.uid())
  );

-- Timers: users own
create policy "Users manage own timers"
  on public.tryout_subject_timers for all
  using (
    session_id in (select id from public.tryout_sessions where user_id = auth.uid())
  )
  with check (
    session_id in (select id from public.tryout_sessions where user_id = auth.uid())
  );