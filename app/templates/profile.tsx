"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User, Mail, Database, LogOut, Calendar, Shield, Edit2, Check, X, Key, Upload } from "lucide-react";

export default function ProfilePage() {
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [resourceCount, setResourceCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- Edit States ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  const [avatar, setAvatar] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [updateMessage, setUpdateMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setUser(user);
      setNewEmail(user.email || "");
      
      // Fetching from 'profiles' table using 'id'
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
        
      if (profileData) {
        setNewName(profileData.full_name || "");
        setAvatar(profileData.avatar_url || "");
      } else if (profileError) {
        console.error("Error fetching profile. Did you run the RLS SQL?:", profileError.message);
      }
      
      // Fetch Resource Count
      const { count } = await supabase
        .from("resources")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
        
      setResourceCount(count || 0);
    }
    setIsLoading(false);
  };

  // --- Image Upload Handler (Base64 Text Method) ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Validation: File Size (1MB = 1048576 bytes)
    if (file.size > 1048576) {
      showMessage("error", "Image must be less than 1MB.");
      event.target.value = ''; // Reset input
      return;
    }

    // 2. Validation: File Type (JPG or PNG only)
    if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/jpg") {
      showMessage("error", "Only JPG and PNG images are allowed.");
      event.target.value = ''; // Reset input
      return;
    }

    setIsUploadingAvatar(true);

    // 3. Convert Image to Text (Base64)
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;

      // 4. Save the text string to the avatar_url column
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: base64String })
        .eq("id", user.id);
      
      if (error) {
        showMessage("error", error.message);
      } else {
        showMessage("success", "Profile picture updated successfully!");
        setAvatar(base64String); // Update UI immediately
      }
      setIsUploadingAvatar(false);
    };
    
    // Start the conversion process
    reader.readAsDataURL(file);
  };

  // --- Update Handlers ---
  const handleUpdateName = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: newName })
      .eq("id", user.id);
    
    if (error) showMessage("error", error.message);
    else {
      showMessage("success", "Name updated successfully!");
      setIsEditingName(false);
      fetchProfileData();
    }
  };

  const handleUpdateEmail = async () => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    
    if (error) showMessage("error", error.message);
    else {
      showMessage("success", "Confirmation links sent! Check BOTH your old and new emails to verify.");
      setIsEditingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) showMessage("error", error.message);
    else {
      showMessage("success", "Password updated successfully!");
      setIsEditingPassword(false);
      setNewPassword("");
    }
  };

  const showMessage = (type: string, text: string) => {
    setUpdateMessage({ type, text });
    setTimeout(() => setUpdateMessage({ type: "", text: "" }), 6000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (isLoading) return <div className="flex justify-center pt-20 text-gray-500">Loading profile data...</div>;
  if (!user) return <div className="p-8 text-center text-red-500 font-bold">You are not logged in.</div>;

  const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-6 space-y-8 bg-[#FFFFFF] min-h-[80vh] font-sans">
      
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight">My Profile</h1>
        <p className="text-gray-600 mt-2 font-medium">Manage your account details and security.</p>
      </div>

      {updateMessage.text && (
        <div className={`p-4 rounded-xl font-bold ${updateMessage.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {updateMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Account Details */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          
          {/* AVATAR UPLOAD SECTION */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-gray-100">
            <div className="relative group">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-blue-50 shadow-sm" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center border-4 border-white shadow-sm text-blue-500 font-bold text-3xl">
                  {newName ? newName.charAt(0).toUpperCase() : <User className="w-10 h-10" />}
                </div>
              )}
              
              <label className="absolute bottom-0 right-0 p-2 bg-white border border-gray-200 rounded-full shadow-md text-gray-600 hover:text-[#2570FA] hover:border-[#2570FA] transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <input 
                  type="file" 
                  accept=".png, .jpg, .jpeg, image/png, image/jpeg" 
                  onChange={handleFileUpload}
                  className="hidden" 
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>
            
            <div className="text-center sm:text-left mt-2 flex-1 w-full">
              <h2 className="text-2xl font-bold text-black">{newName || "No name set"}</h2>
              <p className="text-gray-500 font-medium mb-2">{user.email}</p>
              {isUploadingAvatar && <p className="text-sm text-[#2570FA] font-bold">Saving image data...</p>}
            </div>
          </div>

          <div className="space-y-6 pt-2">
            
            {/* FULL NAME FIELD */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Shield className="w-4 h-4 text-gray-400" /> Full Name
                </label>
                {!isEditingName && (
                  <button onClick={() => setIsEditingName(true)} className="text-sm text-[#2570FA] hover:underline font-bold flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
              {isEditingName ? (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    className="flex-1 px-4 py-2 border border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-[#2570FA]" 
                  />
                  <button onClick={handleUpdateName} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><Check className="w-5 h-5" /></button>
                  <button onClick={() => { setIsEditingName(false); fetchProfileData(); }} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black font-medium">
                  {newName || "No name set"}
                </div>
              )}
            </div>

            {/* EMAIL FIELD */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" /> Email Address
                </label>
                {!isEditingEmail && (
                  <button onClick={() => setIsEditingEmail(true)} className="text-sm text-[#2570FA] hover:underline font-bold flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
              {isEditingEmail ? (
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    className="flex-1 px-4 py-2 border border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-[#2570FA]" 
                  />
                  <button onClick={handleUpdateEmail} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><Check className="w-5 h-5" /></button>
                  <button onClick={() => { setIsEditingEmail(false); setNewEmail(user.email || ""); }} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black font-medium">
                  {user.email}
                </div>
              )}
            </div>

            {/* PASSWORD FIELD */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Key className="w-4 h-4 text-gray-400" /> Password
                </label>
                {!isEditingPassword && (
                  <button onClick={() => setIsEditingPassword(true)} className="text-sm text-[#2570FA] hover:underline font-bold flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Change
                  </button>
                )}
              </div>
              {isEditingPassword ? (
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    placeholder="Enter new password"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="flex-1 px-4 py-2 border border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-[#2570FA]" 
                  />
                  <button onClick={handleUpdatePassword} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><Check className="w-5 h-5" /></button>
                  <button onClick={() => { setIsEditingPassword(false); setNewPassword(""); }} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium">
                  ••••••••
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4 text-gray-400" /> Account Created
              </label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium">
                {joinedDate}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Stats & Actions */}
        <div className="space-y-6">
          <div className="bg-[#2570FA] text-white border border-blue-600 rounded-2xl p-6 shadow-md text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-blue-200" />
            <h3 className="text-lg font-semibold text-blue-100 mb-1">Total Resources</h3>
            <p className="text-5xl font-black">{resourceCount}</p>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm text-center">
            <h3 className="text-red-800 font-bold mb-2">Leaving so soon?</h3>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition-colors mt-4"
            >
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}