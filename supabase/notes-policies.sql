-- Run this once in Supabase > SQL Editor.
-- It gives signed-in users access only to their own notes and note/tag links.

alter table public.notes enable row level security;
alter table public.note_tags enable row level security;

grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.note_tags to authenticated;

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_own"
on public.notes
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "notes_insert_own"
on public.notes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "notes_update_own"
on public.notes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "notes_delete_own"
on public.notes
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "note_tags_select_own" on public.note_tags;
drop policy if exists "note_tags_insert_own" on public.note_tags;
drop policy if exists "note_tags_delete_own" on public.note_tags;

create policy "note_tags_select_own"
on public.note_tags
for select
to authenticated
using (
  exists (
    select 1
    from public.notes
    where notes.id = note_tags.note_id
      and notes.user_id = (select auth.uid())
  )
);

create policy "note_tags_insert_own"
on public.note_tags
for insert
to authenticated
with check (
  exists (
    select 1
    from public.notes
    where notes.id = note_tags.note_id
      and notes.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.tags
    where tags.id = note_tags.tag_id
      and tags.user_id = (select auth.uid())
  )
);

create policy "note_tags_delete_own"
on public.note_tags
for delete
to authenticated
using (
  exists (
    select 1
    from public.notes
    where notes.id = note_tags.note_id
      and notes.user_id = (select auth.uid())
  )
);
