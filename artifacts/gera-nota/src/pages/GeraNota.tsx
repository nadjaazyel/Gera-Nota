import { useState } from 'react';
import axios from 'axios';

const BASE = '/api/v1';

interface LojaOption {
  name: string;
  code: number;
}

const LOJAS: LojaOption[] = [
  { name: 'BARRO DURO', code: 1 },
  { name: 'PASSAGEM FRANCA', code: 2 },
  { name: 'SAO FELIX DO PIAUI', code: 3 },
  { name: 'SÃO MIGUEL DA BAIXA GRANDE', code: 4 },
  { name: 'TERESINA', code: 5 },
];

function onlyDigits(val: string): string {
  return val.replace(/\D/g, '');
}

function maskCnpj(raw: string): string {
  const d = onlyDigits(raw).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function maskNfe(raw: string): string {
  const d = onlyDigits(raw).slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0,3)} ${d.slice(3)}`;
  return `${d.slice(0,3)} ${d.slice(3,7)} ${d.slice(7)}`;
}

function maskCodigo(raw: string): string {
  const d = onlyDigits(raw).slice(0, 8);
  if (d.length <= 1) return d;
  if (d.length <= 5) return `${d.slice(0,1)} ${d.slice(1)}`;
  return `${d.slice(0,1)} ${d.slice(1,5)} ${d.slice(5)}`;
}

function downloadXml(xml: string, filename: string) {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function GeraNota() {
  const [cnpj, setCnpj] = useState('');
  const [numeroNfe, setNumeroNfe] = useState('');
  const [codigoNumeroChave, setCodigoNumeroChave] = useState('');
  const [loja, setLoja] = useState<LojaOption | null>(null);
  const [html, setHtml] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const clearForm = (e: React.MouseEvent) => {
    e.preventDefault();
    setCnpj(''); setNumeroNfe(''); setCodigoNumeroChave('');
    setLoja(null); setHtml(''); setErro('');
  };

  const submit = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const cnpjClean = onlyDigits(cnpj);
      const nfeClean = onlyDigits(numeroNfe);
      const codigoClean = onlyDigits(codigoNumeroChave);

      const { data } = await axios.post(`${BASE}/gerar-nota`, {
        modo: 'html',
        loja: loja ? loja.code : 1,
        numeroNfe: nfeClean,
        codigoNumeroChave: codigoClean || '00000001',
        emitente: { CNPJ: cnpjClean },
        html,
      });

      if (data.ok && data.xml) {
        downloadXml(data.xml, `${nfeClean} - ${loja ? loja.name : 'SEM PADRÃO'}.xml`);
      } else {
        setErro(data.erro || 'Erro ao gerar nota.');
      }
    } catch (err: any) {
      setErro(err?.response?.data?.erro || err?.message || 'Ocorreu um erro.');
    } finally {
      setCarregando(false);
    }
  };

  const canSubmit =
    onlyDigits(cnpj).length === 14 &&
    onlyDigits(numeroNfe).length >= 3 &&
    onlyDigits(codigoNumeroChave).length >= 7 &&
    html.trim().length > 0 &&
    loja !== null;

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Gerando NF-e...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Gere aqui sua nota</h1>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 mb-4 text-sm">
          ⚠️ {erro}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="CNPJ do Fornecedor *">
            <input
              type="text"
              inputMode="numeric"
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              className={inputCls}
              maxLength={18}
            />
          </Field>

          <Field label="Número NF-e *">
            <input
              type="text"
              inputMode="numeric"
              value={numeroNfe}
              onChange={(e) => setNumeroNfe(maskNfe(e.target.value))}
              placeholder="000 0000 00"
              className={inputCls}
              maxLength={11}
            />
          </Field>

          <Field label="Código número chave *">
            <input
              type="text"
              inputMode="numeric"
              value={codigoNumeroChave}
              onChange={(e) => setCodigoNumeroChave(maskCodigo(e.target.value))}
              placeholder="0 0000 000"
              className={inputCls}
              maxLength={10}
            />
          </Field>

          <Field label="Loja *">
            <select
              value={loja ? loja.code : ''}
              onChange={(e) => {
                const found = LOJAS.find((l) => l.code === Number(e.target.value));
                setLoja(found ?? null);
              }}
              className={inputCls}
            >
              <option value="">Selecione a loja</option>
              {LOJAS.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="HTML da NFC-e *">
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="Cole aqui o HTML da página de consulta NFC-e da SEFAZ"
              rows={8}
              className={`${inputCls} resize-y font-mono text-xs`}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={clearForm} className={btnSecondary}>
            ✕ Apagar tudo
          </button>
          <button onClick={submit} disabled={!canSubmit} className={canSubmit ? btnPrimary : btnDisabled}>
            ⬇ Gerar Nota
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls = [
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-300',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  'placeholder:text-slate-400 bg-white',
].join(' ');

const btnPrimary = 'px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors';
const btnSecondary = 'px-5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors';
const btnDisabled = 'px-5 py-2 rounded-lg bg-slate-200 text-slate-400 text-sm font-medium cursor-not-allowed';
