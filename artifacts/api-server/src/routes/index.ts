import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import geraNotaRouter from "../gera-nota/router";
import { requireAuth } from "../middleware/requireAuth";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use("/auth", authRouter);

// Protected routes — require authenticated session
router.use("/v1", requireAuth, geraNotaRouter);

export default router;
