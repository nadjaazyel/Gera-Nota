import { Router } from "express";
import { gerarNotaController } from "./controllers/gera-nota.controller";
import { parseNfceHtml } from "./parsers/nfce-html.parser";
import {
    carregarLojas,
    salvarLojas,
    proximoIdLoja,
    type Loja,
} from "./data/lojas";
import {
    listarFornecedores,
    adicionarOuAtualizarFornecedor,
    removerFornecedor,
    buscarFornecedorPorCNPJ,
} from "./data/fornecedores";
import { sugerirNcm, aprenderEan } from "./data/ean-ncm";

export function buildRouter(): Router {
    const r = Router();

    r.get("/health", (_req, res) => {
        res.json({ ok: true, name: "GeraNota", version: "2.1.0" });
    });

    // ===== Geração de NF-e =====
    r.get("/gerar-nota", (_req, res) => {
        res.status(405).json({
            ok: false,
            erro: "Use o botão “Gerar XML e baixar”. Esta rota aceita apenas requisições POST.",
        });
    });
    r.post("/gerar-nota", gerarNotaController);

    // ===== Extração de produtos do HTML =====
    r.post("/extrair-html", (req, res) => {
        try {
            const html = String(req.body?.html ?? "");
            if (!html.trim()) {
                return res.status(400).json({ ok: false, erro: "HTML vazio" });
            }
            const extraido = parseNfceHtml(html);
            return res.json({ ok: true, produtos: extraido.produtos, emitente: extraido.emitente });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro desconhecido";
            return res.status(500).json({ ok: false, erro: msg });
        }
    });

    // ===== Lojas =====
    r.get("/lojas", async (_req, res) => {
        res.json({ ok: true, lojas: await carregarLojas() });
    });

    r.post("/lojas", async (req, res) => {
        try {
            const arr = await carregarLojas();
            const body = req.body as Loja;
            if (!body.CNPJ || !body.xNome) {
                return res.status(400).json({ ok: false, erro: "CNPJ e nome obrigatórios" });
            }
            const id = body.id ?? (await proximoIdLoja());
            const idx = arr.findIndex((l) => l.id === id);
            const nova: Loja = { ...body, id };
            if (idx >= 0) arr[idx] = nova;
            else arr.push(nova);
            await salvarLojas(arr);
            res.json({ ok: true, loja: nova });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro";
            res.status(500).json({ ok: false, erro: msg });
        }
    });

    r.delete("/lojas/:id", async (req, res) => {
        const id = Number(req.params.id);
        const arr = await carregarLojas();
        await salvarLojas(arr.filter((l) => l.id !== id));
        res.json({ ok: true });
    });

    // ===== Fornecedores =====
    r.get("/fornecedores", async (_req, res) => {
        res.json({ ok: true, fornecedores: await listarFornecedores() });
    });

    r.get("/fornecedores/:cnpj", async (req, res) => {
        const f = await buscarFornecedorPorCNPJ(req.params.cnpj);
        if (!f) return res.status(404).json({ ok: false, erro: "Não encontrado" });
        res.json({ ok: true, fornecedor: f });
    });

    r.post("/fornecedores", async (req, res) => {
        try {
            const body = req.body;
            if (!body.CNPJ) {
                return res.status(400).json({ ok: false, erro: "CNPJ obrigatório" });
            }
            const f = await adicionarOuAtualizarFornecedor(body);
            res.json({ ok: true, fornecedor: f });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro";
            res.status(500).json({ ok: false, erro: msg });
        }
    });

    r.delete("/fornecedores/:id", async (req, res) => {
        await removerFornecedor(Number(req.params.id));
        res.json({ ok: true });
    });

    // ===== EAN → NCM (sugestão) =====
    r.get("/ean/:ean", async (req, res) => {
        const sug = await sugerirNcm(req.params.ean);
        res.json({ ok: true, ...sug });
    });

    // ===== EAN → NCM (aprender manualmente) =====
    r.post("/ean/aprender", async (req, res) => {
        try {
            const { ean, NCM, xProd } = req.body as { ean: string; NCM: string; xProd?: string };
            if (!ean || !/^\d{8}$/.test(NCM)) {
                return res.status(400).json({ ok: false, erro: "EAN e NCM (8 dígitos) são obrigatórios." });
            }
            await aprenderEan(ean, NCM, xProd);
            res.json({ ok: true });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro";
            res.status(500).json({ ok: false, erro: msg });
        }
    });

    return r;
}
