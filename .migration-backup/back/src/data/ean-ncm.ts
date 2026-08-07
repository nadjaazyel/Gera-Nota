import { promises as fs } from "fs";
import path from "path";

interface EanNcmData {
    _default: { NCM: string; descricao?: string };
    _byPrefix: Record<string, string>;
    byEan: Record<string, { NCM: string; xProd?: string }>;
}

const isVercel = process.env.VERCEL === "1";
const FILE = isVercel ? "/tmp/ean-ncm.json" : path.resolve(__dirname, "../../data/ean-ncm.json");

const ORIGINAL_FILE = isVercel
    ? path.resolve(process.cwd(), ".vercel-backend/data/ean-ncm.json")
    : path.resolve(__dirname, "../../data/ean-ncm.json");

let cache: EanNcmData | null = null;

async function load(): Promise<EanNcmData> {
    if (cache) return cache;
    try {
        const txt = await fs.readFile(FILE, "utf-8");
        cache = JSON.parse(txt);
    } catch {
        if (isVercel) {
            try {
                const orig = await fs.readFile(ORIGINAL_FILE, "utf-8");
                cache = JSON.parse(orig);
                return cache!;
            } catch {
                // ignore
            }
        }
        cache = { _default: { NCM: "30049069" }, _byPrefix: {}, byEan: {} };
    }
    return cache!;
}

async function save(): Promise<void> {
    if (!cache) return;
    await fs.writeFile(FILE, JSON.stringify(cache, null, 2), "utf-8");
}

/**
 * Sugere NCM para um EAN. Se não conhece, devolve o default.
 */
export async function sugerirNcm(
    ean: string | undefined
): Promise<{ NCM: string; xProd?: string; origem: "ean" | "default" }> {
    const data = await load();
    if (ean && data.byEan[ean]) {
        return { ...data.byEan[ean]!, origem: "ean" };
    }
    return { NCM: data._default.NCM, origem: "default" };
}

/**
 * Aprende: registra que um EAN tem determinado NCM (e descrição).
 */
export async function aprenderEan(
    ean: string,
    NCM: string,
    xProd?: string
): Promise<void> {
    if (!ean || ean === "SEM GTIN" || !NCM) return;
    const data = await load();
    data.byEan[ean] = { NCM, ...(xProd ? { xProd } : {}) };
    await save();
}
