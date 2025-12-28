import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();


// GET /categories
router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.categorie.findMany({
      select: {
        id: true,
        nom: true,
      },
      orderBy: {
        nom: "asc",
      },
    });

    return res.status(200).json(categories);
  } catch (error) {
    console.error("GET /categories error:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;