import * as cheerio from "cheerio";

export interface ProdutoExtraido {
    numero: number;
    cProd: string;
    cEAN: string;
    xProd: string;
    NCM: string;
    CEST?: string;
    CFOP: string;
    uCom: string;
    qCom: number;
    vUnCom: number;
    vProd: number;
    CST_PIS?: string;
    CST_COFINS?: string;
}

export interface EmitenteExtraido {
    CNPJ: string;
    xNome: string;
    IE?: string;
    UF?: string;
    xMun?: string;
}

export interface ResultadoExtracao {
    emitente: EmitenteExtraido | null;
    produtos: ProdutoExtraido[];
}

const NCM_PADRAO = "30049069";

/**
 * Parser para HTML da consulta NFC-e da SEFAZ PI.
 *
 * Estrutura do HTML (Ctrl+S):
 *   div.box-item → label.label("Código EAN Comercial") + span.value("7896024760135")
 *
 * Cada produto começa com um label "Num." e seus detalhes seguem até o próximo "Num.".
 */
export function parseNfceHtml(html: string): ResultadoExtracao {
    const $ = cheerio.load(html);

    // Extrai o emitente
    let emitente: EmitenteExtraido | null = null;
    const cnpjEmit = pickLabelValue($, $("body"), "CNPJ") || pickLabelValueFlexivel($, $("body"), "CNPJ") || extrairCnpjDaString(html);
    if (cnpjEmit) {
        // Tenta pegar a Razão Social (fica perto do CNPJ geralmente ou no topo)
        let xNome = pickLabelValue($, $("body"), "Razão Social") || pickLabelValueFlexivel($, $("body"), "Razão Social") || pickLabelValue($, $("body"), "Nome / Razão Social");
        if (!xNome) {
            // No formato React/MUI do Piauí, a razão social muitas vezes fica no header ou tab Emitente
            const emitBox = $("#Emitente, .emitente-box, [role='tabpanel']").filter((_, el) => $(el).text().includes(cnpjEmit) || $(el).text().includes("Razão Social")).first();
            xNome = emitBox.find("span.value").first().text().trim() || "";
        }
        emitente = { CNPJ: cnpjEmit.replace(/\D/g, ""), xNome };
    }

    // Formato atual da SEFAZ PI (React/MUI, Ctrl+S)
    const novo = parseFormatoBoxItem($);
    if (novo.length > 0) return { emitente, produtos: novo };

    // Formato antigo (XSLT puro)
    const antigo = parseFormatoAntigo($);
    if (antigo.length > 0) return { emitente, produtos: antigo };

    // Fallback: texto plano
    return { emitente, produtos: parseFormatoTexto(html) };
}

