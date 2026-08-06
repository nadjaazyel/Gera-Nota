import { promises as fs } from "fs";
import path from "path";
import { getLoja } from "../data/lojas";
import { buscarFornecedorPorCNPJ } from "../data/fornecedores";
import { aprenderEan, sugerirNcm } from "../data/ean-ncm";
import { parseNfceHtml } from "../parsers/nfce-html.parser";
import { buildNFeXml } from "../builders/nfe-xml.builder";
import type { GerarNotaInput, ProdutoInput } from "../validators/gera-nota.schema";
import type { EmitenteInput } from "../validators/gera-nota.schema";

// process.cwd() is the artifact dir (artifacts/api-server/) at runtime
const ARQUIVOS_DIR = path.resolve(process.cwd(), "arquivos");

export async function gerarNota(input: GerarNotaInput): Promise<{
    xml: string;
    chave: string;
    cDV: number;
    arquivo: string;
    totalProdutos: number;
}> {
    const loja = await getLoja(input.loja);
    let produtos: ProdutoInput[] = [];
    let emitenteEnriquecido: EmitenteInput = { ...input.emitente };

    // ── Parse HTML (if supplied) ───────────────────────────────────────────────
    if ((input.modo === "html" || input.modo === "hibrido") && input.html) {
        const extraidos = parseNfceHtml(input.html);

        // Enrich emitente from parsed HTML when fields are missing
        if (extraidos.emitente) {
            const parsedCnpj = extraidos.emitente.CNPJ.replace(/\D/g, "");
            if (!emitenteEnriquecido.xNome && extraidos.emitente.xNome) {
                emitenteEnriquecido.xNome = extraidos.emitente.xNome;
            }
            if (!emitenteEnriquecido.IE && extraidos.emitente.IE) {
                emitenteEnriquecido.IE = extraidos.emitente.IE;
            }
            // If CNPJ was absent from input but found in HTML, use it
            if (!emitenteEnriquecido.CNPJ && parsedCnpj) {
                emitenteEnriquecido.CNPJ = parsedCnpj;
            }
        }

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

    if ((input.modo === "manual" || input.modo === "hibrido") && input.produtos?.length) {
        produtos.push(...input.produtos);
    }

    if (produtos.length === 0) {
        throw new Error("Nenhum produto foi encontrado no HTML ou na lista de produtos.");
    }

    // ── Resolve emitente name/address from saved suppliers ────────────────────
    if (!emitenteEnriquecido.xNome) {
        const salvo = await buscarFornecedorPorCNPJ(emitenteEnriquecido.CNPJ);
        if (salvo) {
            emitenteEnriquecido.xNome = salvo.xNome;
            if (salvo.IE && !emitenteEnriquecido.IE) {
                emitenteEnriquecido.IE = salvo.IE;
            }
            if (salvo.CRT !== undefined && emitenteEnriquecido.CRT === 3) {
                emitenteEnriquecido.CRT = salvo.CRT;
            }
            if (salvo.enderEmit) {
                emitenteEnriquecido.enderEmit = {
                    ...emitenteEnriquecido.enderEmit,
                    xLgr: salvo.enderEmit.xLgr ?? emitenteEnriquecido.enderEmit.xLgr,
                    nro: salvo.enderEmit.nro ?? emitenteEnriquecido.enderEmit.nro,
                    xBairro: salvo.enderEmit.xBairro ?? emitenteEnriquecido.enderEmit.xBairro,
                    cMun: salvo.enderEmit.cMun ?? emitenteEnriquecido.enderEmit.cMun,
                    xMun: salvo.enderEmit.xMun ?? emitenteEnriquecido.enderEmit.xMun,
                    UF: salvo.enderEmit.UF ?? emitenteEnriquecido.enderEmit.UF,
                    CEP: salvo.enderEmit.CEP ?? emitenteEnriquecido.enderEmit.CEP,
                };
            }
        }
    }

    // ── Guard: reject if issuer name is still unknown ─────────────────────────
    if (!emitenteEnriquecido.xNome || emitenteEnriquecido.xNome.trim() === "") {
        throw new Error(
            `Razão social do fornecedor não encontrada para o CNPJ ${emitenteEnriquecido.CNPJ}. ` +
            "Cadastre o fornecedor ou informe um HTML com a razão social."
        );
    }

    // ── Learn / resolve NCM for each product ─────────────────────────────────
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

    // ── Build XML ─────────────────────────────────────────────────────────────
    const { xml, chave, cDV } = buildNFeXml({
        numeroNfe: input.numeroNfe,
        serie: input.serie,
        cNF: input.codigoNumeroChave.padStart(8, "0"),
        emitente: emitenteEnriquecido,
        destinatario: loja,
        produtos,
    });

    await fs.mkdir(ARQUIVOS_DIR, { recursive: true });
    const arquivo = path.join(ARQUIVOS_DIR, `nfe-${input.numeroNfe}-loja${input.loja}.xml`);
    await fs.writeFile(arquivo, xml, "utf-8");

    return { xml, chave, cDV, arquivo, totalProdutos: produtos.length };
}
