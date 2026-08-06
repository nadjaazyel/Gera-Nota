import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Login } from './pages/Login';

const API = '/api/v1';

type Loja = { id: number; CNPJ: string; xNome: string; IE: string; email?: string; indIEDest: number; enderDest: Record<string, any> };
type Fornecedor = { id: number; CNPJ: string; xNome: string; xFant?: string; IE?: string; CRT?: number; enderEmit?: Record<string, any> };
type Produto = { cProd: string; xProd: string; cEAN: string; NCM: string; CFOP: string; uCom: string; qCom: number; vUnCom: number };

const enderecoEmitPadrao = { xLgr: 'ENDERECO NAO INFORMADO', nro: 'SN', xBairro: 'CENTRO', cMun: 2211001, xMun: 'TERESINA', UF: 'PI', CEP: 64000000, cPais: 1058, xPais: 'Brasil' };
const novaLoja = () => ({ CNPJ: '', xNome: '', IE: '', email: '', indIEDest: 1, enderDest: { xLgr: '', nro: '', xBairro: '', cMun: 0, xMun: '', UF: '', CEP: 0, cPais: 1058, xPais: 'Brasil', fone: '' } });
const novoFornecedor = () => ({ CNPJ: '', xNome: '', xFant: '', IE: '', CRT: 3, enderEmit: { xMun: '', UF: '' } });
const novoProduto = (): Produto => ({ cProd: '', xProd: '', cEAN: 'SEM GTIN', NCM: '30049069', CFOP: '5102', uCom: 'UN', qCom: 1, vUnCom: 0 });

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a operação.');
  return data;
}
const field = (value: unknown) => String(value ?? '');

