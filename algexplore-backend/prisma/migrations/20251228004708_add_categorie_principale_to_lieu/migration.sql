-- AlterTable
ALTER TABLE "public"."lieu" ADD COLUMN     "categoriePrincipale" TEXT;

-- AlterTable
ALTER TABLE "public"."lieu_categorie" ADD COLUMN     "is_principale" BOOLEAN NOT NULL DEFAULT false;
