import { useState, useCallback } from 'react'
import RankineChart from './RankineChart'
import { satT, satTHeaders, satTKeys, satTUnits, satP, satPHeaders, satPKeys, satPUnits, supData, liqData } from './data'
import styles from './App.module.css'

function fmt(v) {
  if (typeof v !== 'number') return v
  return Math.abs(v) < 0.0001 ? v.toExponential(4) : parseFloat(v.toPrecision(5)).toString()
}

function interpQuad(x0, y0, x1, y1, x2, y2, x) {
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

const TABS = [
  { id: 'sat-t', label: 'Saturada por Temperatura' },
  { id: 'sat-p', label: 'Saturada por Pressão' },
  { id: 'sup',   label: 'Superaquecido' },
  { id: 'liq',   label: 'Comprimido' },
]

export default function App() {
  const [tab, setTab] = useState('sat-t');
  const [searchVal, setSearchVal] = useState('');
  const [supKey, setSupKey] = useState(Object.keys(supData)[0]);
  const [liqKey, setLiqKey] = useState(Object.keys(liqData)[0]);
  const [result, setResult] = useState(null);
  const [highlightVal, setHighlightVal] = useState(null);

  const handleSearch = useCallback(() => {
    const val = parseFloat(searchVal);
    if (isNaN(val)) return;
    setHighlightVal(val);

    let data = tab === 'sat-t' ? satT : tab === 'sat-p' ? satP : tab === 'sup' ? supData[supKey].rows : liqData[liqKey].rows;
    let keys = (tab.startsWith('sat')) ? (tab === 'sat-t' ? satTKeys : satPKeys) : ['T','v','h','s'];
    let units = (tab.startsWith('sat')) ? (tab === 'sat-t' ? satTUnits : satPUnits) : ['°C','m³/kg','kJ/kg','kJ/kg·K'];

    const pts = findThreePoints(data, val, 0);
    if (pts[0] === -1) { setResult({ error: 'Fora do intervalo' }); return; }

    const row = keys.map((_, i) => interpQuad(data[pts[0]][0], data[pts[0]][i], data[pts[1]][0], data[pts[1]][i], data[pts[2]][0], data[pts[2]][i], val));
    setResult({ values: row, keys, units, rawVal: tab === 'sat-p' ? row[1] : val });
  }, [tab, searchVal, supKey, liqKey]);

  const { headers, rows, keyIdx } = tab === 'sat-t' ? { headers: satTHeaders, rows: satT, keyIdx: 0 } : tab === 'sat-p' ? { headers: satPHeaders, rows: satP, keyIdx: 0 } : { headers: ['T (°C)','v (m³/kg)','h (kJ/kg)','s (kJ/kg·K)'], rows: tab === 'sup' ? supData[supKey].rows : liqData[liqKey].rows, keyIdx: 0 };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoTitle}>H2O Terdinamica</div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.tabs}>
          {TABS.map(t => (<button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => {setTab(t.id); setResult(null); setSearchVal(''); setHighlightVal(null);}}>{t.label}</button>))}
        </div>

        <div className={styles.searchBar}>
          {tab === 'sup' && <select value={supKey} onChange={e => setSupKey(e.target.value)}>{Object.keys(supData).map(k => <option key={k} value={k}>{k} bar</option>)}</select>}
          {tab === 'liq' && <select value={liqKey} onChange={e => setLiqKey(e.target.value)}>{Object.keys(liqData).map(k => <option key={k} value={k}>{k} MPa</option>)}</select>}
          <input type="number" value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="Digite o valor..." onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch}>Analisar</button>
        </div>

        {result && !result.error && (
          <div className={styles.resultCard}>
            <div className={styles.resultGrid}>{result.keys.map((k, i) => (<div key={k} className={styles.resultItem}><div className={styles.resultLabel}>{k}</div><div className={styles.resultVal}>{fmt(result.values[i])}</div><div style={{fontSize: '10px', color: 'var(--text3)'}}>{result.units[i]}</div></div>))}</div>
          </div>
        )}

        <RankineChart currentResult={result} />

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((row, i) => (<tr key={i} className={highlightVal !== null && row[keyIdx] === highlightVal ? styles.highlighted : ''}>{row.map((v, ci) => <td key={ci}>{fmt(v)}</td>)}</tr>))}</tbody>
          </table>
        </div>
      </main>

      <footer className={styles.footer}>
        Desenvolvido por: <strong style={{color: 'var(--text)'}}>Nathan Medeiros de Lucena</strong> | Matrícula: 29298628
      </footer>
    </div>
  )
}