export default function App() {
  const [auth, setAuth] = useState<'checking' | 'yes' | 'no'>('checking');
  const [page, setPage] = useState<'gerar' | 'fornecedores' | 'lojas' | 'ean'>('gerar');
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [emit, setEmit] = useState<any>({ CNPJ: '', xNome: '', IE: '', CRT: 3, enderEmit: enderecoEmitPadrao });
  const [numeroNfe, setNumeroNfe] = useState('100001');
  const [serie, setSerie] = useState('1');
  const [cnf, setCnf] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fornForm, setFornForm] = useState<any>(novoFornecedor());
  const [lojaForm, setLojaForm] = useState<any>(novaLoja());
  const [editingLoja, setEditingLoja] = useState<number | null>(null);
  const [ean, setEan] = useState({ ean: '', NCM: '', xProd: '' });

  const load = async () => {
    const [l, f] = await Promise.all([request('/lojas'), request('/fornecedores')]);
    setLojas(l.lojas ?? []); setFornecedores(f.fornecedores ?? []);
    setLojaId(current => current ?? l.lojas?.[0]?.id ?? null);
  };
  useEffect(() => {
    fetch('/api/auth/status', { credentials: 'include' }).then(r => r.json()).then(d => setAuth(d.authenticated ? 'yes' : 'no')).catch(() => setAuth('no'));
  }, []);
  useEffect(() => { if (auth === 'yes') { setCnf(String(Math.floor(10_000_000 + Math.random() * 89_999_999))); load().catch(e => setMessage({ text: e.message, ok: false })); } }, [auth]);

  const total = useMemo(() => produtos.reduce((n, p) => n + Number(p.qCom || 0) * Number(p.vUnCom || 0), 0), [produtos]);
  const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const updateProduto = (index: number, key: keyof Produto, value: any) => setProdutos(ps => ps.map((p, i) => i === index ? { ...p, [key]: value } : p));
  const chooseFornecedor = (f: Fornecedor) => setEmit((old: any) => ({ ...old, CNPJ: f.CNPJ, xNome: f.xNome, IE: f.IE || '', CRT: f.CRT || 3, enderEmit: { ...old.enderEmit, ...(f.enderEmit || {}) } }));

  const importHtml = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const html = await file.text(); const data = await request('/extrair-html', { method: 'POST', body: JSON.stringify({ html }) });
      if (data.emitente?.CNPJ) {
        const found = fornecedores.find(f => f.CNPJ === String(data.emitente.CNPJ).replace(/\D/g, ''));
        found ? chooseFornecedor(found) : setEmit((old: any) => ({ ...old, CNPJ: String(data.emitente.CNPJ).replace(/\D/g, ''), xNome: data.emitente.xNome || old.xNome }));
      }
      setProdutos((data.produtos || []).map((p: any) => ({ ...novoProduto(), ...p, qCom: Number(p.qCom) || 0, vUnCom: Number(p.vUnCom) || 0 })));
      setMessage({ text: `✓ ${data.produtos?.length || 0} produto(s) importado(s). Confira os dados.`, ok: true });
    } catch (e: any) { setMessage({ text: e.message, ok: false }); }
    event.target.value = '';
  };
  const generate = async () => {
    setMessage(null); setResult(null);
    if (!lojaId || emit.CNPJ.replace(/\D/g, '').length !== 14 || !emit.xNome || !numeroNfe || !produtos.length) return setMessage({ text: 'Preencha loja, fornecedor, número da nota e ao menos um produto.', ok: false });
    if (produtos.some(p => !p.xProd || !p.NCM || Number(p.qCom) <= 0 || Number(p.vUnCom) <= 0)) return setMessage({ text: 'Preencha descrição, NCM, quantidade e valor de todos os produtos.', ok: false });
    setLoading(true);
    try {
      await request('/fornecedores', { method: 'POST', body: JSON.stringify({ ...emit, CNPJ: emit.CNPJ.replace(/\D/g, '') }) });
      const data = await request('/gerar-nota', { method: 'POST', body: JSON.stringify({ modo: 'manual', loja: lojaId, numeroNfe, serie, codigoNumeroChave: cnf, emitente: { ...emit, CNPJ: emit.CNPJ.replace(/\D/g, '') }, produtos }) });
      setResult(data); setMessage({ text: 'XML gerado com sucesso!', ok: true }); load();
      download(data.xml, `nfe-${numeroNfe}-loja${lojaId}.xml`);
    } catch (e: any) { setMessage({ text: e.message, ok: false }); } finally { setLoading(false); }
  };
  const download = (xml: string, name: string) => { const u = URL.createObjectURL(new Blob([xml], { type: 'application/xml' })); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); };
  const saveFornecedor = async () => { try { await request('/fornecedores', { method: 'POST', body: JSON.stringify(fornForm) }); setFornForm(novoFornecedor()); setMessage({ text: 'Fornecedor salvo!', ok: true }); load(); } catch (e: any) { setMessage({ text: e.message, ok: false }); } };
  const saveLoja = async () => { try { await request('/lojas', { method: 'POST', body: JSON.stringify(editingLoja ? { ...lojaForm, id: editingLoja } : lojaForm) }); setLojaForm(novaLoja()); setEditingLoja(null); setMessage({ text: 'Loja salva!', ok: true }); load(); } catch (e: any) { setMessage({ text: e.message, ok: false }); } };

  if (auth === 'checking') return <main className="loading">Carregando…</main>;
  if (auth === 'no') return <Login onLogin={() => setAuth('yes')} />;
  const suggestions = fornecedores.filter(f => f.CNPJ.startsWith(emit.CNPJ.replace(/\D/g, ''))).slice(0, 5);
  return <div>
    <nav className="nav"><div className="nav-brand">⚡ GeraNota</div>
      {([['gerar','📄 Gerar NF-e'],['fornecedores','🏭 Fornecedores'],['lojas','🏪 Lojas'],['ean','🏷️ EAN-NCM']] as const).map(([key, label]) => <button key={key} className={`nav-tab ${page === key ? 'active' : ''}`} onClick={() => setPage(key)}>{label}</button>)}
      <button className="logout" onClick={() => fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => setAuth('no'))}>Sair</button>
    </nav>
    <main className="page">
      {message && <div className={`alert ${message.ok ? 'alert-success' : 'alert-error'}`}>{message.text}</div>}
      {page === 'gerar' && <><section className="card"><h2>🏪 1. Para qual loja é a entrada?</h2><div className="grid-4">{lojas.map(l => <button key={l.id} className={`loja-btn ${lojaId === l.id ? 'selected' : ''}`} onClick={() => setLojaId(l.id)}><small>ID {l.id}</small><b>{l.xNome}</b><span>{l.enderDest?.xMun} - {l.enderDest?.UF}</span></button>)}</div></section>
        <section className="card"><h2>🏭 2. Quem vendeu para você?</h2><div className="grid-3"><div className="autocomplete"><Label name="CNPJ do fornecedor *"><input value={emit.CNPJ} maxLength={14} onChange={e => setEmit({ ...emit, CNPJ: e.target.value.replace(/\D/g, '') })} /></Label>{emit.CNPJ.length >= 3 && suggestions.length > 0 && <div className="autocomplete-list">{suggestions.map(f => <button key={f.id} onMouseDown={() => chooseFornecedor(f)}>{f.xNome}<small>{f.CNPJ}</small></button>)}</div>}</div><Label name="Razão Social *" wide><input value={emit.xNome} onChange={e => setEmit({ ...emit, xNome: e.target.value })} /></Label><Label name="Inscrição Estadual"><input value={emit.IE} onChange={e => setEmit({ ...emit, IE: e.target.value })} /></Label><Label name="Cidade"><input value={emit.enderEmit.xMun} onChange={e => setEmit({ ...emit, enderEmit: { ...emit.enderEmit, xMun: e.target.value } })} /></Label><Label name="UF"><input maxLength={2} value={emit.enderEmit.UF} onChange={e => setEmit({ ...emit, enderEmit: { ...emit.enderEmit, UF: e.target.value.toUpperCase() } })} /></Label></div><p className="alert alert-info">💡 O fornecedor é salvo automaticamente ao gerar a nota. Você pode gerenciá-los na aba <b>Fornecedores</b>.</p></section>
        <section className="card"><h2>🔢 3. Numeração da nota</h2><div className="grid-3"><Label name="Número *"><input value={numeroNfe} onChange={e => setNumeroNfe(e.target.value.replace(/\D/g, ''))} /></Label><Label name="Série"><input value={serie} onChange={e => setSerie(e.target.value.replace(/\D/g, ''))} /></Label><Label name="Código aleatório (cNF)"><div className="with-button"><input value={cnf} onChange={e => setCnf(e.target.value.replace(/\D/g, '').slice(0,8))} /><button className="btn btn-ghost" onClick={() => setCnf(String(Math.floor(10_000_000 + Math.random() * 89_999_999)))}>↻</button></div></Label></div></section>
        <Products produtos={produtos} update={updateProduto} remove={(i: number) => setProdutos(p => p.filter((_, j) => j !== i))} add={() => setProdutos(p => [...p, novoProduto()])} importHtml={importHtml} total={total} brl={brl} />
        <section className="card"><button className="btn btn-primary btn-full" disabled={loading} onClick={generate}>{loading ? 'Gerando…' : '🚀 Gerar XML e baixar'}</button>{result && <div className="result-box">✅ XML gerado com sucesso!<br/><small>Chave: {result.chave}</small><br/><button className="btn btn-success btn-sm" onClick={() => download(result.xml, `nfe-${numeroNfe}-loja${lojaId}.xml`)}>⬇ Baixar XML novamente</button></div>}</section></>}
      {page === 'fornecedores' && <><section className="card"><h2>🏭 Cadastro de Fornecedores</h2><FornecedorForm form={fornForm} setForm={setFornForm}/><button className="btn btn-primary" onClick={saveFornecedor}>💾 Salvar Fornecedor</button></section><section className="card"><h2>📋 Fornecedores Cadastrados <em>{fornecedores.length}</em></h2><table className="tbl"><thead><tr><th>CNPJ</th><th>Razão Social</th><th>IE</th><th>Cidade/UF</th><th/></tr></thead><tbody>{fornecedores.map(f => <tr key={f.id}><td>{f.CNPJ}</td><td>{f.xNome}</td><td>{f.IE || '—'}</td><td>{f.enderEmit?.xMun || ''} - {f.enderEmit?.UF || ''}</td><td><button className="btn btn-danger btn-sm" onClick={() => request(`/fornecedores/${f.id}`, {method:'DELETE'}).then(load)}>✕</button></td></tr>)}</tbody></table></section></>}
      {page === 'lojas' && <Lojas form={lojaForm} setForm={setLojaForm} save={saveLoja} lojas={lojas} edit={(l: Loja) => {setEditingLoja(l.id); setLojaForm(structuredClone(l));}} remove={(id: number) => request(`/lojas/${id}`, {method:'DELETE'}).then(load)} editing={!!editingLoja}/>}
      {page === 'ean' && <section className="card"><h2>🏷️ Registrar EAN → NCM</h2><p>Ao cadastrar um EAN com seu NCM, o sistema preencherá automaticamente o NCM na próxima vez que esse produto aparecer.</p><div className="grid-3"><Label name="EAN / GTIN *"><input value={ean.ean} onChange={e=>setEan({...ean,ean:e.target.value})}/></Label><Label name="NCM * (8 dígitos)"><input value={ean.NCM} maxLength={8} onChange={e=>setEan({...ean,NCM:e.target.value})}/></Label><Label name="Descrição"><input value={ean.xProd} onChange={e=>setEan({...ean,xProd:e.target.value})}/></Label></div><button className="btn btn-primary" onClick={() => request('/ean/aprender',{method:'POST',body:JSON.stringify(ean)}).then(()=>{setEan({ean:'',NCM:'',xProd:''});setMessage({text:'EAN registrado!',ok:true})}).catch(e=>setMessage({text:e.message,ok:false}))}>💾 Registrar EAN</button></section>}
    </main><footer>GeraNota v2.1 — Uso interno. Não substitui emissão fiscal real.</footer>
  </div>;
}

