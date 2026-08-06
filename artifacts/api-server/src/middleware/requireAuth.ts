import type { Request, Response, NextFunction } from "express";

/** Session guard — rejects unauthenticated calls with 401. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if ((req.session as any)?.authenticated === true) {
        next();
        return;
    }
    res.status(401).json({ ok: false, erro: "Não autenticado. Faça login primeiro." });
}
