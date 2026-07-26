"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

// Define the Tag type based on your Supabase table
type Tag = {
  id: string | number;
  name: string;
  user_id: string;
};

export default function Tags() {
  const supabase = createClient();
  
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for inline editing
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editName, setEditName] = useState("");

  // State for 2nd step delete verification
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setIsLoading(true);
    setError(null);
    
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setTags(data || []);
    }
    
    setIsLoading(false);
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user) {
      setError("You must be logged in to add a tag.");
      return;
    }

    const { error: insertError } = await supabase
      .from("tags")
      .insert([{ 
        name: newTagName, 
        user_id: authData.user.id 
      }]);

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewTagName("");
      fetchTags();
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setDeleteConfirmId(null); 
  };

  const saveEdit = async (id: string | number) => {
    setError(null);
    const { error: updateError } = await supabase
      .from("tags")
      .update({ name: editName })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setEditingId(null);
      fetchTags();
    }
  };

  const askForDeleteConfirmation = (id: string | number) => {
    setDeleteConfirmId(id);
    setEditingId(null); 
  };

  const confirmDelete = async (id: string | number) => {
    setError(null);
    const { error: deleteError } = await supabase
      .from("tags")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setDeleteConfirmId(null);
      fetchTags();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8 bg-[#FFFFFF] min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Tags</h1>
          <p className="text-gray-600 mt-1 font-medium">Manage your resource tags</p>
        </div>

        <form onSubmit={handleAddTag} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag name..."
            className="w-full md:w-64 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2570FA] focus:border-transparent text-black outline-none transition-all shadow-sm"
            required
          />
          <button
            type="submit"
            className="px-5 py-2 bg-[#2570FA] hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all whitespace-nowrap"
          >
            Add Tag
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 font-medium shadow-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-black text-sm font-bold uppercase tracking-wider">
                <th className="p-4 w-24">ID</th>
                <th className="p-4">Name</th>
                <th className="p-4 text-gray-500">User ID</th>
                <th className="p-4 w-64 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-black">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 font-medium">
                    Loading tags...
                  </td>
                </tr>
              ) : tags.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 font-medium">
                    No tags found. Create one above!
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono text-xs text-gray-500">
                      {typeof tag.id === 'string' ? tag.id.substring(0, 8) + '...' : tag.id}
                    </td>
                    <td className="p-4">
                      {editingId === tag.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
                          autoFocus
                        />
                      ) : (
                        <span className="font-bold text-black">
                          <span className="text-gray-400 mr-1">#</span>
                          {tag.name}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-500 truncate max-w-[150px]">
                      {tag.user_id}
                    </td>
                    <td className="p-4 text-right space-x-2 align-middle">
                      {editingId === tag.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveEdit(tag.id)}
                            className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 text-xs font-bold bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition-colors shadow-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : deleteConfirmId === tag.id ? (
                        <div className="inline-flex items-center gap-2 bg-gray-50 p-1.5 pl-3 border border-gray-200 rounded-xl shadow-sm">
                          <span className="text-xs text-black font-bold">Are you sure?</span>
                          <button
                            onClick={() => confirmDelete(tag.id)}
                            className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1.5 text-xs font-bold bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEditing(tag)}
                            className="px-4 py-2 text-xs font-bold bg-[#2570FA] text-white hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => askForDeleteConfirmation(tag.id)}
                            className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
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