function Label({name, children, wide=false}: any) { return <label className={wide ? 'wide' : ''}>{name}{children}</label> }
function Products({produtos,update,remove,add,importHtml,total,brl}: any) { return <section className="card"><header><h2>📦 4. Produtos <em>{produtos.length} item(s)</em></h2><div><label className="btn btn-primary btn-sm">📂 Importar Arquivo HTML<input type="file" accept=".html,.htm" hidden onChange={importHtml}/></label><button className="btn btn-success btn-sm" onClick={add}>+ Inserir Manual</button></div></header>{!produtos.length ? <div className="empty">📦<br/>Nenhum produto.<small>Importe o arquivo salvo da SEFAZ (Ctrl+S) ou insira manualmente.</small></div> : <div className="table-wrap"><table className="tbl"><thead><tr>{['#','Cód. Forn','Descrição *','EAN','NCM *','CFOP','Un.','Qtd *','Vl.Un *','Total',''].map((x: string)=><th key={x}>{x}</th>)}</tr></thead><tbody>{produtos.map((p:any,i:number)=><tr key={i}><td>{i+1}</td>{(['cProd','xProd','cEAN','NCM','CFOP','uCom'] as const).map(k=><td key={k}><input value={p[k]} onChange={e=>update(i,k,e.target.value)}/></td>)}<td><input type="number" value={p.qCom} onChange={e=>update(i,'qCom',Number(e.target.value))}/></td><td><input type="number" value={p.vUnCom} onChange={e=>update(i,'vUnCom',Number(e.target.value))}/></td><td>{brl(p.qCom*p.vUnCom)}</td><td><button className="x" onClick={()=>remove(i)}>✕</button></td></tr>)}</tbody><tfoot><tr><td colSpan={9}>Total geral:</td><td>{brl(total)}</td><td/></tr></tfoot></table></div>}</section> }
function FornecedorForm({form,setForm}:any) { const u=(k:string,v:string)=>setForm({...form,[k]:v}); return <div className="grid-3 form-gap"><Label name="CNPJ *"><input value={form.CNPJ} onChange={e=>u('CNPJ',e.target.value.replace(/\D/g,''))}/></Label><Label name="Razão Social *"><input value={form.xNome} onChange={e=>u('xNome',e.target.value)}/></Label><Label name="Nome Fantasia"><input value={form.xFant} onChange={e=>u('xFant',e.target.value)}/></Label><Label name="Inscrição Estadual"><input value={form.IE} onChange={e=>u('IE',e.target.value)}/></Label><Label name="Cidade"><input value={form.enderEmit.xMun} onChange={e=>setForm({...form,enderEmit:{...form.enderEmit,xMun:e.target.value}})}/></Label><Label name="UF"><input value={form.enderEmit.UF} onChange={e=>setForm({...form,enderEmit:{...form.enderEmit,UF:e.target.value}})}/></Label></div> }
function Lojas({form,setForm,save,lojas,edit,remove,editing}:any) { const e=(k:string,v:any)=>setForm({...form,enderDest:{...form.enderDest,[k]:v}}); return <><section className="card"><h2>{editing?'✏️ Editar Loja':'🏪 Nova Loja'}</h2><div className="grid-3 form-gap"><Label name="CNPJ *"><input value={form.CNPJ} onChange={x=>setForm({...form,CNPJ:x.target.value})}/></Label><Label name="Razão Social *" wide><input value={form.xNome} onChange={x=>setForm({...form,xNome:x.target.value})}/></Label><Label name="Inscrição Estadual"><input value={form.IE} onChange={x=>setForm({...form,IE:x.target.value})}/></Label>{[['xLgr','Logradouro'],['nro','Número'],['xBairro','Bairro'],['xMun','Cidade'],['UF','UF'],['CEP','CEP'],['cMun','Código do Município'],['fone','Fone']].map(([k,n]: [string, string])=><Label key={k} name={n}><input value={field(form.enderDest[k])} onChange={x=>e(k,x.target.value)}/></Label>)}</div><button className="btn btn-primary" onClick={save}>💾 Salvar Loja</button></section><section className="card"><h2>📋 Lojas Cadastradas</h2><table className="tbl"><thead><tr><th>ID</th><th>CNPJ</th><th>Nome</th><th>Cidade/UF</th><th/><th/></tr></thead><tbody>{lojas.map((l:Loja)=><tr key={l.id}><td>{l.id}</td><td>{l.CNPJ}</td><td>{l.xNome}</td><td>{l.enderDest?.xMun} - {l.enderDest?.UF}</td><td><button className="btn btn-ghost btn-sm" onClick={()=>edit(l)}>✏️</button></td><td><button className="btn btn-danger btn-sm" onClick={()=>remove(l.id)}>✕</button></td></tr>)}</tbody></table></section></> }