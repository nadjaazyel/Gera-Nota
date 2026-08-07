const API = '/api/v1';

function app() {
    return {
        // ── Navegação ──────────────────────────────
        pagina: 'gerar',   // 'gerar' | 'fornecedores' | 'lojas' | 'ean'

        // ── Dados remotos ──────────────────────────
        lojas: [],
        fornecedores: [],
        eanList: [],

        // ── Formulário principal ───────────────────
        loja: 1,
        emit: {
            CNPJ: '', xNome: '', IE: '', CRT: 3,
            enderEmit: { xLgr: 'ENDERECO NAO INFORMADO', nro: 'SN', xBairro: 'CENTRO', cMun: 2211001, xMun: 'TERESINA', UF: 'PI', CEP: 64000000, cPais: 1058, xPais: 'Brasil' }
        },
        numeroNfe: '100001',
        serie: '1',
        codigoNumeroChave: '',
        aba: 'html',
        htmlInput: '',
        produtos: [],

        // ── UI estado ──────────────────────────────
        loading: false,
        erroMsg: '',
        resultado: null,
        extracaoMsg: '',
        extracaoOk: false,

        // ── Autocomplete fornecedor ────────────────
        acSugestoes: [],
        acAberto: false,

        // ── Gestão de Fornecedores ─────────────────
        frmForn: { CNPJ: '', xNome: '', xFant: '', IE: '', CRT: 3, enderEmit: { xMun: '', UF: '' } },
        frnMsg: '',
        frnOk: true,

        // ── Gestão de Lojas ────────────────────────
        frmLoja: { CNPJ: '', xNome: '', IE: '', email: '', indIEDest: 1, enderDest: { xLgr: '', nro: '', xBairro: '', cMun: 0, xMun: '', UF: '', CEP: 0, cPais: 1058, xPais: 'Brasil', fone: '' } },
        lojaMsg: '',
        lojaOk: true,
        editLoja: null,

        // ── Gestão EAN-NCM ─────────────────────────
        eanFrm: { ean: '', NCM: '', xProd: '' },
        eanMsg: '',
        eanOk: true,

        // ══════════════════════════════════════════
        async init() {
            this.gerarCNF();
            await this.carregarLojas();
            await this.carregarFornecedores();
        },

        // ── Lojas ──────────────────────────────────
        async carregarLojas() {
            try {
                const r = await fetch(`${API}/lojas`);
                const d = await r.json();
                this.lojas = d.lojas || [];
                if (this.lojas.length) this.loja = this.lojas[0].id;
            } catch { this.lojas = []; }
        },

        async salvarLoja() {
            this.lojaMsg = '';
            if (!this.frmLoja.CNPJ || !this.frmLoja.xNome) {
                this.lojaMsg = 'CNPJ e Nome são obrigatórios.'; this.lojaOk = false; return;
            }
            const body = { ...this.frmLoja };
            if (this.editLoja) body.id = this.editLoja;
            const r = await fetch(`${API}/lojas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const d = await r.json();
            if (!d.ok) { this.lojaMsg = d.erro || 'Erro'; this.lojaOk = false; return; }
            this.lojaMsg = 'Loja salva com sucesso!'; this.lojaOk = true;
            this.resetFrmLoja();
            await this.carregarLojas();
        },

        editarLoja(l) {
            this.editLoja = l.id;
            this.frmLoja = JSON.parse(JSON.stringify(l));
        },

        async deletarLoja(id) {
            if (!confirm('Remover esta loja?')) return;
            await fetch(`${API}/lojas/${id}`, { method: 'DELETE' });
            await this.carregarLojas();
        },

        resetFrmLoja() {
            this.editLoja = null;
            this.frmLoja = { CNPJ: '', xNome: '', IE: '', email: '', indIEDest: 1, enderDest: { xLgr: '', nro: '', xBairro: '', cMun: 0, xMun: '', UF: '', CEP: 0, cPais: 1058, xPais: 'Brasil', fone: '' } };
        },

        // ── Fornecedores ───────────────────────────
        async carregarFornecedores() {
            try {
                const r = await fetch(`${API}/fornecedores`);
                const d = await r.json();
                this.fornecedores = d.fornecedores || [];
            } catch { this.fornecedores = []; }
        },

        async buscarFornecedorPorCNPJ() {
            const cnpj = this.emit.CNPJ.replace(/\D/g, '');
            if (cnpj.length < 3) { this.acSugestoes = []; this.acAberto = false; return; }
            this.acSugestoes = this.fornecedores.filter(f => f.CNPJ.startsWith(cnpj));
            this.acAberto = this.acSugestoes.length > 0;
            if (cnpj.length === 14) {
                const exato = this.fornecedores.find(f => f.CNPJ === cnpj);
                if (exato) { this.preencherFornecedor(exato); }
            }
        },

        buscarFornecedorPorNome() {
            const nome = this.emit.xNome.trim().toLowerCase();
            if (nome.length < 3) { this.acSugestoes = []; this.acAberto = false; return; }
            this.acSugestoes = this.fornecedores.filter(f => f.xNome.toLowerCase().includes(nome));
            this.acAberto = this.acSugestoes.length > 0;
        },

        preencherFornecedor(f) {
            this.emit.CNPJ = f.CNPJ;
            this.emit.xNome = f.xNome;
            this.emit.IE = f.IE || '';
            this.emit.CRT = f.CRT || 3;
            if (f.enderEmit) {
                this.emit.enderEmit = { ...this.emit.enderEmit, ...f.enderEmit };
            }
            this.acAberto = false;
            this.acSugestoes = [];
        },

        async salvarFornecedorAtual() {
            if (!this.emit.CNPJ || this.emit.CNPJ.length !== 14) return;
            const body = { CNPJ: this.emit.CNPJ, xNome: this.emit.xNome, IE: this.emit.IE, CRT: this.emit.CRT, enderEmit: this.emit.enderEmit };
            await fetch(`${API}/fornecedores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            await this.carregarFornecedores();
        },

        async salvarFornecedor() {
            this.frnMsg = '';
            if (!this.frmForn.CNPJ || !this.frmForn.xNome) {
                this.frnMsg = 'CNPJ e Nome são obrigatórios.'; this.frnOk = false; return;
            }
            const r = await fetch(`${API}/fornecedores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.frmForn) });
            const d = await r.json();
            if (!d.ok) { this.frnMsg = d.erro || 'Erro'; this.frnOk = false; return; }
            this.frnMsg = 'Fornecedor salvo!'; this.frnOk = true;
            this.frmForn = { CNPJ: '', xNome: '', xFant: '', IE: '', CRT: 3, enderEmit: { xMun: '', UF: '' } };
            await this.carregarFornecedores();
        },

        async deletarFornecedor(id) {
            if (!confirm('Remover este fornecedor?')) return;
            await fetch(`${API}/fornecedores/${id}`, { method: 'DELETE' });
            await this.carregarFornecedores();
        },

        // ── EAN-NCM ────────────────────────────────
        async aprenderEan() {
            this.eanMsg = '';
            if (!this.eanFrm.ean || !/^\d{8}$/.test(this.eanFrm.NCM)) {
                this.eanMsg = 'EAN e NCM (8 dígitos) são obrigatórios.'; this.eanOk = false; return;
            }
            const r = await fetch(`${API}/ean/aprender`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.eanFrm) });
            const d = await r.json();
            if (!d.ok) { this.eanMsg = d.erro || 'Erro'; this.eanOk = false; return; }
            this.eanMsg = 'EAN registrado!'; this.eanOk = true;
            this.eanFrm = { ean: '', NCM: '', xProd: '' };
        },

        // ── Produtos ───────────────────────────────
        get totalGeral() {
            return this.produtos.reduce((s, p) => s + (Number(p.qCom) || 0) * (Number(p.vUnCom) || 0), 0);
        },

        addProduto() {
            this.produtos.push({ xProd: '', cEAN: 'SEM GTIN', cProd: '', NCM: '30049069', CFOP: '5102', uCom: 'UN', qCom: 1, vUnCom: 0 });
        },

        removeProduto(idx) { this.produtos.splice(idx, 1); },

        carregarArquivoHtml(event) {
            const file = event.target.files?.[0];
            if (!file) return;
            this.extracaoMsg = 'Lendo arquivo...';
            this.extracaoOk = true;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.htmlInput = e.target.result;
                this.extracaoMsg = `✓ Arquivo "${file.name}" carregado. Clique em Extrair produtos.`;
                this.extracaoOk = true;
                // Extrai automaticamente
                this.extrairDoHtml();
            };
            reader.onerror = () => {
                this.extracaoMsg = 'Erro ao ler o arquivo.';
                this.extracaoOk = false;
            };
            reader.readAsText(file, 'utf-8');
            // Limpa o input para permitir recarregar o mesmo arquivo
            event.target.value = '';
        },

        async extrairDoHtml() {
            this.extracaoMsg = '';
            if (!this.htmlInput.trim()) { this.extracaoMsg = 'Cole o HTML primeiro.'; this.extracaoOk = false; return; }
            try {
                const r = await fetch(`${API}/extrair-html`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: this.htmlInput }) });
                if (!r.ok) throw new Error('Falha ao extrair');
                const data = await r.json();
                if (data.emitente && data.emitente.CNPJ) {
                    const cnpjLimpo = data.emitente.CNPJ.replace(/\D/g, '');
                    this.emit.CNPJ = cnpjLimpo;
                    const exato = this.fornecedores.find(f => f.CNPJ === cnpjLimpo);
                    if (exato) {
                        this.preencherFornecedor(exato);
                    } else {
                        this.emit.xNome = data.emitente.xNome || '';
                    }
                }

                if (!data.produtos?.length) {
                    this.extracaoMsg = 'Fornecedor preenchido, mas nenhum produto reconhecido no HTML. Insira-os manualmente.';
                    this.extracaoOk = false;
                    return;
                }

                this.produtos = data.produtos.map(p => ({ xProd: p.xProd || '', cEAN: p.cEAN || 'SEM GTIN', cProd: p.cProd || '', NCM: p.NCM || '', CFOP: p.CFOP || '5102', uCom: p.uCom || 'UN', qCom: Number(p.qCom) || 0, vUnCom: Number(p.vUnCom) || 0 }));
                
                this.extracaoMsg = `✓ ${this.produtos.length} produto(s) importado(s). Fornecedor preenchido. Confira.`;
                this.extracaoOk = true;
            } catch (e) { this.extracaoMsg = 'Erro: ' + e.message; this.extracaoOk = false; }
        },

        // ── Gerar ──────────────────────────────────
        gerarCNF() {
            this.codigoNumeroChave = String(Math.floor(10_000_000 + Math.random() * 89_999_999));
        },

        validar() {
            if (!this.emit.CNPJ || this.emit.CNPJ.length !== 14) return 'CNPJ do fornecedor inválido (14 dígitos numéricos).';
            if (!this.emit.xNome) return 'Razão social do fornecedor é obrigatória.';
            if (!this.numeroNfe) return 'Número da nota é obrigatório.';
            if (this.produtos.length === 0) return 'Adicione ao menos um produto.';
            for (const [i, p] of this.produtos.entries()) {
                if (!p.qCom || p.qCom <= 0) return `Produto ${i + 1}: quantidade inválida.`;
                if (!p.vUnCom || p.vUnCom <= 0) return `Produto ${i + 1}: valor unitário inválido.`;
            }
            return null;
        },

        async gerar() {
            this.erroMsg = ''; this.resultado = null;
            const erro = this.validar();
            if (erro) { this.erroMsg = erro; return; }
            this.loading = true;
            try {
                await this.salvarFornecedorAtual();
                const payload = {
                    modo: 'manual', loja: this.loja,
                    numeroNfe: this.numeroNfe, codigoNumeroChave: this.codigoNumeroChave, serie: this.serie,
                    emitente: this.emit,
                    produtos: this.produtos.map(p => ({ xProd: p.xProd, cEAN: p.cEAN || 'SEM GTIN', cProd: p.cProd || undefined, NCM: p.NCM, CFOP: p.CFOP || undefined, uCom: p.uCom || 'UN', qCom: Number(p.qCom), vUnCom: Number(p.vUnCom) }))
                };
                const r = await fetch(`${API}/gerar-nota`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await r.json();
                if (!r.ok || !data.ok) {
                    this.erroMsg = data.erro || 'Erro ao gerar XML.';
                    if (data.detalhes) this.erroMsg += ' ' + JSON.stringify(data.detalhes);
                    return;
                }
                this.resultado = data;
                this.baixarXml();
            } catch (e) {
                this.erroMsg = 'Erro de conexão: ' + e.message;
            } finally {
                this.loading = false;
            }
        },

        baixarXml() {
            if (!this.resultado?.xml) return;
            const blob = new Blob([this.resultado.xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `nfe-${this.numeroNfe}-loja${this.loja}.xml`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
        },

        formatBRL(v) {
            return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        },
    };
}
