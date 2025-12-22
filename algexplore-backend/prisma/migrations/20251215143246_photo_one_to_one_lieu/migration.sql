/*
  Warnings:

  - A unique constraint covering the columns `[id_lieu]` on the table `photo` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."photo_id_lieu_idx";

-- CreateIndex
CREATE UNIQUE INDEX "photo_id_lieu_key" ON "public"."photo"("id_lieu");
