import { promises as fs } from "fs";
import path from "path";

export interface FornecedorEndereco {
    xLgr?: string;
    nro?: string | number;
    xBairro?: string;
    cMun?: number;
    xMun?: string;
    UF?: string;
    CEP?: number;
    cPais?: number;
    xPais?: string;
    fone?: string;
}

export interface Fornecedor {
    id: number;
    CNPJ: string;
    xNome: string;
    xFant?: string;
    IE?: string;
    CRT?: number;
    enderEmit?: FornecedorEndereco;
}

const isVercel = process.env.VERCEL === "1";
const FILE = isVercel ? "/tmp/fornecedores.json" : path.resolve(__dirname, "../../data/fornecedores.json");
const ORIGINAL_FILE = isVercel
    ? path.resolve(process.cwd(), ".vercel-backend/data/fornecedores.json")
    : path.resolve(__dirname, "../../data/fornecedores.json");

let cache: Fornecedor[] | null = null;

export async function listarFornecedores(): Promise<Fornecedor[]> {
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
        cache = [];
    }
    return cache!;
}

export async function salvarFornecedores(arr: Fornecedor[]): Promise<void> {
    cache = arr;
    await fs.writeFile(FILE, JSON.stringify(arr, null, 2), "utf-8");
}

export async function adicionarOuAtualizarFornecedor(
    f: Omit<Fornecedor, "id"> & { id?: number }
): Promise<Fornecedor> {
    const arr = await listarFornecedores();
    // se já existe pelo CNPJ, atualiza
    const idxByCnpj = arr.findIndex((x) => x.CNPJ === f.CNPJ);
    if (idxByCnpj >= 0) {
        const atualizado = { ...arr[idxByCnpj], ...f, id: arr[idxByCnpj]!.id };
        arr[idxByCnpj] = atualizado;
        await salvarFornecedores(arr);
        return atualizado;
    }
    const novoId = arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    const novo: Fornecedor = { ...f, id: novoId } as Fornecedor;
    arr.push(novo);
    await salvarFornecedores(arr);
    return novo;
}

export async function removerFornecedor(id: number): Promise<void> {
    const arr = await listarFornecedores();
    await salvarFornecedores(arr.filter((f) => f.id !== id));
}

export async function buscarFornecedorPorCNPJ(
    cnpj: string
): Promise<Fornecedor | null> {
    const arr = await listarFornecedores();
    return arr.find((f) => f.CNPJ === cnpj) ?? null;
}
