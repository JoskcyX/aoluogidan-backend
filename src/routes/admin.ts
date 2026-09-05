import { Router } from "express";
import contentRoutes from "@/routes/admin-content";
import blogRoutes from "@/routes/admin-blog";
import miscRoutes from "@/routes/admin-misc";

const router = Router();

router.use(contentRoutes);
router.use(blogRoutes);
router.use(miscRoutes);

export default router;
