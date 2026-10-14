import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { initializeRepositories } from "@/lib/repositories/initializeRepositories";

export default async function LoginPage() {
  await initializeRepositories();
  return <Suspense><LoginForm /></Suspense>;
}