"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

// Define the Category type based on your Supabase table
type Category = {
  id: string | number;
  name: string;
  user_id: string;
};

export default function CategoryManager() {
  const supabase = createClient();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for inline editing
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editName, setEditName] = useState("");

  // State for 2nd step delete verification
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setCategories(data || []);
    }
    
    setIsLoading(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!newCategoryName.trim()) return;

    // 1. Get the currently logged-in user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      setError("You must be logged in to add a category.");
      return;
    }

    // 2. Insert with user_id
    const { data, error: insertError } = await supabase
      .from("categories")
      .insert([
        { 
          name: newCategoryName,
          user_id: user.id
        }
      ])
      .select();

    if (insertError) {
      setError(insertError.message);
    } else if (data && data.length > 0) {
      // Safely update UI only if data exists
      setCategories([data[0], ...categories]);
      setNewCategoryName("");
    } else {
      // Fallback in case RLS prevents returning the inserted row
      fetchCategories();
      setNewCategoryName("");
    }
  };

  // --- MISSING FUNCTIONS ADDED HERE ---
  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setDeleteConfirmId(null);
  };

  const saveEdit = async (id: string | number) => {
    if (!editName.trim()) return;
    setError(null);

    const { error: updateError } = await supabase
      .from("categories")
      .update({ name: editName })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setEditingId(null);
      fetchCategories(); // Refresh the list to show updated name
    }
  };
  // ------------------------------------

  const askForDeleteConfirmation = (id: string | number) => {
    setDeleteConfirmId(id);
    setEditingId(null); // Cancel any active edits
  };

  const confirmDelete = async (id: string | number) => {
    setError(null);
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setDeleteConfirmId(null);
      // Remove item from UI without reloading
      setCategories(categories.filter((cat) => cat.id !== id));
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8 bg-[#FFFFFF] min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Categories</h1>
          <p className="text-gray-600 mt-1 font-medium">Manage your resource categories</p>
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name..."
            className="w-full md:w-64 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2570FA] focus:border-transparent text-black outline-none transition-all shadow-sm"
            required
          />
          <button
            type="submit"
            className="px-5 py-2 bg-[#2570FA] hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all whitespace-nowrap"
          >
            Add Category
          </button>
        </form>
      </div>

      {/* Error Message Display */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 font-medium shadow-sm">
          {error}
        </div>
      )}

      {/* Categories Table */}
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
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 font-medium">
                    No categories found. Create one above!
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    
                    {/* ID Column */}
                    <td className="p-4 font-mono text-xs text-gray-500">
                      {typeof category.id === 'string' ? category.id.substring(0, 8) + '...' : category.id}
                    </td>

                    {/* Name Column */}
                    <td className="p-4">
                      {editingId === category.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-black outline-none focus:ring-2 focus:ring-[#2570FA]"
                          autoFocus
                        />
                      ) : (
                        <span className="font-bold text-black">{category.name}</span>
                      )}
                    </td>

                    {/* User ID Column */}
                    <td className="p-4 font-mono text-xs text-gray-500 truncate max-w-[150px]">
                      {category.user_id}
                    </td>

                    {/* Actions Column */}
                    <td className="p-4 text-right space-x-2 align-middle">
                      {/* Editing Mode Buttons */}
                      {editingId === category.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveEdit(category.id)}
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
                      ) : deleteConfirmId === category.id ? (
                        
                        /* Delete Verification 2nd Step */
                        <div className="inline-flex items-center gap-2 bg-gray-50 p-1.5 pl-3 border border-gray-200 rounded-xl shadow-sm">
                          <span className="text-xs text-black font-bold">Are you sure?</span>
                          <button
                            onClick={() => confirmDelete(category.id)}
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
                        
                        /* Default Action Buttons */
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEditing(category)}
                            className="px-4 py-2 text-xs font-bold bg-[#2570FA] text-white hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => askForDeleteConfirmation(category.id)}
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