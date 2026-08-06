/**
 * NF-e XML Builder — produces a plain <NFe> document (model 55 v4.00).
 *
 * This generates an internally-structured import document for ERP entry.
 * It is NOT a SEFAZ-authorized NF-e (no <nfeProc> / authorization protocol)
 * and carries no fiscal validity. The infAdic disclaimer makes this explicit.
 */
import { create } from "xmlbuilder2";
import type { Loja } from "../data/lojas";
import type { EmitenteInput, ProdutoInput } from "../validators/gera-nota.schema";
import { resolveTax, type TaxResolution } from "../rules/tax-rules";
import { aammFromDate, montarChaveNFe } from "../utils/chave-nfe";
import { isoDateTime, money, percent, qty, randomCNF, unit } from "../utils/format";

export interface BuildArgs {
    numeroNfe: string;
    serie: string;
    cNF?: string;
    emitente: EmitenteInput;
    destinatario: Loja;
    produtos: ProdutoInput[];
}

interface ItemCalculado {
    input: ProdutoInput;
    tax: TaxResolution;
    vProd: number;
    vBC_ICMS: number;
    vICMS: number;
    vBC_PIS: number;
    vPIS: number;
    vBC_COFINS: number;
    vCOFINS: number;
    vBC_IBSCBS: number;
    vIBS_UF: number;
    vIBS_Mun: number;
    vIBS: number;
    vCBS: number;
    vTotTrib: number;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
function sum(arr: number[]): number {
    return round2(arr.reduce((a, b) => a + b, 0));
}

export function buildNFeXml(args: BuildArgs): { xml: string; chave: string; cDV: number } {
    const cNF = args.cNF ?? randomCNF();
    const dataEmissao = new Date();
    const aamm = aammFromDate(dataEmissao);

    const { chave, cDV } = montarChaveNFe({
        cUF: "22",
        aamm,
        cnpj: args.emitente.CNPJ,
        mod: "55",
        serie: args.serie,
        nNF: args.numeroNfe,
        tpEmis: "1",
        cNF,
    });

    // ── Item calculations ─────────────────────────────────────────────────────
    const itens: ItemCalculado[] = args.produtos.map((p) => {
        const tax = resolveTax({
            NCM: p.NCM,
            CEST: p.CEST,
            override: { CST_ICMS: p.CST_ICMS, origem: p.origem, pICMS: p.pICMS },
        });
        const vProd = round2(p.qCom * p.vUnCom);
        const vBC_ICMS =
            tax.CST_ICMS === "20" && tax.pRedBC
                ? round2(vProd * (1 - tax.pRedBC / 100))
                : vProd;
        const vICMS = round2((vBC_ICMS * tax.pICMS) / 100);
        const vBC_PIS = vProd;
        const vPIS = round2((vBC_PIS * (tax.pPIS ?? 0)) / 100);
        const vBC_COFINS = vProd;
        const vCOFINS = round2((vBC_COFINS * (tax.pCOFINS ?? 0)) / 100);
        const vBC_IBSCBS = vProd;
        const redFactor = 1 - (tax.pRedAliq ?? 0) / 100;
        const pIBS_UF_ef = tax.pRedAliq === 100 ? 0 : tax.pIBS_UF * redFactor;
        const pIBS_Mun_ef = tax.pRedAliq === 100 ? 0 : tax.pIBS_Mun * redFactor;
        const pCBS_ef = tax.pRedAliq === 100 ? 0 : tax.pCBS * redFactor;
        const vIBS_UF = round2((vBC_IBSCBS * pIBS_UF_ef) / 100);
        const vIBS_Mun = round2((vBC_IBSCBS * pIBS_Mun_ef) / 100);
        const vIBS = round2(vIBS_UF + vIBS_Mun);
        const vCBS = round2((vBC_IBSCBS * pCBS_ef) / 100);
        const vTotTrib = round2(vICMS + vPIS + vCOFINS);
        return {
            input: p, tax, vProd, vBC_ICMS, vICMS, vBC_PIS, vPIS,
            vBC_COFINS, vCOFINS, vBC_IBSCBS, vIBS_UF, vIBS_Mun, vIBS, vCBS, vTotTrib,
        };
    });

    const tot = {
        vBC: sum(itens.map((i) => i.vBC_ICMS)),
        vICMS: sum(itens.map((i) => i.vICMS)),
        vProd: sum(itens.map((i) => i.vProd)),
        vPIS: sum(itens.map((i) => i.vPIS)),
        vCOFINS: sum(itens.map((i) => i.vCOFINS)),
        vBCIBSCBS: sum(itens.map((i) => i.vBC_IBSCBS)),
        vIBS_UF: sum(itens.map((i) => i.vIBS_UF)),
        vIBS_Mun: sum(itens.map((i) => i.vIBS_Mun)),
        vIBS: sum(itens.map((i) => i.vIBS)),
        vCBS: sum(itens.map((i) => i.vCBS)),
        vTotTrib: sum(itens.map((i) => i.vTotTrib)),
    };
    const vNF = round2(tot.vProd);

    // ── Build XML document ────────────────────────────────────────────────────
    // Root: plain <NFe> (no nfeProc — this is an internally-generated import
    // document, not a SEFAZ-authorized NF-e, so there is no protocol block).
    const root = create({ version: "1.0", encoding: "UTF-8" })
        .ele("NFe", { xmlns: "http://www.portalfiscal.inf.br/nfe" });

    const infNFe = root.ele("infNFe", { Id: `NFe${chave}`, versao: "4.00" });

    // ── ide ──────────────────────────────────────────────────────────────────
    infNFe.ele("ide")
        .ele("cUF").txt("22").up()
        .ele("cNF").txt(cNF).up()
        .ele("natOp").txt("Venda merc.adq.receb.de terceiros").up()
        .ele("mod").txt("55").up()
        .ele("serie").txt(args.serie).up()
        .ele("nNF").txt(args.numeroNfe).up()
        .ele("dhEmi").txt(isoDateTime(dataEmissao)).up()
        .ele("dhSaiEnt").txt(isoDateTime(dataEmissao)).up()
        .ele("tpNF").txt("1").up()
        .ele("idDest").txt("1").up()
        .ele("cMunFG").txt(String(args.emitente.enderEmit?.cMun ?? 2211001)).up()
        .ele("tpImp").txt("1").up()
        .ele("tpEmis").txt("1").up()
        .ele("cDV").txt(String(cDV)).up()
        .ele("tpAmb").txt("1").up()
        .ele("finNFe").txt("1").up()
        .ele("indFinal").txt("0").up()
        .ele("indPres").txt("9").up()
        .ele("indIntermed").txt("0").up()
        .ele("procEmi").txt("0").up()
        .ele("verProc").txt("GeraNota 2.0").up()
        .up(); // </ide>

    // ── emit ─────────────────────────────────────────────────────────────────
    const emit = infNFe.ele("emit");
    emit.ele("CNPJ").txt(args.emitente.CNPJ).up();
    emit.ele("xNome").txt(args.emitente.xNome).up();
    if (args.emitente.xFant) emit.ele("xFant").txt(args.emitente.xFant).up();
    const enderEmit = emit.ele("enderEmit");
    enderEmit.ele("xLgr").txt(args.emitente.enderEmit.xLgr).up();
    enderEmit.ele("nro").txt(String(args.emitente.enderEmit.nro)).up();
    enderEmit.ele("xBairro").txt(args.emitente.enderEmit.xBairro).up();
    enderEmit.ele("cMun").txt(String(args.emitente.enderEmit.cMun)).up();
    enderEmit.ele("xMun").txt(args.emitente.enderEmit.xMun).up();
    enderEmit.ele("UF").txt(args.emitente.enderEmit.UF).up();
    enderEmit.ele("CEP").txt(String(args.emitente.enderEmit.CEP)).up();
    enderEmit.ele("cPais").txt(String(args.emitente.enderEmit.cPais)).up();
    enderEmit.ele("xPais").txt(args.emitente.enderEmit.xPais).up();
    if (args.emitente.enderEmit.fone) {
        enderEmit.ele("fone").txt(String(args.emitente.enderEmit.fone)).up();
    }
    enderEmit.up(); // </enderEmit>
    if (args.emitente.IE) emit.ele("IE").txt(args.emitente.IE).up();
    emit.ele("CRT").txt(String(args.emitente.CRT)).up();
    emit.up(); // </emit>

    // ── dest ─────────────────────────────────────────────────────────────────
    const dest = infNFe.ele("dest");
    dest.ele("CNPJ").txt(args.destinatario.CNPJ).up();
    dest.ele("xNome").txt(args.destinatario.xNome).up();
    const enderDest = dest.ele("enderDest");
    enderDest.ele("xLgr").txt(args.destinatario.enderDest.xLgr).up();
    enderDest.ele("nro").txt(String(args.destinatario.enderDest.nro)).up();
    if (args.destinatario.enderDest.xCpl) {
        enderDest.ele("xCpl").txt(args.destinatario.enderDest.xCpl).up();
    }
    enderDest.ele("xBairro").txt(args.destinatario.enderDest.xBairro).up();
    enderDest.ele("cMun").txt(String(args.destinatario.enderDest.cMun)).up();
    enderDest.ele("xMun").txt(args.destinatario.enderDest.xMun).up();
    enderDest.ele("UF").txt(args.destinatario.enderDest.UF).up();
    enderDest.ele("CEP").txt(String(args.destinatario.enderDest.CEP)).up();
    enderDest.ele("cPais").txt(String(args.destinatario.enderDest.cPais)).up();
    enderDest.ele("xPais").txt(args.destinatario.enderDest.xPais).up();
    enderDest.ele("fone").txt(String(args.destinatario.enderDest.fone)).up();
    enderDest.up(); // </enderDest>
    dest.ele("indIEDest").txt(String(args.destinatario.indIEDest)).up();
    dest.ele("IE").txt(args.destinatario.IE).up();
    if (args.destinatario.email) dest.ele("email").txt(args.destinatario.email).up();
    dest.up(); // </dest>

    // ── det (one per product) ────────────────────────────────────────────────
    itens.forEach((it, idx) => {
        const det = infNFe.ele("det", { nItem: String(idx + 1) });

        const prod = det.ele("prod");
        prod.ele("cProd").txt(it.input.cProd ?? String(idx + 1)).up();
        prod.ele("cEAN").txt(it.input.cEAN || "SEM GTIN").up();
        prod.ele("xProd").txt(it.input.xProd).up();
        prod.ele("NCM").txt(it.input.NCM ?? "30049069").up();
        if (it.input.CEST) prod.ele("CEST").txt(it.input.CEST).up();
        prod.ele("CFOP").txt(it.input.CFOP ?? it.tax.CFOP_saida).up();
        prod.ele("uCom").txt(it.input.uCom).up();
        prod.ele("qCom").txt(qty(it.input.qCom)).up();
        prod.ele("vUnCom").txt(unit(it.input.vUnCom)).up();
        prod.ele("vProd").txt(money(it.vProd)).up();
        prod.ele("cEANTrib").txt(it.input.cEAN || "SEM GTIN").up();
        prod.ele("uTrib").txt(it.input.uCom).up();
        prod.ele("qTrib").txt(qty(it.input.qCom)).up();
        prod.ele("vUnTrib").txt(unit(it.input.vUnCom)).up();
        prod.ele("indTot").txt("1").up();
        prod.up(); // </prod>

        const imposto = det.ele("imposto");
        imposto.ele("vTotTrib").txt(money(it.vTotTrib)).up();

        // ICMS
        const icms = imposto.ele("ICMS");
        if (it.tax.CST_ICMS === "20") {
            icms.ele("ICMS20")
                .ele("orig").txt(String(it.tax.origem)).up()
                .ele("CST").txt("20").up()
                .ele("modBC").txt("3").up()
                .ele("pRedBC").txt(percent(it.tax.pRedBC ?? 0)).up()
                .ele("vBC").txt(money(it.vBC_ICMS)).up()
                .ele("pICMS").txt(percent(it.tax.pICMS)).up()
                .ele("vICMS").txt(money(it.vICMS)).up()
                .up();
        } else if (it.tax.CST_ICMS === "60") {
            icms.ele("ICMS60")
                .ele("orig").txt(String(it.tax.origem)).up()
                .ele("CST").txt("60").up()
                .ele("vBCSTRet").txt(money(0)).up()
                .ele("pST").txt(percent(it.tax.pICMS)).up()
                .ele("vICMSSubstituto").txt(money(0)).up()
                .ele("vICMSSTRet").txt(money(0)).up()
                .up();
        } else {
            icms.ele("ICMS00")
                .ele("orig").txt(String(it.tax.origem)).up()
                .ele("CST").txt("00").up()
                .ele("modBC").txt("3").up()
                .ele("vBC").txt(money(it.vBC_ICMS)).up()
                .ele("pICMS").txt(percent(it.tax.pICMS)).up()
                .ele("vICMS").txt(money(it.vICMS)).up()
                .up();
        }
        icms.up(); // </ICMS>

        // IPI (NT)
        imposto.ele("IPI")
            .ele("cEnq").txt("999").up()
            .ele("IPINT").ele("CST").txt("51").up().up()
            .up(); // </IPI>

        // PIS
        const pis = imposto.ele("PIS");
        if (["04", "06", "08", "09"].includes(it.tax.CST_PIS)) {
            pis.ele("PISNT").ele("CST").txt(it.tax.CST_PIS).up().up();
        } else {
            pis.ele("PISAliq")
                .ele("CST").txt(it.tax.CST_PIS).up()
                .ele("vBC").txt(money(it.vBC_PIS)).up()
                .ele("pPIS").txt(percent(it.tax.pPIS ?? 0)).up()
                .ele("vPIS").txt(money(it.vPIS)).up()
                .up();
        }
        pis.up(); // </PIS>

        // COFINS
        const cofins = imposto.ele("COFINS");
        if (["04", "06", "08", "09"].includes(it.tax.CST_COFINS)) {
            cofins.ele("COFINSNT").ele("CST").txt(it.tax.CST_COFINS).up().up();
        } else {
            cofins.ele("COFINSAliq")
                .ele("CST").txt(it.tax.CST_COFINS).up()
                .ele("vBC").txt(money(it.vBC_COFINS)).up()
                .ele("pCOFINS").txt(percent(it.tax.pCOFINS ?? 0)).up()
                .ele("vCOFINS").txt(money(it.vCOFINS)).up()
                .up();
        }
        cofins.up(); // </COFINS>

        // IBS/CBS (Reforma Tributária — NF-e 4.00 supplemental)
        const ibsCbs = imposto.ele("IBSCBS");
        ibsCbs.ele("CST").txt(it.tax.ibsCbsCST).up();
        ibsCbs.ele("cClassTrib").txt(it.tax.ibsCbsClass).up();
        const gIBSCBS = ibsCbs.ele("gIBSCBS");
        gIBSCBS.ele("vBC").txt(money(it.vBC_IBSCBS)).up();

        const gIBSUF = gIBSCBS.ele("gIBSUF");
        gIBSUF.ele("pIBSUF").txt(percent(it.tax.pIBS_UF)).up();
        if (it.tax.pRedAliq && it.tax.pRedAliq > 0) {
            gIBSUF.ele("gRed")
                .ele("pRedAliq").txt(percent(it.tax.pRedAliq)).up()
                .ele("pAliqEfet").txt(percent(it.tax.pIBS_UF * (1 - it.tax.pRedAliq / 100))).up()
                .up();
        }
        gIBSUF.ele("vIBSUF").txt(money(it.vIBS_UF)).up();
        gIBSUF.up(); // </gIBSUF>

        const gIBSMun = gIBSCBS.ele("gIBSMun");
        gIBSMun.ele("pIBSMun").txt(percent(it.tax.pIBS_Mun)).up();
        if (it.tax.pRedAliq && it.tax.pRedAliq > 0) {
            gIBSMun.ele("gRed")
                .ele("pRedAliq").txt(percent(it.tax.pRedAliq)).up()
                .ele("pAliqEfet").txt(percent(it.tax.pIBS_Mun * (1 - it.tax.pRedAliq / 100))).up()
                .up();
        }
        gIBSMun.ele("vIBSMun").txt(money(it.vIBS_Mun)).up();
        gIBSMun.up(); // </gIBSMun>

        gIBSCBS.ele("vIBS").txt(money(it.vIBS)).up();

        const gCBS = gIBSCBS.ele("gCBS");
        gCBS.ele("pCBS").txt(percent(it.tax.pCBS)).up();
        if (it.tax.pRedAliq && it.tax.pRedAliq > 0) {
            gCBS.ele("gRed")
                .ele("pRedAliq").txt(percent(it.tax.pRedAliq)).up()
                .ele("pAliqEfet").txt(percent(it.tax.pCBS * (1 - it.tax.pRedAliq / 100))).up()
                .up();
        }
        gCBS.ele("vCBS").txt(money(it.vCBS)).up();
        gCBS.up(); // </gCBS>

        gIBSCBS.up(); // </gIBSCBS>
        ibsCbs.up(); // </IBSCBS>

        imposto.up(); // </imposto>

        det.ele("vItem").txt(money(it.vProd)).up();
        det.up(); // </det>
    });

    // ── total ────────────────────────────────────────────────────────────────
    const total = infNFe.ele("total");
    total.ele("ICMSTot")
        .ele("vBC").txt(money(tot.vBC)).up()
        .ele("vICMS").txt(money(tot.vICMS)).up()
        .ele("vICMSDeson").txt(money(0)).up()
        .ele("vFCP").txt(money(0)).up()
        .ele("vBCST").txt(money(0)).up()
        .ele("vST").txt(money(0)).up()
        .ele("vFCPST").txt(money(0)).up()
        .ele("vFCPSTRet").txt(money(0)).up()
        .ele("vProd").txt(money(tot.vProd)).up()
        .ele("vFrete").txt(money(0)).up()
        .ele("vSeg").txt(money(0)).up()
        .ele("vDesc").txt(money(0)).up()
        .ele("vII").txt(money(0)).up()
        .ele("vIPI").txt(money(0)).up()
        .ele("vIPIDevol").txt(money(0)).up()
        .ele("vPIS").txt(money(tot.vPIS)).up()
        .ele("vCOFINS").txt(money(tot.vCOFINS)).up()
        .ele("vOutro").txt(money(0)).up()
        .ele("vNF").txt(money(vNF)).up()
        .ele("vTotTrib").txt(money(tot.vTotTrib)).up()
        .up(); // </ICMSTot>

    const ibsCbsTot = total.ele("IBSCBSTot");
    ibsCbsTot.ele("vBCIBSCBS").txt(money(tot.vBCIBSCBS)).up();
    const gIBSTot = ibsCbsTot.ele("gIBS");
    gIBSTot.ele("gIBSUF")
        .ele("vDif").txt(money(0)).up()
        .ele("vDevTrib").txt(money(0)).up()
        .ele("vIBSUF").txt(money(tot.vIBS_UF)).up()
        .up();
    gIBSTot.ele("gIBSMun")
        .ele("vDif").txt(money(0)).up()
        .ele("vDevTrib").txt(money(0)).up()
        .ele("vIBSMun").txt(money(tot.vIBS_Mun)).up()
        .up();
    gIBSTot.ele("vIBS").txt(money(tot.vIBS)).up();
    gIBSTot.ele("vCredPres").txt(money(0)).up();
    gIBSTot.ele("vCredPresCondSus").txt(money(0)).up();
    gIBSTot.up(); // </gIBS>
    ibsCbsTot.ele("gCBS")
        .ele("vDif").txt(money(0)).up()
        .ele("vDevTrib").txt(money(0)).up()
        .ele("vCBS").txt(money(tot.vCBS)).up()
        .ele("vCredPres").txt(money(0)).up()
        .ele("vCredPresCondSus").txt(money(0)).up()
        .up(); // </gCBS>
    ibsCbsTot.up(); // </IBSCBSTot>

    total.ele("vNFTot").txt(money(vNF)).up();
    total.up(); // </total>

    // ── transp ───────────────────────────────────────────────────────────────
    infNFe.ele("transp").ele("modFrete").txt("9").up().up();

    // ── pag ──────────────────────────────────────────────────────────────────
    infNFe.ele("pag")
        .ele("detPag")
            .ele("indPag").txt("1").up()
            .ele("tPag").txt("90").up()
            .ele("vPag").txt(money(vNF)).up()
        .up()
    .up(); // </pag>

    // ── infAdic ──────────────────────────────────────────────────────────────
    infNFe.ele("infAdic")
        .ele("infCpl")
            .txt(
                "DOCUMENTO GERADO INTERNAMENTE PARA ENTRADA NO ERP. " +
                "NAO POSSUI VALIDADE FISCAL. NAO E UMA NF-E EMITIDA PELA SEFAZ."
            )
        .up()
    .up(); // </infAdic>

    infNFe.up(); // </infNFe>
    root.up(); // </NFe>

    const xml = root.end({ prettyPrint: true });
    return { xml, chave, cDV };
}
