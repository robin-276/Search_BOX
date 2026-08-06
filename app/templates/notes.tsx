"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Check,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Category = {
  id: string;
  name: string;
};

type Tag = {
  id: string;
  name: string;
};

type NoteLink = {
  name: string;
  url: string;
};

type Note = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  content: string;
  category_id: string | null;
  favorite: boolean;
  created_at: string;
  links: unknown;
};

type NoteWithDetails = Omit<Note, "links"> & {
  categoryName: string;
  tags: Tag[];
  links: NoteLink[];
};

type NoteForm = {
  title: string;
  description: string;
  content: string;
  category_id: string;
  links: NoteLink[];
};

const emptyForm: NoteForm = {
  title: "",
  description: "",
  content: "",
  category_id: "",
  links: [{ name: "", url: "" }],
};

function normalizeLinks(value: unknown): NoteLink[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("name" in item) ||
      !("url" in item) ||
      typeof item.name !== "string" ||
      typeof item.url !== "string"
    ) {
      return [];
    }

    const name = item.name.trim();
    const url = item.url.trim();

    try {
      const parsedUrl = new URL(url);
      return name && ["http:", "https:"].includes(parsedUrl.protocol)
        ? [{ name, url: parsedUrl.toString() }]
        : [];
    } catch {
      return [];
    }
  });
}

