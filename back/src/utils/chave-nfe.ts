/**
 * Calcula o dígito verificador da chave de acesso NF-e (módulo 11).
 * Recebe a chave SEM o DV (43 dígitos) e devolve o DV (0..9).
 */
export function calcularDV(chave43: string): number {
    if (chave43.length !== 43) {
        throw new Error(
            `Chave para DV deve ter 43 dígitos, recebeu ${chave43.length}`
        );
    }
    const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
    let soma = 0;
    for (let i = chave43.length - 1, p = 0; i >= 0; i--, p++) {
        soma += parseInt(chave43[i]!, 10) * pesos[p % pesos.length]!;
    }
    const resto = soma % 11;
    return resto === 0 || resto === 1 ? 0 : 11 - resto;
}

export interface ChaveNFeParts {
    cUF: string;        // 2 dígitos (22 = PI)
    aamm: string;       // 4 dígitos
    cnpj: string;       // 14 dígitos
    mod: string;        // 2 dígitos (55)
    serie: string;      // 3 dígitos
    nNF: string;        // 9 dígitos
    tpEmis: string;     // 1 dígito
    cNF: string;        // 8 dígitos
}

export function montarChaveNFe(parts: ChaveNFeParts): { chave: string; cDV: number } {
    const base =
        parts.cUF.padStart(2, "0") +
        parts.aamm.padStart(4, "0") +
        parts.cnpj.padStart(14, "0") +
        parts.mod.padStart(2, "0") +
        parts.serie.padStart(3, "0") +
        parts.nNF.padStart(9, "0") +
        parts.tpEmis.padStart(1, "0") +
        parts.cNF.padStart(8, "0");

    if (base.length !== 43) {
        throw new Error(`Base da chave inválida: ${base} (${base.length} dígitos)`);
    }
    const cDV = calcularDV(base);
    return { chave: base + cDV, cDV };
}

export function aammFromDate(d = new Date()): string {
    const aa = String(d.getFullYear()).slice(2, 4);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return aa + mm;
}
