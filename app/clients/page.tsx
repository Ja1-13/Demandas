import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ClientAdmin } from "@/components/ClientAdmin";

export default async function ClientsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.perfil !== "ADM") redirect("/demands");
  return <ClientAdmin />;
}