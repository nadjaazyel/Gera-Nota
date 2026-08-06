/**
 * Regras tributárias centralizadas.
 *
 * IMPORTANTE: este projeto NÃO emite nota fiscal real para a SEFAZ.
 * Os valores aqui são uma aproximação razoável para entrada no ERP interno.
 */

export interface TaxResolution {
    origem: number;
    CST_ICMS: string;
    pICMS: number;
    pRedBC?: number;
    CFOP_saida: string;
    CST_PIS: string;
    CST_COFINS: string;
    pPIS?: number;
    pCOFINS?: number;
    ibsCbsCST: string;
    ibsCbsClass: string;
    pIBS_UF: number;
    pIBS_Mun: number;
    pCBS: number;
    pRedAliq?: number;
}

const DEFAULT: TaxResolution = {
    origem: 0,
    CST_ICMS: "00",
    pICMS: 22.5,
    CFOP_saida: "5102",
    CST_PIS: "01",
    CST_COFINS: "01",
    pPIS: 1.65,
    pCOFINS: 7.6,
    ibsCbsCST: "000",
    ibsCbsClass: "000001",
    pIBS_UF: 0.1,
    pIBS_Mun: 0,
    pCBS: 0.9,
};

const byChapter: Record<string, Partial<TaxResolution>> = {
    "30": {
        CST_ICMS: "20",
        pICMS: 22.5,
        pRedBC: 78.42,
        CFOP_saida: "5403",
        CST_PIS: "04",
        CST_COFINS: "04",
        pPIS: 0,
        pCOFINS: 0,
        ibsCbsCST: "200",
        ibsCbsClass: "200009",
        pRedAliq: 100,
    },
    "33": {
        CST_ICMS: "00",
        pICMS: 27,
        CFOP_saida: "5102",
        CST_PIS: "04",
        CST_COFINS: "04",
        pPIS: 0,
        pCOFINS: 0,
    },
    "34": {
        CST_ICMS: "00",
        pICMS: 22.5,
        CFOP_saida: "5102",
    },
    "27": {
        CST_ICMS: "00",
        pICMS: 17,
    },
    "19": {
        CST_ICMS: "00",
        pICMS: 22.5,
        CFOP_saida: "5102",
        CST_PIS: "06",
        CST_COFINS: "06",
        pPIS: 0,
        pCOFINS: 0,
    },
    "21": {
        CST_ICMS: "00",
        pICMS: 22.5,
        CFOP_saida: "5102",
        CST_PIS: "01",
        CST_COFINS: "01",
    },
    "22": {
        CST_ICMS: "00",
        pICMS: 27,
    },
};

function mergeDefined<T extends object>(...sources: Array<Partial<T> | undefined>): T {
    const result: any = {};
    for (const src of sources) {
        if (!src) continue;
        for (const key of Object.keys(src)) {
            const v = (src as any)[key];
            if (v !== undefined) result[key] = v;
        }
    }
    return result as T;
}

export function resolveTax(input: {
    NCM: string;
    CEST?: string;
    override?: Partial<TaxResolution>;
}): TaxResolution {
    const chapter = (input.NCM ?? "").slice(0, 2);
    const fromChapter = byChapter[chapter] ?? {};
    return mergeDefined<TaxResolution>(DEFAULT, fromChapter, input.override);
}
