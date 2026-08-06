import type { Request, Response } from "express";
import { ZodError } from "zod";
import { gerarNotaSchema } from "../validators/gera-nota.schema";
import { gerarNota } from "../services/gera-nota.service";

export async function gerarNotaController(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const input = gerarNotaSchema.parse(req.body);
        const result = await gerarNota(input);

        const wantsXml =
            req.headers.accept?.includes("xml") || req.query.formato === "xml";

        if (wantsXml) {
            res.set("Content-Type", "application/xml; charset=utf-8");
            res.set(
                "Content-Disposition",
                `attachment; filename="nfe-${input.numeroNfe}-loja${input.loja}.xml"`
            );
            res.status(200).send(result.xml);
            return;
        }

        res.status(200).json({
            ok: true,
            chave: result.chave,
            cDV: result.cDV,
            totalProdutos: result.totalProdutos,
            arquivo: result.arquivo,
            xml: result.xml,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            res.status(400).json({
                ok: false,
                erro: "Payload inválido",
                detalhes: err.flatten(),
            });
            return;
        }
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        console.error("[gerarNota] erro:", err);
        res.status(500).json({ ok: false, erro: message });
    }
}
