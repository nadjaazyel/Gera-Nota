import { useState } from "react";
import { GeraNota } from "../../components/gera-nota";
import { Header } from "../../components/header";
import { Instrucoes } from "../../components/instrucoes";
import './home.css'

export function Home() {
  const [indexMenu, SetIndexMenu] = useState(0);
  return (
    <>
      <Header activeIndex={indexMenu} setActiveIndex={SetIndexMenu} />
      <div className="content">
        {indexMenu === 0 && <GeraNota />}
        {indexMenu === 1 && <Instrucoes />}
      </div>
    </>
  );
}
