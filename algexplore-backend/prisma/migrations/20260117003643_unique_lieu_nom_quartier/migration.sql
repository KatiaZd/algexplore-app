/*
  Warnings:

  - A unique constraint covering the columns `[nom_lieu,id_quartier]` on the table `lieu` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "uq_lieu_nom_quartier" ON "public"."lieu"("nom_lieu", "id_quartier");
