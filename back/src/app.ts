import express from "express";
import cors from "cors";
import path from "path";
import { buildRouter } from "./routes";

export function buildApp(): express.Express {
    const app = express();

    app.use(cors());
    app.use(express.json({ limit: "20mb" }));

    // API
    app.use("/api/v1", buildRouter());

    // Frontend estático (servido na raiz)
    const frontendPath = path.resolve(__dirname, "../../front");
    app.use(express.static(frontendPath));

    // SPA fallback (qualquer rota desconhecida devolve o index.html)
    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/")) return next();
        res.sendFile(path.join(frontendPath, "index.html"));
    });

    return app;
}
