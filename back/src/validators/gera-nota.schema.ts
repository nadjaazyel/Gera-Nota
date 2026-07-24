import { z } from "zod";

export const produtoInputSchema = z.object({
    xProd: z.string().min(1, "xProd é obrigatório").optional().default(""),
    cEAN: z.string().default("SEM GTIN"),
    NCM: z.string().regex(/^\d{8}$/, "NCM deve ter 8 dígitos").optional(),
    CEST: z.string().regex(/^\d{7}$/).optional(),
    CFOP: z.string().regex(/^\d{4}$/).optional(),
    uCom: z.string().default("UN"),
    qCom: z.coerce.number().positive("Quantidade deve ser maior que zero"),
    vUnCom: z.coerce.number().positive("Valor unitário deve ser maior que zero"),
    cProd: z.string().optional(),
    CST_ICMS: z.string().optional(),
    origem: z.coerce.number().min(0).max(8).optional(),
    pICMS: z.coerce.number().nonnegative().optional(),
});

export const emitenteInputSchema = z.object({
    CNPJ: z.string().regex(/^\d{14}$/, "CNPJ do fornecedor deve ter 14 dígitos"),
    xNome: z.string().optional().default(""),
    xFant: z.string().optional(),
    IE: z.string().optional(),
    CRT: z.coerce.number().min(1).max(4).default(3),
    enderEmit: z
        .object({
            xLgr: z.string().default("ENDERECO NAO INFORMADO"),
            nro: z.union([z.string(), z.number()]).default("SN"),
            xBairro: z.string().default("CENTRO"),
            cMun: z.coerce.number().default(2211001),
            xMun: z.string().default("TERESINA"),
            UF: z.string().length(2).default("PI"),
            CEP: z.coerce.number().default(64000000),
            cPais: z.coerce.number().default(1058),
            xPais: z.string().default("Brasil"),
            fone: z.union([z.string(), z.number()]).optional(),
        })
        .default({}),
});

export const gerarNotaSchema = z
    .object({
        modo: z.enum(["html", "manual", "hibrido"]).default("manual"),
        loja: z.coerce.number().min(1).default(1),
        numeroNfe: z.string().regex(/^\d{1,9}$/, "numeroNfe deve ter até 9 dígitos"),
        codigoNumeroChave: z.string().regex(/^\d{1,8}$/).default("00000001"),
        serie: z.string().regex(/^\d{1,3}$/).default("1"),
        emitente: emitenteInputSchema,
        html: z.string().optional(),
        produtos: z.array(produtoInputSchema).optional(),
    })
    .refine(
        (data) => {
            if (data.modo === "html" && !data.html) return false;
            if (data.modo === "manual" && (!data.produtos || data.produtos.length === 0))
                return false;
            if (data.modo === "hibrido" && !data.html && !data.produtos) return false;
            return true;
        },
        {
            message: "Informe HTML, produtos ou ambos conforme o modo escolhido.",
        }
    );

export type GerarNotaInput = z.infer<typeof gerarNotaSchema>;
export type ProdutoInput = z.infer<typeof produtoInputSchema>;
export type EmitenteInput = z.infer<typeof emitenteInputSchema>;
