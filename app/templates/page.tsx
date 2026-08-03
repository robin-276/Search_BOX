import TemplatesHome from "./home";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <TemplatesHome />;
}
