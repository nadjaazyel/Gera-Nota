import "./instrucoes.css";
import React, { useState, useEffect } from "react";
import { Divider } from "primereact/divider";
import { Galleria } from "primereact/galleria";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

import primeiraImagem from "../../assets/imagens-tutorial/1.png";
import segundaImagem from "../../assets/imagens-tutorial/2.png";
import terceiraImagem from "../../assets/imagens-tutorial/3.png";
import quartaImagem from "../../assets/imagens-tutorial/4.png";
import quintaImagem from "../../assets/imagens-tutorial/5.png";
import sextaImagem from "../../assets/imagens-tutorial/6.png";
import setimaImagem from "../../assets/imagens-tutorial/7.png";

export function Instrucoes() {
  const [images, setImages] = useState([
    primeiraImagem,
    segundaImagem,
    terceiraImagem,
    quartaImagem,
    quintaImagem,
    sextaImagem,
    setimaImagem,
  ]);

  const [exibirTutorial, setExibirTutorial] = useState(false);

  const responsiveOptions = [
    {
      breakpoint: "1024px",
      numVisible: 1,
    },
    {
      breakpoint: "768px",
      numVisible: 1,
    },
    {
      breakpoint: "560px",
      numVisible: 1,
    },
  ];

  const itemTemplate = (item) => {
    return (
      <img
        src={item.itemImageSrc}
        onError={(e) =>
          (e.target.src =
            "https://www.primefaces.org/wp-content/uploads/2020/05/placeholder.png")
        }
        alt=""
        style={{ width: "1280px" }}
      />
    );
  };

  const thumbnailTemplate = (item) => {
    return (
      <img
        src={item}
        onError={(e) =>
          (e.target.src =
            "https://www.primefaces.org/wp-content/uploads/2020/05/placeholder.png")
        }
        alt=""
        style={{ display: "block" }}
      />
    );
  };
  return (
    <>
      <Dialog
        header="Copiar Código HTML"
        visible={exibirTutorial}
        style={{ width: "80vw" }}
        modal
        onHide={() => setExibirTutorial(false)}
      >
        <Galleria
          value={images}
          responsiveOptions={responsiveOptions}
          numVisible={1}
          style={{ width: "100%" }}
          item={itemTemplate}
          thumbnail={thumbnailTemplate}
          circular
          autoPlay={false}
          transitionInterval={2000}
        />
      </Dialog>
      <div className="content-instrucoes">
        <h1>Instruções</h1>
        <div className="instrucoes">
          <h2>Como gerar sua nota</h2>
          <p>
            <strong>1.</strong> Preencher o CNPJ do fornecedor, número NFE,
            Código número chave e selecione a loja.
            <br></br>
            <strong>
              TODOS OS CAMPOS DEVEM SER PREENCHIDOS PARA OBTER UM BOM RESULTADO!
            </strong>
            <br></br>
            <br></br>
            <br></br>
            <strong>2.</strong> Preencher o campo HTML com o código da página
            dos produtos da nota. Não há a necessidade de formatar, basta copiar
            e colar.
            <br></br>
            <br></br>
            <strong>3.</strong> Como copiar o HTML
            <Button
              icon="pi pi-search"
              className="p-button-rounded p-button-info p-button-text"
              style={{ paddingBottom: "0px", margin: "0px" }}
              onClick={() => setExibirTutorial(true)}
            />
            <br></br>
            <div>
              <div className="card"></div>
            </div>
          </p>
          <Divider />
          <h2>Observações</h2>
          <p>
            05.570.714/0008-25 - CNPJ da empresa (11 dígitos)
            <br></br>
            <br></br>
            005 9146 62 - Número da NF-e (09 dígitos)
            <br></br>
            <br></br>1 3308 296 - Código numérico da chave (08 dígitos)
            <br></br>
            <br></br>
          </p>
        </div>
      </div>
    </>
  );
}
