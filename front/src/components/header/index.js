import { TabMenu } from "primereact/tabmenu";
import React from "react";

export function Header({ activeIndex, setActiveIndex }) {
  const items = [
    { label: "Gerar Nota", icon: "pi pi-fw pi-file" },
    { label: "Instruções", icon: "pi pi-fw pi-list" },
  ];

  return (
    <div>
      <div className="card">
        <TabMenu
          model={items}
          activeIndex={activeIndex}
          onTabChange={(e) => setActiveIndex(e.index)}
        />
      </div>
    </div>
  );
}
