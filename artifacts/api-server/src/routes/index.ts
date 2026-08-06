import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geraNotaRouter from "../gera-nota/router";

const router: IRouter = Router();

router.use(healthRouter);

// Routes (acesso interno, sem senha)
router.use("/v1", geraNotaRouter);

export default router;
