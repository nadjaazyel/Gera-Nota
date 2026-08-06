import { useState } from 'react';

import img1 from '../assets/imagens-tutorial/1.png';
import img2 from '../assets/imagens-tutorial/2.png';
import img3 from '../assets/imagens-tutorial/3.png';
import img4 from '../assets/imagens-tutorial/4.png';
import img5 from '../assets/imagens-tutorial/5.png';
import img6 from '../assets/imagens-tutorial/6.png';
import img7 from '../assets/imagens-tutorial/7.png';

const IMAGES = [img1, img2, img3, img4, img5, img6, img7];

export function Instrucoes() {
  const [showGallery, setShowGallery] = useState(false);
  const [current, setCurrent] = useState(0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Instruções</h1>

      {/* Tutorial gallery dialog */}
      {showGallery && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowGallery(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Como copiar o HTML da NFC-e</h2>
              <button
                onClick={() => setShowGallery(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <img
              src={IMAGES[current]}
              alt={`Passo ${current + 1}`}
              className="w-full rounded-lg border border-slate-200 mb-4"
            />

            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setCurrent((i) => Math.max(0, i - 1))}
                disabled={current === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-sm text-slate-500">{current + 1} / {IMAGES.length}</span>
              <button
                onClick={() => setCurrent((i) => Math.min(IMAGES.length - 1, i + 1))}
                disabled={current === IMAGES.length - 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Próximo →
              </button>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 flex-wrap justify-center">
              {IMAGES.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Miniatura ${i + 1}`}
                  onClick={() => setCurrent(i)}
                  className={[
                    'w-16 h-12 object-cover rounded cursor-pointer transition-all',
                    current === i ? 'ring-2 ring-blue-700 opacity-100' : 'opacity-60 hover:opacity-90',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Como gerar sua nota</h2>
          <div className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              <strong>1.</strong> Preencha o CNPJ do fornecedor, o número NFE, o Código número chave e selecione a loja.
            </p>
            <p className="text-red-700 font-semibold">
              TODOS OS CAMPOS DEVEM SER PREENCHIDOS PARA OBTER UM BOM RESULTADO!
            </p>
            <p>
              <strong>2.</strong> Preencha o campo HTML com o código da página dos produtos da nota.
              Não há necessidade de formatar, basta copiar e colar.
            </p>
            <p className="flex items-center gap-2 flex-wrap">
              <strong>3.</strong>
              <span>Como copiar o HTML:</span>
              <button
                onClick={() => { setCurrent(0); setShowGallery(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200 rounded-full hover:bg-blue-50 transition-colors"
              >
                🔍 Ver tutorial
              </button>
            </p>
          </div>
        </section>

        <hr className="border-slate-200" />

        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Observações</h2>
          <div className="text-sm text-slate-600 leading-loose space-y-1">
            <p>
              <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">05.570.714/0008-25</code>
              {' '}— CNPJ da empresa (14 dígitos, sem pontuação ao enviar)
            </p>
            <p>
              <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">005 9146 62</code>
              {' '}— Número da NF-e (9 dígitos)
            </p>
            <p>
              <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">1 3308 296</code>
              {' '}— Código numérico da chave (8 dígitos)
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
