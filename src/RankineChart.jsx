import React from 'react';
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend, Title } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { satT } from './data';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

export default function RankineChart({ currentResult }) {
  const domeLeft = satT.map(row => ({ x: row[6], y: row[0] }));
  const domeRight = [...satT].reverse().map(row => ({ x: row[7], y: row[0] }));
  
  let T_high = 200;
  if (currentResult && currentResult.rawVal) T_high = currentResult.rawVal;
  
  const T_low = 40;
  const getS = (T) => {
    const row = satT.find(r => r[0] >= T) || satT[satT.length-1];
    return { sf: row[6], sg: row[7] };
  };

  const sHigh = getS(T_high);
  const sLow = getS(T_low);

  const cycleData = [{ x: sHigh.sg, y: T_high }, { x: sHigh.sg, y: T_low }, { x: sLow.sf, y: T_low }, { x: sLow.sf, y: T_low + 2 }, { x: sHigh.sf, y: T_high }, { x: sHigh.sg, y: T_high }];

  const data = {
    datasets: [
      {
        label: `Ciclo (${T_high.toFixed(1)}°C)`,
        data: cycleData,
        borderColor: '#ffa726', // AMARELO
        backgroundColor: '#ffa726',
        showLine: true,
        borderWidth: 2,
        pointRadius: 4,
        tension: 0,
      },
      {
        label: 'Saturação',
        data: [...domeLeft, ...domeRight],
        borderColor: '#556070',
        backgroundColor: 'transparent',
        showLine: true,
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [5, 5], 
        tension: 0.1,
      }
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { type: 'linear', title: { display: true, text: 's [kJ/kgK]', color: '#8a93a6' }, grid: { color: '#1a1e25' }, ticks: { color: '#8a93a6' } },
      y: { title: { display: true, text: 'T [°C]', color: '#8a93a6' }, grid: { color: '#1a1e25' }, ticks: { color: '#8a93a6' }, min: 0, max: Math.max(400, T_high + 20) }
    },
    plugins: { legend: { labels: { color: '#e8ecf2' } } }
  };

  return (
    <div style={{ height: '400px', width: '100%', padding: '1.5rem', background: '#13161b', borderRadius: '12px', border: '1px solid #2a2f3a', marginBottom: '2rem' }}>
      <Scatter data={data} options={options} />
    </div>
  );
}