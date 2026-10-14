ALTER TABLE "Demand" ADD COLUMN "numero" INTEGER NOT NULL DEFAULT 0;

UPDATE "Demand"
SET "numero" = (
  SELECT COUNT(*)
  FROM "Demand" AS other
  WHERE other."criadaEm" < "Demand"."criadaEm"
     OR (other."criadaEm" = "Demand"."criadaEm" AND other."id" <= "Demand"."id")
);

CREATE UNIQUE INDEX "Demand_numero_key" ON "Demand"("numero");

ALTER TABLE "Demand" ADD COLUMN "responsavelId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DemandCounter" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "nextNumber" INTEGER NOT NULL DEFAULT 1
);

INSERT INTO "DemandCounter" ("id", "nextNumber")
SELECT 1, COALESCE(MAX("numero"), 0) + 1 FROM "Demand";

CREATE TABLE "DemandComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "demandId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemandComment_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DemandComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);