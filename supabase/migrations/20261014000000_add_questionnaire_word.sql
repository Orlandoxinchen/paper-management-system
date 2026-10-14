alter table public.papers
  add column if not exists file_questionnaire_word jsonb;

comment on column public.papers.file_questionnaire_word is
  'Questionnaire Word attachment stored with the same metadata shape as file_word.';
