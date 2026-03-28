import { useState, useCallback } from 'react'
import RankineChart from './RankineChart'
import { satT, satTKeys, satTUnits, satP, satPKeys, satPUnits, supData, liqData } from './data'
import styles from './App.module.css'

function fmt(v) {
  if (typeof v !== 'number') return v
  if (Math.abs(v) < 0.0001) return v.toExponential(4)
  if (Math.abs(v) < 10) return parseFloat(v.toPrecision(5)).toString()
  return parseFloat(v.toPrecision(6)).toString()
}

function interpQuad(x0, y0, x1, y1, x2, y2, x) {
  if (x0 === x1 || x1 === x2 || x0 === x2) return y1;
  const L0 = ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2));
  const L1 = ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2));
  const L2 = ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));
  return y0 * L0 + y1 * L1 + y2 * L2;
}

function findThreePoints(arr, val, idx) {
  let lo = -1;
  for (let i = 0; i < arr.length - 1; i++) { if (arr[i][idx] <= val && arr[i + 1][idx] >= val) { lo = i; break; } }
  if (lo === -1) return [-1, -1, -1];
  if (lo === 0) return [0, 1, 2];
  if (lo === arr.length - 2) return [lo - 1, lo, lo + 1];
  return Math.abs(val - arr[lo - 1][idx]) < Math.abs(val - arr[lo + 2][idx]) ? [lo - 1, lo, lo + 1] : [lo, lo + 1, lo + 2];
}

function findClosestTable(dataObj, targetVal) {
  const keys = Object.keys(dataObj);
  let closestKey = keys[0];
  let minDiff = Math.abs(Number(closestKey) - targetVal);
  for (let k of keys) {
    const diff = Math.abs(Number(k) - targetVal);
    if (diff < minDiff) { minDiff = diff; closestKey = k; }
  }
  return { key: closestKey, table: dataObj[closestKey] };
}

