"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

// Import your other pages from the same folder
import CategoryPage from "./Category";
import TagsPage from "./tags";
import ResourcesPage from "./resources";
import NotesPage from "./notes";
import ProfilePage from "./profile"; 

import { 
  Search, ExternalLink, Star, LayoutDashboard, 
  Tags as TagsIcon, Folder, Database, Globe,
  Menu, X, User, NotebookPen, Copy, Check
} from "lucide-react";

// --- Types ---
type Category = { id: string; name: string };
type Tag = { id: string; name: string };
type Resource = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  logo: string | null;
  category_id: string | null;
  created_at: string;
  favorite: boolean;
};
type MappedResource = Resource & {
  category_name: string;
  tags: Tag[];
};

type NoteLink = {
  name: string;
  url: string;
};

type Note = {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category_id: string | null;
  created_at: string;
  favorite: boolean;
  links: unknown;
};

type MappedNote = Omit<Note, "links"> & {
  category_name: string;
  tags: Tag[];
  links: NoteLink[];
};

function normalizeNoteLinks(value: unknown): NoteLink[] {
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

function DashboardNoteCard({
  note,
  onToggleFavorite,
  onViewLinks,
}: {
  note: MappedNote;
  onToggleFavorite: (note: MappedNote) => void;
  onViewLinks: (note: MappedNote) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-[#2570FA] hover:shadow-md sm:p-5">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 sm:h-14 sm:w-14">
        <NotebookPen className="h-6 w-6 text-[#2570FA]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#2570FA]">
            Note
          </span>
          <span className="truncate text-xs font-medium text-gray-400">
            {note.category_name}
          </span>
        </div>
        <h3 className="truncate text-lg font-bold text-black">{note.title}</h3>
        <p className="mt-0.5 truncate text-sm text-gray-600">
          {note.description || note.content || "No description"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full border border-[#2570FA]/20 bg-[#2570FA]/10 px-2 py-0.5 text-[10px] font-medium text-[#2570FA]"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 pl-2 sm:flex-row">
        <button
          type="button"
          onClick={() => onToggleFavorite(note)}
          className={`rounded-lg p-2 transition-colors ${
            note.favorite
              ? "bg-amber-100 text-amber-500 hover:bg-amber-200"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          }`}
          title={note.favorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Star className={`h-5 w-5 ${note.favorite ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => onViewLinks(note)}
          className="rounded-lg bg-[#2570FA] px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          View
        </button>
      </div>
    </div>
  );
}

export default function HomeDashboard() {
  const supabase = useMemo(() => createClient(), []);

  // --- State: Navigation (SPA) & Sidebar ---
  const [currentView, setCurrentView] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Controls 3-bar menu

  // --- State: Data & User ---
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [resources, setResources] = useState<MappedResource[]>([]);
  const [notes, setNotes] = useState<MappedNote[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingNote, setViewingNote] = useState<MappedNote | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // --- State: Search & Filters ---
  const [mainSearch, setMainSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  const searchRef = useRef<HTMLDivElement>(null);

  // --- Screen Size Listener for Sidebar ---
  useEffect(() => {
    // Automatically open sidebar on desktop, close on mobile
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    handleResize(); // Check immediately on load
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const email = user.email ?? "User";
      setUserEmail(email);

      if (user.email) {
        const provider = user.app_metadata.provider === "google" ? "google" : "email";
        try {
          window.localStorage.setItem(
            "searchbox.previousLogin",
            JSON.stringify({ email: user.email, provider }),
          );
        } catch {
          // Browser storage is optional and must never block dashboard loading.
        }
      }
    }
  }, [supabase]);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);

    const [resData, notesData, catData, tagData, resTagsData, noteTagsData] = await Promise.all([
      supabase.from("resources").select("*").order("created_at", { ascending: false }),
      supabase.from("notes").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*"),
      supabase.from("tags").select("*"),
      supabase.from("resource_tags").select("*"),
      supabase.from("note_tags").select("*"),
    ]);

    const fetchedCategories = catData.data || [];
    const fetchedTags = tagData.data || [];
    const fetchedResTags = resTagsData.data || [];
    const fetchedNoteTags = noteTagsData.data || [];
    
    setCategories(fetchedCategories);
    setAllTags(fetchedTags);

    if (resData.data) {
      const mapped: MappedResource[] = resData.data.map((res: Resource) => {
        const cat = fetchedCategories.find(c => c.id === res.category_id);
        const tagIdsForRes = fetchedResTags
          .filter(rt => rt.resource_id === res.id)
          .map(rt => rt.tag_id);
        const tagsForRes = fetchedTags.filter(t => tagIdsForRes.includes(t.id));

        return {
          ...res,
          category_name: cat ? cat.name : "Uncategorized",
          tags: tagsForRes,
          favorite: res.favorite || false 
        };
      });
      setResources(mapped);
    }

    if (notesData.data) {
      const mappedNotes: MappedNote[] = notesData.data.map((note: Note) => {
        const category = fetchedCategories.find(c => c.id === note.category_id);
        const tagIdsForNote = fetchedNoteTags
          .filter(mapping => mapping.note_id === note.id)
          .map(mapping => mapping.tag_id);

        return {
          ...note,
          links: normalizeNoteLinks(note.links),
          category_name: category ? category.name : "Uncategorized",
          tags: fetchedTags.filter(tag => tagIdsForNote.includes(tag.id)),
          favorite: note.favorite || false,
        };
      });
      setNotes(mappedNotes);
    }
    setIsLoading(false);
  }, [supabase]);

  // --- Initial Data Fetch ---
  useEffect(() => {
    void Promise.resolve().then(() => Promise.all([fetchAllData(), fetchUser()]));

    // Close suggestions when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fetchAllData, fetchUser]);

  // --- Handlers ---
  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI Update (feels instant to the user)
    setResources(prev => prev.map(r => r.id === id ? { ...r, favorite: newStatus } : r));
    
    // Database Update
    const { error } = await supabase.from("resources").update({ favorite: newStatus }).eq("id", id);
    
    if (error) {
      alert(`Failed to save favorite: Make sure the "favorite" column exists in Supabase. Error: ${error.message}`);
      // Revert UI if database failed
      setResources(prev => prev.map(r => r.id === id ? { ...r, favorite: currentStatus } : r));
    }
  };

  const toggleNoteFavorite = async (note: MappedNote) => {
    const newStatus = !note.favorite;
    setNotes(current =>
      current.map(item => item.id === note.id ? { ...item, favorite: newStatus } : item)
    );

    const { error } = await supabase
      .from("notes")
      .update({ favorite: newStatus })
      .eq("id", note.id);

    if (error) {
      setNotes(current =>
        current.map(item => item.id === note.id ? { ...item, favorite: note.favorite } : item)
      );
      alert(`Failed to save note favorite: ${error.message}`);
    }
  };

  const copyNoteContent = async (note: MappedNote) => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopiedNoteId(note.id);
      window.setTimeout(() => setCopiedNoteId(null), 2000);
    } catch {
      alert("Unable to copy the note. Please try again.");
    }
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) newSet.delete(tagId);
      else newSet.add(tagId);
      return newSet;
    });
  };

  // --- Filtering & Compute Logic ---
  const suggestions = useMemo(() => {
    if (mainSearch.length < 2) return [];
    const lowerQuery = mainSearch.toLowerCase();
    
    const possibleMatches = new Set<string>();
    resources.forEach(r => {
      if (r.title.toLowerCase().includes(lowerQuery)) possibleMatches.add(r.title);
      r.tags.forEach(t => {
        if (t.name.toLowerCase().includes(lowerQuery)) possibleMatches.add(`#${t.name}`);
      });
    });
    notes.forEach(note => {
      if (note.title.toLowerCase().includes(lowerQuery)) possibleMatches.add(note.title);
      note.tags.forEach(tag => {
        if (tag.name.toLowerCase().includes(lowerQuery)) possibleMatches.add(`#${tag.name}`);
      });
    });
    return Array.from(possibleMatches).slice(0, 5);
  }, [mainSearch, resources, notes]);

  const visibleTags = useMemo(() => {
    if (!tagSearch.trim()) return allTags;
    return allTags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [tagSearch, allTags]);

  const filteredResources = useMemo(() => {
    const normalizedSearch = mainSearch.trim().toLowerCase();
    const normalizedTagSearch = normalizedSearch.replace("#", "");

    return resources.filter(res => {
      const searchMatch = !normalizedSearch ||
        res.title.toLowerCase().includes(normalizedSearch) ||
        (res.description && res.description.toLowerCase().includes(normalizedSearch)) ||
        res.tags.some(t => t.name.toLowerCase().includes(normalizedTagSearch));

      const categoryMatch = selectedCategory === "all" || res.category_id === selectedCategory;

      const selectedTagsArray = Array.from(selectedTagIds);
      const tagsMatch = selectedTagsArray.length === 0 || 
        selectedTagsArray.every(tagId => res.tags.some(t => t.id === tagId));

      return searchMatch && categoryMatch && tagsMatch;
    });
  }, [resources, mainSearch, selectedCategory, selectedTagIds]);

  const filteredNotes = useMemo(() => {
    const normalizedSearch = mainSearch.trim().toLowerCase().replace("#", "");
    const selectedTagsArray = Array.from(selectedTagIds);

    return notes.filter(note => {
      const searchMatch =
        !normalizedSearch ||
        note.title.toLowerCase().includes(normalizedSearch) ||
        (note.description?.toLowerCase().includes(normalizedSearch) ?? false) ||
        note.content.toLowerCase().includes(normalizedSearch) ||
        note.tags.some(tag => tag.name.toLowerCase().includes(normalizedSearch));

      const categoryMatch =
        selectedCategory === "all" || note.category_id === selectedCategory;
      const tagsMatch =
        selectedTagsArray.length === 0 ||
        selectedTagsArray.every(tagId => note.tags.some(tag => tag.id === tagId));

      return searchMatch && categoryMatch && tagsMatch;
    });
  }, [notes, mainSearch, selectedCategory, selectedTagIds]);

  const favoriteResources = filteredResources.filter(r => r.favorite);
  const recentResources = filteredResources.filter(r => !r.favorite);
  const favoriteNotes = filteredNotes.filter(note => note.favorite);
  const recentNotes = filteredNotes.filter(note => !note.favorite);
  const hasTextSearch = mainSearch.trim().length > 0;
  const hasStructuredFilters = selectedCategory !== "all" || selectedTagIds.size > 0;
  const hasAnyFilteredResults = filteredResources.length > 0 || filteredNotes.length > 0;

  // --- UI Components ---
  const ResourceCard = ({ res }: { res: MappedResource }) => (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out hover:border-[#2570FA] pointer-fine:hover:-translate-y-1 pointer-fine:hover:shadow-lg pointer-coarse:active:scale-[0.98] sm:p-5">
      
      {/* Logo Area */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200">
        {res.logo ? (
          <img src={res.logo} alt={res.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <Globe className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-black truncate">{res.title}</h3>
        <p className="text-sm text-gray-600 truncate mt-0.5">{res.description || res.url || "No description"}</p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {res.tags.map(t => (
             <span key={t.id} className="text-[10px] px-2 py-0.5 bg-[#2570FA]/10 text-[#2570FA] font-medium rounded-full border border-[#2570FA]/20">
               #{t.name}
             </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-2 pl-2">
        <button 
          onClick={() => toggleFavorite(res.id, res.favorite)}
          className={`p-2 rounded-lg transition-colors ${res.favorite ? 'bg-amber-100 text-amber-500 hover:bg-amber-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700'}`}
          title={res.favorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Star className={`w-5 h-5 ${res.favorite ? 'fill-current' : ''}`} />
        </button>
        
        {res.url ? (
          <a 
            href={res.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#2570FA] hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all"
          >
            Go <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <button disabled className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed">
            No URL
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FFFFFF] text-black overflow-hidden font-sans">
      {viewingNote && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewingNote(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-view-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#2570FA]">
                  Note
                </p>
                <h2 id="note-view-title" className="break-words text-xl font-bold text-black">
                  {viewingNote.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingNote(null)}
                aria-label="Close note popup"
                className="shrink-0 rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {viewingNote.description && (
              <p className="mb-5 break-words text-sm leading-6 text-gray-600">
                {viewingNote.description}
              </p>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-bold text-black">Note</h3>
                <button
                  type="button"
                  onClick={() => void copyNoteContent(viewingNote)}
                  className="flex shrink-0 items-center gap-2 rounded-lg bg-[#2570FA] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {copiedNoteId === viewingNote.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedNoteId === viewingNote.id ? "Copied" : "Copy Note"}
                </button>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-800">
                {viewingNote.content}
              </p>
            </div>

            {viewingNote.links.length > 0 && (
              <div className="mt-5 border-t border-gray-200 pt-5">
                <h3 className="mb-3 font-bold text-black">Links</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {viewingNote.links.map((link, index) => (
                    <a
                      key={`${link.url}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-green-600 px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-green-700"
                    >
                      <span className="truncate">{link.name}</span>
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. LEFT SIDEBAR (Primary: #2570FA, Text: White) */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 
        w-64 bg-[#2570FA] text-white flex flex-col 
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0 ml-0" : "-translate-x-full lg:-ml-64"}
      `}>
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            Search<span className="text-black">BOX</span>
          </h2>
          
          <button className="lg:hidden text-white hover:text-blue-200" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => window.location.reload()}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              currentView === "dashboard" ? "bg-white text-[#2570FA] shadow-md" : "text-white hover:bg-white/10"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          
          <button 
            onClick={() => { setCurrentView("resources"); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              currentView === "resources" ? "bg-white text-[#2570FA] shadow-md" : "text-white hover:bg-white/10"
            }`}
          >
            <Database className="w-5 h-5" /> Resources
          </button>

          <button
            onClick={() => { setCurrentView("notes"); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              currentView === "notes" ? "bg-white text-[#2570FA] shadow-md" : "text-white hover:bg-white/10"
            }`}
          >
            <NotebookPen className="w-5 h-5" /> Notes
          </button>
          
          <button 
            onClick={() => { setCurrentView("categories"); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              currentView === "categories" ? "bg-white text-[#2570FA] shadow-md" : "text-white hover:bg-white/10"
            }`}
          >
            <Folder className="w-5 h-5" /> Categories
          </button>
          
          <button 
            onClick={() => { setCurrentView("tags"); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              currentView === "tags" ? "bg-white text-[#2570FA] shadow-md" : "text-white hover:bg-white/10"
            }`}
          >
            <TagsIcon className="w-5 h-5" /> Tags
          </button>
        </nav>

        {/* Profile Button Bottom Left */}
        <div className="p-4 border-t border-white/20">
          <button 
            onClick={() => { setCurrentView("profile"); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              currentView === "profile" ? "bg-white text-[#2570FA] shadow-md" : "text-white hover:bg-white/10"
            }`}
          >
            <div className={`p-2 rounded-full ${currentView === "profile" ? "bg-blue-100" : "bg-white/20"}`}>
              <User className="w-5 h-5" />
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-bold">My Profile</p>
              <p className={`text-xs truncate ${currentView === "profile" ? "text-blue-600" : "text-blue-200"}`}>
                {userEmail || "Loading..."}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto bg-gray-50">
        
        {/* TOP BAR WITH 3-BAR BUTTON */}
        <div className="flex items-center bg-white border-b border-gray-200 text-black p-4 shadow-sm">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 mr-4 bg-gray-100 hover:bg-gray-200 text-black rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold capitalize">{currentView}</h1>
        </div>

        <div className="w-full space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">

          {/* Conditional Rendering of Views */}
          {currentView === "categories" && <CategoryPage />}
          {currentView === "tags" && <TagsPage />}
          {currentView === "resources" && <ResourcesPage />}
          {currentView === "notes" && <NotesPage />}
          {currentView === "profile" && <ProfilePage />} 

          {/* DASHBOARD VIEW CONTENT */}
          {currentView === "dashboard" && (
            <div className="space-y-8">
              {/* --- SEARCH & FILTER CONTROLS --- */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-sm">
                
                <div className="flex flex-col md:flex-row gap-4">
                  {/* SEARCH BAR 1: Main Advanced Search */}
                  <div className="relative flex-1" ref={searchRef}>
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search titles, descriptions, tags..."
                      value={mainSearch}
                      onChange={(e) => {
                        setMainSearch(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2570FA] focus:border-transparent text-black outline-none transition-all"
                    />
                    
                    {/* Auto-suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        {suggestions.map((suggestion, idx) => (
                          <li 
                            key={idx} 
                            onClick={() => {
                              setMainSearch(suggestion);
                              setShowSuggestions(false);
                            }}
                            className="px-4 py-3 hover:bg-[#2570FA] hover:text-white cursor-pointer text-gray-700 transition-colors font-medium border-b border-gray-100 last:border-0"
                          >
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* SEARCH BAR 2: Category Dropdown */}
                  <div className="w-full md:w-64">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2570FA] focus:border-transparent text-black outline-none appearance-none font-medium cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SEARCH BAR 3: Tag Filtering Area */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <input
                      type="text"
                      placeholder="Filter specific tags..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="w-full sm:w-64 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
                    />
                    
                    {/* Scrollable Tick-Box Area for Tags */}
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                      {visibleTags.length === 0 ? (
                        <span className="text-gray-500 text-sm py-2">No tags found.</span>
                      ) : (
                        visibleTags.map(tag => {
                          const isSelected = selectedTagIds.has(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTagSelection(tag.id)}
                              className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-all border shadow-sm ${
                                isSelected 
                                  ? 'bg-[#2570FA] text-white border-[#2570FA]' 
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-[#2570FA]'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{tag.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* --- RESULTS DISPLAY --- */}
              {isLoading ? (
                <div className="text-center text-gray-500 py-12 font-medium">Loading your library...</div>
              ) : hasTextSearch ? (
                <div className="space-y-10 pb-12">
                  {!hasAnyFilteredResults && (
                    <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-sm">
                      <p className="font-medium text-gray-500">
                        No results found for “{mainSearch.trim()}”.
                      </p>
                    </div>
                  )}

                  {filteredResources.length > 0 && (
                    <section>
                      <h2 className="mb-4 border-b border-gray-200 pb-2 text-xl font-bold text-black">
                        Resource Results ({filteredResources.length})
                      </h2>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                        {filteredResources.map(resource => (
                          <ResourceCard key={resource.id} res={resource} />
                        ))}
                      </div>
                    </section>
                  )}

                  {filteredNotes.length > 0 && (
                    <section>
                      <h2 className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 text-xl font-bold text-black">
                        <NotebookPen className="h-5 w-5 text-[#2570FA]" />
                        Note Results ({filteredNotes.length})
                      </h2>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                        {filteredNotes.map(note => (
                          <DashboardNoteCard
                            key={note.id}
                            note={note}
                            onToggleFavorite={toggleNoteFavorite}
                            onViewLinks={setViewingNote}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="space-y-10 pb-12">
                  {hasStructuredFilters && !hasAnyFilteredResults && (
                    <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-sm">
                      <p className="font-medium text-gray-500">
                        No resources or notes match the selected filters.
                      </p>
                    </div>
                  )}

                  {(favoriteResources.length > 0 || favoriteNotes.length > 0) && (
                    <section>
                      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-amber-500">
                        <Star className="h-6 w-6 fill-current" /> Favorites
                      </h2>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                        {favoriteResources.map(resource => (
                          <ResourceCard key={`resource-${resource.id}`} res={resource} />
                        ))}
                        {favoriteNotes.map(note => (
                          <DashboardNoteCard
                            key={`note-${note.id}`}
                            note={note}
                            onToggleFavorite={toggleNoteFavorite}
                            onViewLinks={setViewingNote}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {(recentResources.length > 0 || !hasStructuredFilters) && (
                    <section>
                      <h2 className="mb-4 border-b border-gray-200 pb-2 text-xl font-bold text-black">
                        {hasStructuredFilters
                          ? `Resource Results (${recentResources.length})`
                          : "Recent Resources"}
                      </h2>
                      {recentResources.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-sm">
                          <p className="font-medium text-gray-500">No resources available.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                          {recentResources.map(resource => (
                            <ResourceCard key={resource.id} res={resource} />
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {(recentNotes.length > 0 || !hasStructuredFilters) && (
                    <section>
                      <h2 className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 text-xl font-bold text-black">
                        <NotebookPen className="h-5 w-5 text-[#2570FA]" />
                        {hasStructuredFilters
                          ? `Note Results (${recentNotes.length})`
                          : "Recent Notes"}
                      </h2>
                      {recentNotes.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-sm">
                          <p className="font-medium text-gray-500">No notes available.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                          {recentNotes.map(note => (
                            <DashboardNoteCard
                              key={note.id}
                              note={note}
                              onToggleFavorite={toggleNoteFavorite}
                              onViewLinks={setViewingNote}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
