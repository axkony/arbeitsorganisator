import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessionRates } from "@/db/schema";

export async function listSessionRates() {
  return db.select().from(sessionRates);
}
export type SessionRate = Awaited<ReturnType<typeof listSessionRates>>[number];

export async function updateSessionRate(
  sessionType: string,
  rateRappen: number,
) {
  await db
    .update(sessionRates)
    .set({ rateRappen })
    .where(eq(sessionRates.sessionType, sessionType));
}
