import { buildApp } from "./app";

const PORT = Number(process.env.PORT ?? 3333);
const app = buildApp();

app.listen(PORT, () => {
    console.log(`GeraNota rodando em http://localhost:${PORT}`);
    console.log(`POST http://localhost:${PORT}/api/v1/gerar-nota`);
});
