import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>
      
      <div className="relative z-10 max-w-3xl text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">SearchBox</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
          Discover, search, and manage everything in one powerful, unified platform.
        </p>
        
        <div className="flex justify-center gap-4 pt-4">
          <Link 
            href="/login"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:scale-105"
          >
            Get Started
          </Link>
          <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-all duration-200 border border-slate-700">
            Learn More
          </button>
        </div>
      </div>
    </main>
  );
}