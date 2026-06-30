import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3300/api/v1",
});

export const geraNota = async (cnpj, numeroNfe, codigoNumeroChave, loja, html) => {
  try {
    const { data } = await api.post("gerar-nota", {
      cnpj,
      numeroNfe,
      codigoNumeroChave,
      loja,
      html
    });
    return data;
  } catch (err) {
    throw err;
  }
};

// const [cnpj, setCnpj] = useState();
//   const [numeroNfe, setNumeroNfe] = useState();
//   const [codigoNumeroChave, setCodigoNumeroChave] = useState();
//   const [loja, setLoja] = useState();
