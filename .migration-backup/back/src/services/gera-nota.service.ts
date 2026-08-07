import { promises as fs } from "fs";
import path from "path";
import { getLoja } from "../data/lojas";
import { aprenderEan, sugerirNcm } from "../data/ean-ncm";
import { parseNfceHtml } from "../parsers/nfce-html.parser";
import { buildNFeXml } from "../builders/nfe-xml.builder";
import type {
    GerarNotaInput,
    ProdutoInput,
} from "../validators/gera-nota.schema";

export async function gerarNota(input: GerarNotaInput): Promise<{
    xml: string;
    chave: string;
    cDV: number;
    arquivo: string;
    totalProdutos: number;
}> {
    const loja = await getLoja(input.loja);

    let produtos: ProdutoInput[] = [];

    if (input.modo === "html" || input.modo === "hibrido") {
        if (input.html) {
            const extraidos = parseNfceHtml(input.html);
            produtos.push(
                ...extraidos.produtos.map<ProdutoInput>((p) => ({
                    xProd: p.xProd,
                    cEAN: p.cEAN,
                    NCM: p.NCM,
                    CEST: p.CEST,
                    CFOP: p.CFOP,
                    uCom: p.uCom,
                    qCom: p.qCom,
                    vUnCom: p.vUnCom,
                    cProd: p.cProd,
                }))
            );
        }
    }

    if (input.modo === "manual" || input.modo === "hibrido") {
        if (input.produtos && input.produtos.length > 0) {
            produtos.push(...input.produtos);
        }
    }

    if (produtos.length === 0) {
        throw new Error("Nenhum produto foi informado.");
    }

    // Completa NCMs faltantes e aprende novos
    for (const p of produtos) {
        if (!p.NCM) {
            const sug = await sugerirNcm(p.cEAN);
            p.NCM = sug.NCM;
            if (!p.xProd && sug.xProd) p.xProd = sug.xProd;
        } else if (p.cEAN && p.cEAN !== "SEM GTIN") {
            await aprenderEan(p.cEAN, p.NCM, p.xProd);
        }
        if (!p.xProd) p.xProd = `Produto ${p.cEAN || "sem identificacao"}`;
    }

    const { xml, chave, cDV } = buildNFeXml({
        numeroNfe: input.numeroNfe,
        serie: input.serie,
        cNF: input.codigoNumeroChave.padStart(8, "0"),
        emitente: input.emitente,
        destinatario: loja,
        produtos,
    });

    const arquivoNome = `nfe-${input.numeroNfe}-loja${input.loja}.xml`;
    const dir = process.env.VERCEL === "1"
        ? "/tmp/gera-nota"
        : path.resolve(__dirname, "../../arquivos");
    const arquivo = path.join(dir, arquivoNome);

    // O download acontece no navegador via resposta HTTP. Em ambientes serverless
    // (Vercel), a gravação local é apenas uma cópia temporária e não pode bloquear
    // a geração do XML.
    try {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(arquivo, xml, "utf-8");
    } catch (error) {
        console.warn("Não foi possível salvar cópia local do XML:", error);
    }

    return { xml, chave, cDV, arquivo, totalProdutos: produtos.length };
}
