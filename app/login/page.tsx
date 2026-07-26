import LoginForm from "./login";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px]"></div>
      
      <div className="relative z-10 w-full flex justify-center">
        <LoginForm />
      </div>
    </main>
  );
}