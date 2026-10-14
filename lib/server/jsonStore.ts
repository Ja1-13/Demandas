import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), "data");
const writeQueues = new Map<string, Promise<void>>();
let transactionQueue: Promise<void> = Promise.resolve();

export async function withDataLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = transactionQueue;
  let release!: () => void;
  transactionQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

async function withFileLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(filePath) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  writeQueues.set(filePath, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (writeQueues.get(filePath) === queued) writeQueues.delete(filePath);
  }
}

export function dataFile(name: "users.json" | "demands.json" | "clients.json"): string {
  return path.join(dataDirectory, name);
}

export async function ensureJsonFile<T>(name: "users.json" | "demands.json" | "clients.json", initialValue: T): Promise<void> {
  const filePath = dataFile(name);
  await withFileLock(filePath, async () => {
    await mkdir(dataDirectory, { recursive: true });
    try {
      await readFile(filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await writeAtomically(filePath, initialValue);
    }
  });
}

export async function readJson<T>(name: "users.json" | "demands.json" | "clients.json", initialValue: T): Promise<T> {
  await ensureJsonFile(name, initialValue);
  return JSON.parse(await readFile(dataFile(name), "utf8")) as T;
}

export async function updateJson<T, R>(
  name: "users.json" | "demands.json" | "clients.json",
  initialValue: T,
  update: (current: T) => { value: T; result: R },
): Promise<R> {
  const filePath = dataFile(name);
  return withFileLock(filePath, async () => {
    await mkdir(dataDirectory, { recursive: true });
    let current: T;
    try {
      current = JSON.parse(await readFile(filePath, "utf8")) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      current = initialValue;
    }
    const { value, result } = update(current);
    await writeAtomically(filePath, value);
    return result;
  });
}

async function writeAtomically<T>(filePath: string, value: T): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(tempPath, filePath);
}