function extrairCnpjDaString(str: string): string {
    // Procura CNPJ formatado ou não formatado que venha logo após a palavra CNPJ
    const m2 = str.match(/CNPJ[^\d]{0,20}(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i);
    if (m2) return m2[1]!;

    const m = str.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    if (m) return m[0];

    // Tenta encontrar a chave de acesso (44 dígitos) - o CNPJ fica da posição 6 à 20
    const mChave = str.match(/(\d{44})/);
    if (mChave) return mChave[1]!.substring(6, 20);

    // Tenta encontrar qualquer 14 dígitos que pareça um CNPJ
    const m3 = str.match(/\b(\d{14})\b/);
    return m3 ? m3[1]! : "";
}

function pickLabelValueFlexivel($: cheerio.CheerioAPI, $scope: cheerio.Cheerio<any>, labelText: string): string {
    let found = "";
    $scope.find("label, th, td.label, strong, b").each((_, el) => {
        if (found) return;
        const txt = $(el).text().trim().toLowerCase();
        if (txt.includes(labelText.toLowerCase())) {
            const next = $(el).next("span, td, p, div").text().trim();
            if (next) found = next;
        }
    });
    return found;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formato NOVO: div.box-item com label.label + span.value
// ─────────────────────────────────────────────────────────────────────────────
function parseFormatoBoxItem($: cheerio.CheerioAPI): ProdutoExtraido[] {
    // Coleta TODOS os pares label→valor na página
    const pairs: Array<{ label: string; value: string }> = [];

    $(".box-item").each((_, el) => {
        const labelEl = $(el).find("label").first();
        const valueEl = $(el).find("span.value").first();
        const label = labelEl.text().trim();
        const value = valueEl.text().trim();
        if (label) pairs.push({ label, value });
    });

    if (pairs.length === 0) return [];

    // Agrupa por "Num." — cada ocorrência inicia um novo produto
    const grupos: Array<Record<string, string>> = [];
    let atual: Record<string, string> | null = null;

    for (const { label, value } of pairs) {
        const lbl = label.replace(/[.:]/g, "").trim();
        if (/^Num$/i.test(lbl)) {
            if (atual) grupos.push(atual);
            atual = { _num: value };
        } else if (atual) {
            // Guarda usando o label exato como chave
            atual[label] = value;
        }
    }
    if (atual) grupos.push(atual);

    if (grupos.length === 0) return [];

    return grupos.map((g, i) => {
        const num = parseInt(g["_num"] || String(i + 1), 10) || i + 1;

        // Descrição
        const xProd = pick(g, "Descrição", "Descrição do Produto", "xProd") || "";

        // Código EAN Comercial (crucial!)
        const cEAN = pick(g, "Código EAN Comercial", "Código EAN", "EAN", "GTIN") || "SEM GTIN";

        // Código do Produto (do fornecedor)
        const cProd = pick(g, "Código do Produto", "Código", "cProd") || String(num);

        // NCM e CEST
        const NCM = pick(g, "Código NCM", "NCM") || NCM_PADRAO;
        const CEST = pick(g, "Código CEST", "CEST") || undefined;

        // CFOP
        const CFOP = pick(g, "CFOP") || "5102";

        // Quantidade e unidade
        const qCom = parseBrNumber(pick(g, "Quantidade Comercial", "Qtd.", "Quantidade", "qCom") || "1");
        const uCom = pick(g, "Unidade Comercial", "Unidade", "Un.", "uCom") || "UN";

        // Valor unitário (preferência: comercialização > tributação > total/qtd)
        let vUnCom = parseBrNumber(pick(g,
            "Valor unitário de comercialização",
            "Valor unitário de tributação",
            "Valor Unitário"
        ) || "0");

        // Valor total do produto
        const vProd = parseBrNumber(pick(g, "Valor(R$)", "Valor Total", "Valor") || "0");

        // Se não veio valor unitário explícito, calcula pelo total
        if (vUnCom === 0 && qCom > 0) {
            vUnCom = vProd / qCom;
        }

        return {
            numero: num,
            cProd,
            cEAN,
            xProd,
            NCM,
            CEST: CEST || undefined,
            CFOP,
            uCom,
            qCom: qCom || 1,
            vUnCom,
            vProd,
        };
    }).filter(p => p.xProd.length > 0);
}

/**
 * Busca um valor no grupo usando uma lista de possíveis labels.
 */
function pick(g: Record<string, string>, ...keys: string[]): string {
    for (const k of keys) {
        if (g[k] !== undefined && g[k] !== "") return g[k]!;
    }
    return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Formato ANTIGO: table.toggle.box / table.toggable.box
// ─────────────────────────────────────────────────────────────────────────────
function parseFormatoAntigo($: cheerio.CheerioAPI): ProdutoExtraido[] {
    const produtos: ProdutoExtraido[] = [];

    $("table.toggle.box").each((_, headerEl) => {
        const $header = $(headerEl);
        const numero = parseInt($header.find("td.fixo-prod-serv-numero span").text().trim() || "0", 10);
        const xProd = $header.find("td.fixo-prod-serv-descricao span").text().trim();
        const qCom = parseBrNumber($header.find("td.fixo-prod-serv-qtd span").text().trim());
        const uCom = $header.find("td.fixo-prod-serv-uc span").text().trim();
        const vProd = parseBrNumber($header.find("td.fixo-prod-serv-vb span").text().trim());

        if (!xProd || !numero) return;

        const $details = $header.next("table.toggable.box");
        const cProd = pickLabelValue($, $details, "Código do Produto");
        const NCM = pickLabelValue($, $details, "Código NCM") || NCM_PADRAO;
        const CEST = pickLabelValue($, $details, "Código CEST") || undefined;
        const CFOP = pickLabelValue($, $details, "CFOP") || "5102";
        const cEAN = pickLabelValue($, $details, "Código EAN Comercial") || "SEM GTIN";
        const vUnCom = parseBrNumber(pickLabelValue($, $details, "Valor unitário de comercialização") || "0");

        produtos.push({
            numero,
            cProd: cProd || String(numero),
            cEAN,
            xProd,
            NCM,
            CEST,
            CFOP,
            uCom: uCom || "UN",
            qCom,
            vUnCom: vUnCom || (qCom > 0 ? vProd / qCom : 0),
            vProd,
        });
    });

    return produtos;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback: texto plano
// ─────────────────────────────────────────────────────────────────────────────
function parseFormatoTexto(html: string): ProdutoExtraido[] {
    const $ = cheerio.load(html);
    const text = $("body").text();
    const produtos: ProdutoExtraido[] = [];

    const blocoRegex = /Num\.?\s*(\d+)\s+Descri[çc][aã]o\s*([^\n]+?)\s+Qtd\.?\s*([\d.,]+)\s+Unidade\s+Comercial\s*(\S+)\s+Valor\s*\(R\$\)\s*([\d.,]+)/gi;

    let m: RegExpExecArray | null;
    while ((m = blocoRegex.exec(text)) !== null) {
        const numero = parseInt(m[1]!, 10);
        const xProd = m[2]!.trim();
        const qCom = parseBrNumber(m[3]!);
        const uCom = (m[4] || "UN").trim();
        const vProd = parseBrNumber(m[5]!);

        produtos.push({
            numero,
            cProd: String(numero),
            cEAN: "SEM GTIN",
            xProd,
            NCM: NCM_PADRAO,
            CFOP: "5102",
            uCom,
            qCom,
            vUnCom: qCom > 0 ? vProd / qCom : 0,
            vProd,
        });
    }

    return produtos;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function pickLabelValue($: cheerio.CheerioAPI, $scope: cheerio.Cheerio<any>, labelText: string): string {
    let value = "";
    $scope.find("label").each((_, el) => {
        const txt = $(el).text().trim().replace(/\s+/g, " ");
        if (txt === labelText && !value) {
            value = $(el).next("span").text().trim();
        }
    });
    return value;
}

export function parseBrNumber(input: string): number {
    if (!input) return 0;
    const cleaned = input.trim().replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
}
