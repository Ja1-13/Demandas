import "server-only";
import { initializeDemands } from "@/lib/repositories/demandRepository";
import { initializeUsers } from "@/lib/repositories/userRepository";

export async function initializeRepositories(): Promise<void> {
  await Promise.all([initializeUsers(), initializeDemands()]);
}