function prepareLinks(links: NoteLink[]) {
  return links.flatMap((link, index) => {
    const name = link.name.trim();
    const url = link.url.trim();

    if (!name && !url) return [];
    if (!name || !url) {
      throw new Error(`Link ${index + 1} needs both a name and a URL.`);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(`Link ${index + 1} has an invalid URL.`);
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(`Link ${index + 1} must start with http:// or https://.`);
    }

    return [{ name, url: parsedUrl.toString() }];
  });
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function TagPicker({
  tags,
  selectedIds,
  setSelectedIds,
}: {
  tags: Tag[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
}) {
  const toggleTag = (tagId: string) => {
    setSelectedIds(
      selectedIds.includes(tagId)
        ? selectedIds.filter((id) => id !== tagId)
        : [...selectedIds, tagId],
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-3 text-sm font-bold text-black">Select Tags</p>
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && (
          <span className="text-sm text-gray-500">Create tags from the Tags page first.</span>
        )}
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                selected
                  ? "border-[#2570FA] bg-[#2570FA] text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-[#2570FA] hover:text-[#2570FA]"
              }`}
            >
              {selected ? "✓ " : "+ "}
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LinkFields({
  links,
  setLinks,
  compact = false,
}: {
  links: NoteLink[];
  setLinks: (links: NoteLink[]) => void;
  compact?: boolean;
}) {
  const updateLink = (index: number, field: keyof NoteLink, value: string) => {
    setLinks(
      links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-50 ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-black">
          <Link2 className="h-4 w-4 text-green-600" />
          URLs <span className="font-normal text-gray-500">(optional)</span>
        </p>
        <button
          type="button"
          onClick={() => setLinks([...links, { name: "", url: "" }])}
          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-green-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add URL
        </button>
      </div>

      <div className="space-y-3">
        {links.map((link, index) => (
          <div
            key={index}
            className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]"
          >
            <input
              value={link.name}
              onChange={(event) => updateLink(index, "name", event.target.value)}
              placeholder="Link name"
              aria-label={`Link ${index + 1} name`}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-green-600"
            />
            <input
              type="url"
              value={link.url}
              onChange={(event) => updateLink(index, "url", event.target.value)}
              placeholder="https://..."
              aria-label={`Link ${index + 1} URL`}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-green-600"
            />
            {links.length > 1 && (
              <button
                type="button"
                onClick={() => setLinks(links.filter((_, linkIndex) => linkIndex !== index))}
                aria-label={`Remove link ${index + 1}`}
                className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NotesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState<NoteWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState<NoteForm>(emptyForm);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NoteForm>(emptyForm);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingLinksId, setViewingLinksId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [notesResult, categoriesResult, tagsResult, noteTagsResult] = await Promise.all([
      supabase.from("notes").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("tags").select("id, name").order("name"),
      supabase.from("note_tags").select("note_id, tag_id"),
    ]);

    const firstError =
      notesResult.error ||
      categoriesResult.error ||
      tagsResult.error ||
      noteTagsResult.error;

    if (firstError) {
      setError(firstError.message);
      setIsLoading(false);
      return;
    }

    const fetchedCategories = (categoriesResult.data || []) as Category[];
    const fetchedTags = (tagsResult.data || []) as Tag[];
    const mappings = noteTagsResult.data || [];

    const mappedNotes = ((notesResult.data || []) as Note[]).map((note) => {
      const noteTagIds = mappings
        .filter((mapping) => mapping.note_id === note.id)
        .map((mapping) => mapping.tag_id);

      return {
        ...note,
        links: normalizeLinks(note.links),
        categoryName:
          fetchedCategories.find((category) => category.id === note.category_id)?.name ||
          "Uncategorized",
        tags: fetchedTags.filter((tag) => noteTagIds.includes(tag.id)),
      };
    });

    setCategories(fetchedCategories);
    setTags(fetchedTags);
    setNotes(mappedNotes);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(loadNotes);
  }, [loadNotes]);

  const syncNoteTags = async (noteId: string, tagIds: string[]) => {
    const { error: deleteError } = await supabase
      .from("note_tags")
      .delete()
      .eq("note_id", noteId);

    if (deleteError) throw deleteError;

    if (tagIds.length > 0) {
      const { error: insertError } = await supabase
        .from("note_tags")
        .insert(tagIds.map((tagId) => ({ note_id: noteId, tag_id: tagId })));

      if (insertError) throw insertError;
    }
  };

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const links = prepareLinks(form.links);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) throw new Error("You must be logged in to add a note.");

      const { data: savedNote, error: insertError } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          content: form.content.trim(),
          category_id: form.category_id || null,
          links,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      await syncNoteTags(savedNote.id, selectedTagIds);
      setForm(emptyForm);
      setSelectedTagIds([]);
      await loadNotes();
    } catch (caughtError) {
      console.error("[notes] Failed to create note", caughtError);
      setError(errorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (note: NoteWithDetails) => {
    setEditingId(note.id);
    setDeleteId(null);
    setViewingLinksId(null);
    setEditForm({
      title: note.title,
      description: note.description || "",
      content: note.content,
      category_id: note.category_id || "",
      links: note.links.length > 0 ? note.links : [{ name: "", url: "" }],
    });
    setEditTagIds(note.tags.map((tag) => tag.id));
  };

  const saveNote = async (id: string) => {
    if (!editForm.title.trim() || !editForm.content.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      const links = prepareLinks(editForm.links);
      const { error: updateError } = await supabase
        .from("notes")
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          content: editForm.content.trim(),
          category_id: editForm.category_id || null,
          links,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      await syncNoteTags(id, editTagIds);
      setEditingId(null);
      await loadNotes();
    } catch (caughtError) {
      console.error("[notes] Failed to update note", caughtError);
      setError(errorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFavorite = async (note: NoteWithDetails) => {
    const favorite = !note.favorite;
    setNotes((current) =>
      current.map((item) => (item.id === note.id ? { ...item, favorite } : item)),
    );

    const { error: updateError } = await supabase
      .from("notes")
      .update({ favorite })
      .eq("id", note.id);

    if (updateError) {
      setNotes((current) =>
        current.map((item) =>
          item.id === note.id ? { ...item, favorite: note.favorite } : item,
        ),
      );
      setError(updateError.message);
    }
  };

  const deleteNote = async (id: string) => {
    setError(null);

    const { error: deleteError } = await supabase.from("notes").delete().eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setDeleteId(null);
    setViewingLinksId((current) => (current === id ? null : current));
    setNotes((current) => current.filter((note) => note.id !== id));
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl space-y-8 bg-white p-2 md:p-6">
      <div>
        <h1 className="flex items-center gap-3 text-4xl font-extrabold tracking-tight text-black">
          <BookOpenText className="h-9 w-9 text-[#2570FA]" />
          Notes
        </h1>
        <p className="mt-2 font-medium text-gray-600">
          Save ideas, reminders, and important points with categories and tags.
        </p>
      </div>

      {error && (
        <div className="rounded-r-lg border-l-4 border-red-500 bg-red-50 p-4 font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-black">
          <Plus className="h-5 w-5 text-[#2570FA]" /> Add New Note
        </h2>

        <form onSubmit={addNote} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <input
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Note title (required)"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
              />
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Short description"
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
              />
              <select
                value={form.category_id}
                onChange={(event) => setForm({ ...form, category_id: event.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
              >
                <option value="">Select a category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              required
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              placeholder={"Write your note or points here...\n\n• First point\n• Second point"}
              rows={9}
              className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
            />
          </div>

          <LinkFields
            links={form.links}
            setLinks={(links) => setForm({ ...form, links })}
          />

          <TagPicker
            tags={tags}
            selectedIds={selectedTagIds}
            setSelectedIds={setSelectedTagIds}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-green-600 px-8 py-3 font-bold text-white shadow-md transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-black">Your Notes</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-[#2570FA]">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <BookOpenText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
            <p className="font-semibold text-gray-600">No notes yet. Add your first note above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {notes.map((note) => (
              <article
                key={note.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  note.favorite ? "border-amber-300" : "border-gray-200"
                }`}
              >
                {editingId === note.id ? (
                  <div className="space-y-4">
                    <input
                      required
                      value={editForm.title}
                      onChange={(event) =>
                        setEditForm({ ...editForm, title: event.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 font-bold text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
                    />
                    <textarea
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm({ ...editForm, description: event.target.value })
                      }
                      placeholder="Short description"
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
                    />
                    <textarea
                      required
                      value={editForm.content}
                      onChange={(event) =>
                        setEditForm({ ...editForm, content: event.target.value })
                      }
                      rows={7}
                      className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
                    />
                    <select
                      value={editForm.category_id}
                      onChange={(event) =>
                        setEditForm({ ...editForm, category_id: event.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <LinkFields
                      compact
                      links={editForm.links}
                      setLinks={(links) => setEditForm({ ...editForm, links })}
                    />
                    <TagPicker
                      tags={tags}
                      selectedIds={editTagIds}
                      setSelectedIds={setEditTagIds}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void saveNote(note.id)}
                        disabled={isSaving}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 rounded-lg bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-300"
                      >
                        <X className="h-4 w-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-black">{note.title}</h3>
                        {note.description && (
                          <p className="mt-1 text-sm text-gray-500">{note.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleFavorite(note)}
                        aria-label={note.favorite ? "Remove from favorites" : "Add to favorites"}
                        className={`rounded-lg p-2 ${
                          note.favorite
                            ? "bg-amber-50 text-amber-500"
                            : "text-gray-400 hover:bg-gray-100 hover:text-amber-500"
                        }`}
                      >
                        <Star className={`h-5 w-5 ${note.favorite ? "fill-current" : ""}`} />
                      </button>
                    </div>

                    <div className="my-4 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-800">
                      {note.content}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        {note.categoryName}
                      </span>
                      {note.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-semibold text-[#2570FA]"
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>

                    {viewingLinksId === note.id && note.links.length > 0 && (
                      <div className="mt-4 space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                        {note.links.map((link, index) => (
                          <div
                            key={`${link.url}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
                          >
                            <span className="min-w-0 truncate text-sm font-semibold text-gray-800">
                              {link.name}
                            </span>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex shrink-0 items-center gap-1 rounded-lg bg-[#2570FA] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                            >
                              Open <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                      <time className="text-xs text-gray-400">
                        {new Date(note.created_at).toLocaleDateString()}
                      </time>
                      {deleteId === note.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-600">Delete?</span>
                          <button
                            type="button"
                            onClick={() => void deleteNote(note.id)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(null)}
                            className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {note.links.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setViewingLinksId((current) =>
                                  current === note.id ? null : note.id,
                                )
                              }
                              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                              {viewingLinksId === note.id ? "Hide" : "View"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditing(note)}
                            className="flex items-center gap-1 rounded-lg bg-[#2570FA] px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(note.id)}
                            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
