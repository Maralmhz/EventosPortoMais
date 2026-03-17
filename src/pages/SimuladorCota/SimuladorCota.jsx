import React, { useState } from "react";

// TODAS as regras das cotas (LIMA, PORTO MAIS, GRAND, STATUS, FR BRASIL)
const regrasCota = [
  // LIMA TRUCK
  { associacao: "LIMA TRUCK", categoria: "Automóveis até 60 mil", minimo: "salario", percentual: 0.06, vidros: 0.5, reincidente: 2 },
  { associacao: "LIMA TRUCK", categoria: "Automóveis 60 a 260 mil", minimo: "salario", percentual: 0.07, vidros: 0.5, reincidente: 2 },
  { associacao: "LIMA TRUCK", categoria: "Diesel / Utilitários / Ônibus", minimo: 5000, percentual: 0.08, vidros: 0.5, reincidente: 2 },
  { associacao: "LIMA TRUCK", categoria: "Táxi / Uber", minimo: "salario", percentual: 0.07, vidros: 0.5, reincidente: 2 },
  { associacao: "LIMA TRUCK", categoria: "Moto", minimo: 1, percentual: 0.10, vidros: 0.5, reincidente: 2 },

  // PORTO MAIS
  { associacao: "PORTO MAIS", categoria: "Veículos passeio", minimo: 1, percentual: 0.04, vidros: 0.5, reincidente: 2 },
  { associacao: "PORTO MAIS", categoria: "Utilitários", minimo: 1, percentual: 0.06, vidros: 0.5, reincidente: 2 },
  { associacao: "PORTO MAIS", categoria: "Categoria especial", minimo: 2, percentual: 0.08, vidros: 0.5, reincidente: 2 },
  { associacao: "PORTO MAIS", categoria: "Caminhão", minimo: 3, percentual: 0.08, vidros: 0.5, reincidente: 2 },
  { associacao: "PORTO MAIS", categoria: "Moto", minimo: 1, percentual: 0.06, vidros: 0.5, reincidente: 2 },
  { associacao: "PORTO MAIS", categoria: "Moto acima 400cc", minimo: 1, percentual: 0.10, vidros: 0.5, reincidente: 2 },

  // GRAND CAR
  { associacao: "GRAND CAR", categoria: "Passeio até 80 mil", minimo: 900, percentual: 0.04, vidros: 0.5, reincidente: 2 },
  { associacao: "GRAND CAR", categoria: "80 a 100 mil", minimo: 900, percentual: 0.06, vidros: 0.5, reincidente: 2 },
  { associacao: "GRAND CAR", categoria: "Acima de 100 mil", minimo: 900, percentual: 0.08, vidros: 0.5, reincidente: 2 },
  { associacao: "GRAND CAR", categoria: "Táxi / App", minimo: 1500, percentual: 0.08, vidros: 0.5, reincidente: 2 },
  { associacao: "GRAND CAR", categoria: "Moto", minimo: 900, percentual: 0.06, vidros: 0.5, reincidente: 2 },

  // STATUS
  { associacao: "STATUS", categoria: "Passeio até 10 mil", minimo: 800, percentual: 0.10, vidros: 0.5, reincidente: 2 },
  { associacao: "STATUS", categoria: "Acima de 10 mil", minimo: 1200, percentual: 0.10, vidros: 0.5, reincidente: 2 },
  { associacao: "STATUS", categoria: "Grupo especial 2", minimo: 1500, percentual: 0.15, vidros: 0.5, reincidente: 2 },
  { associacao: "STATUS", categoria: "Grupo especial 3", minimo: 2500, percentual: 0.21, vidros: 0.5, reincidente: 2 },
  { associacao: "STATUS", categoria: "Moto", minimo: 1500, percentual: 0.21, vidros: 0.5, reincidente: 2 },
  { associacao: "STATUS", categoria: "Terceiros", minimo: 0, percentual: 0.5, vidros: 0.5, reincidente: 1 }, // 50% da cota

  // FR BRASIL
  { associacao: "FR BRASIL", categoria: "Automóveis até 40 mil", minimo: 800, percentual: 0.04, vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "40 a 100 mil", minimo: 800, percentual: 0.05, vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "Táxi / Uber até 40 mil", minimo: 1500, percentual: 0.06, vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "Táxi / Uber 40 a 100 mil", minimo: 1500, percentual: 0.07, vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "Diesel até 60 mil", minimo: 1500, percentual: 0.07, vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "Diesel 60 a 120 mil", minimo: 1500, percentual: 0.08, vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "Moto até 120cc", minimo: 600, percentual: 0, tipo: "fixo", vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "Moto até 160cc", minimo: 800, percentual: 0, tipo: "fixo", vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "Moto até 250cc", minimo: 900, percentual: 0, tipo: "fixo", vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "Moto até 300cc", minimo: 1100, percentual: 0, tipo: "fixo", vidros: 0.5, reincidente: 2 },
  { associacao: "FR BRASIL", categoria: "Terceiro moto", minimo: 0, percentual: 0.5, vidros: 0.5, reincidente: 1 },
];

// SimuladorCota.jsx
const SimuladorCota = () => {
  // Estado
  const [fipe, setFipe] = useState("");
  const [associacao, setAssociacao] = useState("PORTO MAIS");
  const [categoria, setCategoria] = useState("Veículos passeio");
  const [dataEvento, setDataEvento] = useState(""); // data do último evento
  const [salario, setSalario] = useState("1500");

  // Cálculo
  const calc = () => {
    const val = parseFloat(fipe) || 0;
    const sal = parseFloat(salario) || 1500;

    const rule = regrasCota.find(
      r => r.associacao === associacao && r.categoria === categoria
    );

    if (!rule) return null;

    let c = 0;
    if (rule.tipo === "fixo") {
      c = rule.minimo; // valor fixo (motos FR BRASIL)
    } else if (typeof rule.minimo === "number") {
      c = Math.max(rule.minimo, val * rule.percentual);
    } else if (rule.minimo === "salario") {
      c = Math.max(sal * rule.minimo, val * rule.percentual);
    } else {
      c = val * rule.percentual;
    }

    const vidros = c * rule.vidros; // 50%

    // Reincidência em menos de 12 meses
    const d1 = new Date(dataEvento);
    const d2 = new Date();
    const diff = d2.getTime() - d1.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    const reinc = days < 365 ? rule.reincidente : 1;

    const cotaFinal = c * reinc;
    const vidrosFinal = vidros * reinc;

    return { cota: cotaFinal, vidros: vidrosFinal, total: cotaFinal +