export default function App() {
  const [inputP, setInputP] = useState('');
  const [inputT, setInputT] = useState('');
  const [result, setResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const handleSearch = useCallback(() => {
    setResult(null); setAnalysis(null);
    const P = parseFloat(inputP);
    const T = parseFloat(inputT);
    const hasP = !isNaN(P);
    const hasT = !isNaN(T);

    if (!hasP && !hasT) { alert("Insira Pressão e/ou Temperatura."); return; }

    let estado = ""; let memorial = []; let rowData = []; 
    let keys = []; let units = []; let currentT = 0; let s_val = null;

    const eqLagrange = "y(x) = y₀·L₀ + y₁·L₁ + y₂·L₂";

    if (hasT && !hasP) {
      const pts = findThreePoints(satT, T, 0);
      if (pts[0] === -1) { setResult({ error: "Temperatura fora da tabela (0.01 a 374.14 °C)." }); return; }
      rowData = satTKeys.map((_, i) => interpQuad(satT[pts[0]][0], satT[pts[0]][i], satT[pts[1]][0], satT[pts[1]][i], satT[pts[2]][0], satT[pts[2]][i], T));
      keys = satTKeys; units = satTUnits; currentT = T; s_val = [rowData[6], rowData[7]];
      setAnalysis({ estado: "SATURADA POR TEMPERATURA", T: currentT, s_val, memorial: [`Entrada única: T = ${T} °C`, `Estado assumido: Linha de saturação.`, `Fórmula (Lagrange): ${eqLagrange}`, `Resultado: Psat = ${fmt(rowData[1])} bar.`] });
    }
    else if (hasP && !hasT) {
      const pts = findThreePoints(satP, P, 0);
      if (pts[0] === -1) { setResult({ error: "Pressão fora da tabela (0.00611 a 220.9 bar)." }); return; }
      rowData = satPKeys.map((_, i) => interpQuad(satP[pts[0]][0], satP[pts[0]][i], satP[pts[1]][0], satP[pts[1]][i], satP[pts[2]][0], satP[pts[2]][i], P));
      keys = satPKeys; units = satPUnits; currentT = rowData[1]; s_val = [rowData[6], rowData[7]];
      setAnalysis({ estado: "SATURADA POR PRESSÃO", T: currentT, s_val, memorial: [`Entrada única: P = ${P} bar`, `Estado assumido: Linha de saturação.`, `Fórmula (Lagrange): ${eqLagrange}`, `Resultado: Tsat = ${fmt(rowData[1])} °C.`] });
    }
    else if (hasP && hasT) {
      const ptsP = findThreePoints(satP, P, 0);
      if (ptsP[0] === -1) { setResult({ error: "Pressão fora dos limites termodinâmicos." }); return; }
      
      const Tsat = interpQuad(satP[ptsP[0]][0], satP[ptsP[0]][1], satP[ptsP[1]][0], satP[ptsP[1]][1], satP[ptsP[2]][0], satP[ptsP[2]][1], P);
      memorial.push(`Variáveis Ativas: P = ${P} bar | T = ${T} °C`);
      memorial.push(`Cálculo da Temperatura de Saturação via Lagrange (${eqLagrange})`);
      memorial.push(`Tsat = ${fmt(Tsat)} °C`);

      if (T > Tsat + 0.1) {
        estado = "VAPOR SUPERAQUECIDO";
        memorial.push(`Critério de Fase: T_sistema > Tsat (${T} °C > ${fmt(Tsat)} °C)`);
        const { key, table } = findClosestTable(supData, P);
        memorial.push(`Busca em tabela de referência (P_ref = ${key} bar).`);
        const ptsT = findThreePoints(table.rows, T, 0);
        if (ptsT[0] === -1) { setResult({ error: `T = ${T}°C está fora da tabela superaquecida.` }); return; }
        
        rowData = [0,1,2,3].map(i => interpQuad(table.rows[ptsT[0]][0], table.rows[ptsT[0]][i], table.rows[ptsT[1]][0], table.rows[ptsT[1]][i], table.rows[ptsT[2]][0], table.rows[ptsT[2]][i], T));
        keys = ['T','v','h','s']; units = ['°C','m³/kg','kJ/kg','kJ/kg·K'];
        setAnalysis({ estado, memorial, T, s_val: rowData[3] });
      }
      else if (T < Tsat - 0.1) {
        estado = "LÍQUIDO COMPRIMIDO";
        memorial.push(`Critério de Fase: T_sistema < Tsat (${T} °C < ${fmt(Tsat)} °C)`);
        const { key, table } = findClosestTable(liqData, P / 10);
        memorial.push(`Busca em tabela de referência (P_ref = ${key} MPa).`);
        const ptsT = findThreePoints(table.rows, T, 0);
        if (ptsT[0] === -1) { setResult({ error: `T = ${T}°C está fora da tabela de líquido.` }); return; }
        
        rowData = [0,1,2,3].map(i => interpQuad(table.rows[ptsT[0]][0], table.rows[ptsT[0]][i], table.rows[ptsT[1]][0], table.rows[ptsT[1]][i], table.rows[ptsT[2]][0], table.rows[ptsT[2]][i], T));
        keys = ['T','v','h','s']; units = ['°C','m³/kg','kJ/kg','kJ/kg·K'];
        setAnalysis({ estado, memorial, T, s_val: rowData[3] });
      }
      else {
        estado = "MISTURA SATURADA";
        memorial.push(`Critério de Fase: T_sistema ≅ Tsat (${T} °C ≅ ${fmt(Tsat)} °C)`);
        memorial.push(`Extração das propriedades da mistura nas fronteiras de saturação (vf, vg).`);
        rowData = satPKeys.map((_, i) => interpQuad(satP[ptsP[0]][0], satP[ptsP[0]][i], satP[ptsP[1]][0], satP[ptsP[1]][i], satP[ptsP[2]][0], satP[ptsP[2]][i], P));
        keys = satPKeys; units = satPUnits;
        setAnalysis({ estado, memorial, T: rowData[1], s_val: [rowData[6], rowData[7]] });
      }
    }
    setResult({ keys, units, values: rowData });
  }, [inputP, inputT]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>Termodinamica</div>
        <div className={styles.subtitle}>Analise Agua</div>
      </header>

      <main className={styles.bentoGrid}>
        
        {/* Card 1: Input / Search */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Parâmetros de Entrada</div>
          
          <div className={styles.inputGroup}>
            <span className={styles.inputLabel}>Pressão (bar)</span>
            <input type="number" className={styles.inputBox} value={inputP} onChange={e => setInputP(e.target.value)} placeholder="0.00" onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          
          <div className={styles.inputGroup}>
            <span className={styles.inputLabel}>Temperatura (°C)</span>
            <input type="number" className={styles.inputBox} value={inputT} onChange={e => setInputT(e.target.value)} placeholder="0.00" onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>

          <button className={styles.btn} onClick={handleSearch}>GERAR ANÁLISE</button>
        </div>

        {/* Card 2: Resultados */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Propriedades Numéricas</div>
          {result && !result.error ? (
            <div className={styles.propGrid}>
              {result.keys.map((k, i) => (
                <div key={k} className={styles.propBox}>
                  <div className={styles.propLabel}>{k}</div>
                  <div className={styles.propValue}>{fmt(result.values[i])}</div>
                  <div className={styles.propUnit}>{result.units[i]}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
              Aguardando parâmetros...
            </div>
          )}
        </div>

        {/* Erros */}
        {result && result.error && (
          <div className={styles.errorBox}>{result.error}</div>
        )}

        {/* Card 3: Memorial Técnico */}
        {analysis && (
          <div className={`${styles.card} ${styles.memorialCard}`}>
            <div className={styles.cardTitle}>
              Memorial de Cálculo
              <span className={styles.statusBadge}>{analysis.estado}</span>
            </div>
            <div>
              {analysis.memorial.map((line, i) => (
                <div key={i} className={styles.memorialLine}>{line}</div>
              ))}
            </div>
          </div>
        )}

        {/* Card 4: Gráfico */}
        {analysis && (
          <div className={`${styles.card} ${styles.chartCard}`}>
            <div className={styles.cardTitle}>Diagrama T-s (Rankine)</div>
            <RankineChart analysis={analysis} />
          </div>
        )}

      </main>

      <footer className={styles.footer}>
        Desenvolvido por: <strong>Nathan Medeiros de Lucena</strong> | Matrícula: 29298628
      </footer>
    </div>
  )
}