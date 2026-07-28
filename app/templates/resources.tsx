"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

type Resource = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  url: string | null;
  source_url: string | null;
  logo: string | null;
  category_id: string | null;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
};

type Tag = {
  id: string;
  name: string;
};

type MappedResource = Resource & {
  category_name: string;
  tags: Tag[];
};

export default function Resources() {
  const supabase = createClient();
  const router = useRouter();
  
  // Data States
  const [resources, setResources] = useState<MappedResource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    url: "",
    category_id: "",
  });

  // Tag Multi-Select State
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    url: "",
    category_id: "",
  });
  const [editSelectedTagIds, setEditSelectedTagIds] = useState<string[]>([]);
  const [editTagSearch, setEditTagSearch] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    // Fetch resources, categories, and tags simultaneously
    const [resData, catData, tagData, resTagsData] = await Promise.all([
      supabase.from("resources").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name"),
      supabase.from("tags").select("id, name"),
      supabase.from("resource_tags").select("*")
    ]);

    const fetchedCategories = catData.data || [];
    const fetchedTags = tagData.data || [];
    const fetchedResTags = resTagsData.data || [];

    if (resData.error) setError(resData.error.message);
    else {
      // Map relationships for display and editing
      const mapped: MappedResource[] = (resData.data || []).map((res: Resource) => {
        const cat = fetchedCategories.find(c => c.id === res.category_id);
        const tagIdsForRes = fetchedResTags.filter(rt => rt.resource_id === res.id).map(rt => rt.tag_id);
        const tagsForRes = fetchedTags.filter(t => tagIdsForRes.includes(t.id));

        return {
          ...res,
          category_name: cat ? cat.name : "Uncategorized",
          tags: tagsForRes
        };
      });
      setResources(mapped);
    }

    if (!catData.error) setCategories(fetchedCategories);
    if (!tagData.error) setAllTags(fetchedTags);
    
    setIsLoading(false);
  };

  // --- BACKGROUND HELPERS ---

  // Generate Logo/Thumbnail from URL
  const generateLogoUrl = (url: string) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      
      // Handle YouTube Thumbnails
      if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
        let videoId = "";
        if (urlObj.hostname.includes("youtu.be")) {
          videoId = urlObj.pathname.slice(1);
        } else {
          videoId = urlObj.searchParams.get("v") || "";
        }
        if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
      
      // Handle Generic Website Logos via Google Favicon API
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
    } catch (e) {
      return null; // Invalid URL, return null
    }
  };

  // Sync Connections in resource_tags - FIXED TO CATCH AND THROW ERRORS
  const syncResourceTags = async (resourceId: string, tagIds: string[]) => {
    // 1. Delete old tags
    const { error: deleteError } = await supabase.from("resource_tags").delete().eq("resource_id", resourceId);
    if (deleteError) throw new Error("Failed to delete old tags: " + deleteError.message);

    // 2. Insert new tags
    if (tagIds.length > 0) {
      const mappings = tagIds.map(tagId => ({ resource_id: resourceId, tag_id: tagId }));
      const { error: insertError } = await supabase.from("resource_tags").insert(mappings);
      if (insertError) throw new Error("Failed to save new tags: " + insertError.message);
    }
  };

  // --- CORE CRUD OPERATIONS ---

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResource.title.trim()) return;
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("You must be logged in.");
      return;
    }

    try {
      // Auto-generate Logo URL before saving
      const autoLogo = generateLogoUrl(newResource.url);

      const { data: savedResource, error: insertError } = await supabase
        .from("resources")
        .insert([{ 
          user_id: authData.user.id,
          title: newResource.title,
          description: newResource.description || null,
          url: newResource.url || null,
          logo: autoLogo,
          category_id: newResource.category_id || null,
        }])
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Sync Tags (If this fails now, it will throw an error to the UI)
      await syncResourceTags(savedResource.id, selectedTagIds);

      // Reset form
      setNewResource({ title: "", description: "", url: "", category_id: "" });
      setSelectedTagIds([]);
      setTagSearch("");
      fetchInitialData();
      router.refresh();

    } catch (err: any) {
      setError(err.message || "An error occurred while saving.");
    }
  };

  const startEditing = (resource: MappedResource) => {
    setEditingId(resource.id);
    setEditForm({
      title: resource.title,
      description: resource.description || "",
      url: resource.url || "",
      category_id: resource.category_id || "",
    });
    // Pre-populate the edit tags state with the resource's current tags
    setEditSelectedTagIds(resource.tags.map(t => t.id as string)); 
    setEditTagSearch("");
    setDeleteConfirmId(null); 
  };

  const saveEdit = async (id: string) => {
    setError(null);
    try {
      const autoLogo = generateLogoUrl(editForm.url);

      const { error: updateError } = await supabase
        .from("resources")
        .update({
          title: editForm.title,
          description: editForm.description,
          url: editForm.url,
          logo: autoLogo,
          category_id: editForm.category_id || null,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Sync tags on edit
      await syncResourceTags(id, editSelectedTagIds);

      setEditingId(null);
      fetchInitialData();
      router.refresh();
    } catch (err: any) {
       setError(err.message);
    }
  };

  const confirmDelete = async (id: string) => {
    setError(null);
    try {
      await supabase.from("resource_tags").delete().eq("resource_id", id);
      const { error: deleteError } = await supabase.from("resources").delete().eq("id", id);

      if (deleteError) throw deleteError;
      
      setDeleteConfirmId(null);
      fetchInitialData();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- UI HELPERS ---
  const toggleTag = (tagId: string, isEdit: boolean = false) => {
    const currentList = isEdit ? editSelectedTagIds : selectedTagIds;
    const setList = isEdit ? setEditSelectedTagIds : setSelectedTagIds;
    
    if (currentList.includes(tagId)) {
      setList(currentList.filter(id => id !== tagId));
    } else {
      setList([...currentList, tagId]);
    }
  };

  const filteredTags = allTags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
  const editFilteredTags = allTags.filter(t => t.name.toLowerCase().includes(editTagSearch.toLowerCase()));

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8 bg-[#FFFFFF] min-h-screen font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold text-black tracking-tight">Resources</h1>
        <p className="text-gray-600 mt-2 font-medium">Manage your links, tools, and automatically fetch logos & tags.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 font-medium shadow-sm">
          {error}
        </div>
      )}

      {/* Add New Resource Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-black mb-6">Add New Resource</h2>
        <form onSubmit={handleAddResource} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <input
                type="text" placeholder="Title (Required)" required
                value={newResource.title} onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2570FA] focus:border-transparent text-black outline-none transition-all placeholder:text-gray-400 shadow-sm"
              />
              <input
                type="url" placeholder="URL (Used to fetch logo/thumbnail)"
                value={newResource.url} onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2570FA] focus:border-transparent text-black outline-none transition-all placeholder:text-gray-400 shadow-sm"
              />
              <textarea
                placeholder="Description" rows={3}
                value={newResource.description} onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2570FA] focus:border-transparent text-black outline-none transition-all placeholder:text-gray-400 resize-none shadow-sm"
              />
            </div>

            <div className="space-y-4">
              {/* Category Dropdown */}
              <select
                value={newResource.category_id}
                onChange={(e) => setNewResource({...newResource, category_id: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2570FA] focus:border-transparent text-black outline-none transition-all cursor-pointer shadow-sm"
              >
                <option value="">Select a Category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Tag Multi-Select Custom Component */}
              <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-sm font-bold text-black mb-2">Select Tags</p>
                
                {/* Selected Tags Display */}
                <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                  {selectedTagIds.length === 0 && <span className="text-sm text-gray-500 italic">No tags selected</span>}
                  {selectedTagIds.map(id => {
                    const tag = allTags.find(t => t.id === id);
                    return tag ? (
                      <span key={id} onClick={() => toggleTag(id as string, false)} className="cursor-pointer flex items-center gap-1 bg-[#2570FA] text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm hover:bg-red-500 transition-colors group">
                        {tag.name} <span className="text-blue-100 group-hover:text-white">×</span>
                      </span>
                    ) : null;
                  })}
                </div>

                {/* Tag Search & Available Tags */}
                <input
                  type="text" placeholder="Search to add tags..."
                  value={tagSearch} onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2570FA] outline-none text-sm text-black placeholder:text-gray-400 mb-3 shadow-sm"
                />
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {filteredTags.filter(t => !selectedTagIds.includes(t.id as string)).map(tag => (
                    <button
                      type="button" key={tag.id} onClick={() => toggleTag(tag.id as string, false)}
                      className="px-3 py-1 bg-white border border-gray-300 text-black rounded-full text-xs font-medium hover:border-[#2570FA] hover:text-[#2570FA] transition-colors shadow-sm"
                    >
                      + {tag.name}
                    </button>
                  ))}
                  {filteredTags.length === 0 && <span className="text-xs text-gray-500">No matching tags found.</span>}
                </div>
              </div>
            </div>

          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all">
              Save Resource
            </button>
          </div>
        </form>
      </div>

      {/* Resources Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-black text-sm font-bold uppercase tracking-wider">
                <th className="p-5 w-20 text-center">Logo</th>
                <th className="p-5 w-64">Title & Link</th>
                <th className="p-5">Details</th>
                <th className="p-5 w-48 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-black">
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500 font-medium">Loading resources...</td></tr>
              ) : resources.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500 font-medium">No resources found. Add one above!</td></tr>
              ) : (
                resources.map((resource) => (
                  <tr key={resource.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    
                    {/* LOGO COLUMN */}
                    <td className="p-5 text-center">
                      {resource.logo ? (
                        <img src={resource.logo} alt="logo" className="w-10 h-10 object-cover rounded-lg shadow-sm border border-gray-200 mx-auto" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg mx-auto flex items-center justify-center text-gray-400 text-xs border border-gray-200">?</div>
                      )}
                    </td>

                    {/* TITLE & LINK COLUMN */}
                    <td className="p-5">
                      {editingId === resource.id ? (
                        <input
                          type="text" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#2570FA] outline-none"
                        />
                      ) : (
                        <div>
                          <div className="font-bold text-black">{resource.title}</div>
                          {resource.url && <a href={resource.url} target="_blank" className="text-[#2570FA] hover:underline text-sm font-medium block mt-1 truncate max-w-xs">{resource.url}</a>}
                        </div>
                      )}
                    </td>

                    {/* DETAILS COLUMN */}
                    <td className="p-5 text-sm text-gray-600">
                      {editingId === resource.id ? (
                        <div className="space-y-3">
                          <input
                            type="text" placeholder="Update Description..."
                            value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#2570FA] outline-none"
                          />
                          <input
                            type="url" placeholder="Update URL..."
                            value={editForm.url} onChange={(e) => setEditForm({...editForm, url: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#2570FA] outline-none"
                          />
                          <select
                            value={editForm.category_id} onChange={(e) => setEditForm({...editForm, category_id: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#2570FA] outline-none"
                          >
                            <option value="">No Category</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                          
                          {/* INLINE EDIT: TAGS SELECTION */}
                          <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                            <p className="text-xs font-bold text-black mb-2">Edit Tags:</p>
                            
                            {/* Current Selected Tags */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {editSelectedTagIds.length === 0 && <span className="text-xs text-gray-500 italic">No tags selected</span>}
                              {editSelectedTagIds.map(id => {
                                const tag = allTags.find(t => t.id === id);
                                return tag ? (
                                  <span key={id} onClick={() => toggleTag(id as string, true)} className="cursor-pointer flex items-center gap-1 bg-[#2570FA] text-white px-2 py-0.5 rounded text-[10px] font-medium shadow-sm hover:bg-red-500 transition-colors group">
                                    {tag.name} <span className="text-blue-100 group-hover:text-white">×</span>
                                  </span>
                                ) : null;
                              })}
                            </div>

                            {/* Tag Search & Add */}
                            <input
                              type="text" placeholder="Search tags to add..."
                              value={editTagSearch} onChange={(e) => setEditTagSearch(e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-black focus:ring-2 focus:ring-[#2570FA] outline-none mb-2 shadow-sm"
                            />
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                              {editFilteredTags.filter(t => !editSelectedTagIds.includes(t.id as string)).map(tag => (
                                <button
                                  type="button" key={tag.id} onClick={() => toggleTag(tag.id as string, true)}
                                  className="px-2 py-0.5 bg-white border border-gray-300 text-black rounded text-[10px] font-medium hover:border-[#2570FA] hover:text-[#2570FA] transition-colors shadow-sm"
                                >
                                  + {tag.name}
                                </button>
                              ))}
                              {editFilteredTags.length === 0 && <span className="text-[10px] text-gray-500">No matching tags.</span>}
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div>
                          <p className="line-clamp-2 text-black">{resource.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {resource.category_id && (
                              <span className="inline-block px-2 py-1 bg-gray-100 text-black border border-gray-200 text-xs font-semibold rounded-md">
                                {categories.find(c => c.id === resource.category_id)?.name || "Unknown Category"}
                              </span>
                            )}
                            {resource.tags && resource.tags.map(t => (
                              <span key={t.id} className="inline-block px-2 py-1 bg-[#2570FA]/10 text-[#2570FA] text-xs font-semibold rounded-md border border-[#2570FA]/20">
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* ACTIONS COLUMN */}
                    <td className="p-5 text-right space-x-2 align-middle">
                      {editingId === resource.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => saveEdit(resource.id)} className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-bold bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition-colors shadow-sm">Cancel</button>
                        </div>
                      ) : deleteConfirmId === resource.id ? (
                        <div className="inline-flex items-center gap-2 bg-gray-50 p-1.5 pl-3 border border-gray-200 rounded-xl shadow-sm">
                          <span className="text-xs text-black font-bold">Delete?</span>
                          <button onClick={() => confirmDelete(resource.id)} className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700">Yes</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-xs font-bold bg-gray-200 text-black rounded-lg hover:bg-gray-300">No</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEditing(resource)} className="px-4 py-2 text-xs font-bold bg-[#2570FA] text-white hover:bg-blue-700 rounded-lg transition-colors">Edit</button>
                          <button onClick={() => setDeleteConfirmId(resource.id)} className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}