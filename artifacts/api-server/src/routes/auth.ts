import { Router } from "express";

const router = Router();

/**
 * POST /api/auth/login
 * Body: { password: string }
 *
 * The shared password is the SESSION_SECRET env var.
 * For an internal tool, one shared secret is appropriate.
 */
router.post("/login", (req, res) => {
    const { password } = req.body as { password?: string };
    const expected = process.env["SESSION_SECRET"];

    if (!expected) {
        res.status(503).json({ ok: false, erro: "SESSION_SECRET não configurado no servidor." });
        return;
    }

    if (!password || password !== expected) {
        res.status(401).json({ ok: false, erro: "Senha incorreta." });
        return;
    }

    (req.session as any).authenticated = true;
    res.json({ ok: true });
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

router.get("/status", (req, res) => {
    res.json({ authenticated: (req.session as any)?.authenticated === true });
});

export default router;
