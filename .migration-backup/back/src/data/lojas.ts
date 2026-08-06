import { promises as fs } from "fs";
import path from "path";

export interface EnderecoDestinatario {
    xLgr: string;
    nro: string | number;
    xCpl?: string;
    xBairro: string;
    cMun: number;
    xMun: string;
    UF: string;
    CEP: number;
    cPais: number;
    xPais: string;
    fone: number | string;
}

export interface Loja {
    id: number;
    CNPJ: string;
    xNome: string;
    enderDest: EnderecoDestinatario;
    indIEDest: number;
    IE: string;
    email?: string;
}

const isVercel = process.env.VERCEL === "1";
const FILE = isVercel ? "/tmp/lojas.json" : path.resolve(__dirname, "../../data/lojas.json");
const ORIGINAL_FILE = path.resolve(__dirname, "../../data/lojas.json");

let cache: Loja[] | null = null;

export async function carregarLojas(): Promise<Loja[]> {
    if (cache) return cache;
    try {
        const txt = await fs.readFile(FILE, "utf-8");
        cache = JSON.parse(txt);
        return cache!;
    } catch (err) {
        if (isVercel) {
            try {
                const orig = await fs.readFile(ORIGINAL_FILE, "utf-8");
                cache = JSON.parse(orig);
                return cache!;
            } catch (err2) {
                console.warn("Não consegui ler lojas.json original no Vercel:", err2);
            }
        }
        console.warn("Não consegui ler lojas.json:", err);
        cache = [];
        return cache;
    }
}

export async function salvarLojas(lojas: Loja[]): Promise<void> {
    cache = lojas;
    await fs.writeFile(FILE, JSON.stringify(lojas, null, 2), "utf-8");
}

export async function getLoja(id: number): Promise<Loja> {
    const todas = await carregarLojas();
    const found = todas.find((l) => l.id === id);
    if (found) return found;
    if (todas.length > 0) return todas[0]!;
    throw new Error("Nenhuma loja cadastrada");
}

export async function proximoIdLoja(): Promise<number> {
    const todas = await carregarLojas();
    return todas.reduce((max, l) => Math.max(max, l.id), 0) + 1;
}
