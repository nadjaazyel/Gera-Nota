import { useState } from "react";
import { InputMask } from "primereact/inputmask";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import "./gera-nota.css";
import { geraNota } from "../../services/api-nota";
import fileDownload from "js-file-download";
import { ProgressSpinner } from 'primereact/progressspinner';

export function GeraNota() {
  const [cnpj, setCnpj] = useState();
  const [numeroNfe, setNumeroNfe] = useState();
  const [codigoNumeroChave, setCodigoNumeroChave] = useState();
  const [loja, setLoja] = useState();
  const [html, setHtml] = useState();
  const [carregando, setCarregando] = useState(false);

  const cities = [
    { name: "BARRO DURO", code: 1 },
    { name: "PASSAGEM FRANCA", code: 2 },
    { name: "SAO FELIX DO PIAUI", code: 3 },
    { name: "SÃO MIGUEL DA BAIXA GRANDE", code: 4 },
  ];

  const clearForm = (e) => {
    e.preventDefault();
    setCnpj(null);
    setNumeroNfe(null);
    setCodigoNumeroChave(null);
    setLoja(null);
    setHtml("");
  };
  const submit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const xml = await geraNota(
        cnpj
          .replaceAll(".", "")
          .replaceAll("-", "")
          .replaceAll("/", "")
          .replaceAll(" ", ""),
        numeroNfe
          .replaceAll(".", "")
          .replaceAll("-", "")
          .replaceAll("/", "")
          .replaceAll(" ", ""),
        codigoNumeroChave
          .replaceAll(".", "")
          .replaceAll("-", "")
          .replaceAll("/", "")
          .replaceAll(" ", ""),
        loja ? loja.code : null,
        html
      );
      fileDownload(
        xml,
        `${numeroNfe} - ${loja ? loja.name : "SEM PADRÃO"}.xml`
      );
      setCarregando(false);
    } catch (err) {
      alert("Ocorreu um erro.");
      setCarregando(false);
    }
  };

  return (
    <>
      {!carregando ? (
        <div className="content-gera-nota">
          <h1>Gere aqui sua nota</h1>
          <div className="formulario-gera-nota">
            <InputMask
              mask="99.999.999/9999-99"
              slotChar="__.___.___/____-__"
              value={cnpj}
              onChange={(e) => setCnpj(e.value)}
              placeholder="CNPJ Fornecedor"
              autoClear={false}
              required
            ></InputMask>

            <InputMask
              mask="999 9999 99"
              slotChar="_________"
              value={numeroNfe}
              onChange={(e) => setNumeroNfe(e.value)}
              placeholder="Número NFE"
              autoClear={false}
              required
            ></InputMask>

            <InputMask
              mask="9 9999 999"
              slotChar="________"
              value={codigoNumeroChave}
              onChange={(e) => setCodigoNumeroChave(e.value)}
              placeholder="Código número chave"
              autoClear={false}
              required
            ></InputMask>

            <Dropdown
              optionLabel="name"
              value={loja}
              options={cities}
              onChange={(e) => setLoja(e.value)}
              placeholder="Selecione a loja"
              required
            />

            <InputTextarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="HTML"
            />

            <div className="onSubmit-gera-nota">
              <span className="p-buttonset">
                <Button
                  label="Gerar Nota"
                  icon="pi pi-check"
                  onClick={submit}
                  disabled={!cnpj || !numeroNfe || !codigoNumeroChave || !html}
                />
                <Button
                  label="Apagar tudo"
                  icon="pi pi-times"
                  onClick={clearForm}
                />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="carregando-gera-nota">
          <ProgressSpinner />
        </div>
      )}
    </>
  );
}

// const cnpj = "47093966000508" //CNPJ do Fornecedor
// const numeroNfe = "000003035" //Deve haver 9 dígitos
// const codigoNumeroChave = "15440905" //Deve haver 8 dígitos
// const loja = 1;
