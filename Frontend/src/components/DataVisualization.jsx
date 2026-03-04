/**
 * DataVisualization Component
 * Parses analytical messages with multiple named financial series
 * (e.g. "Revenue Trend:", "Operating Margin:") and renders each
 * as a switchable tabbed chart.
 *
 * Fixes:
 *  - Handles ₹, $, €, £ currency symbols
 *  - Handles % percentage values
 *  - Handles "Million", "Billion", "Crore", "Lakh" word suffixes
 *  - Detects section headings → separate datasets (tabs)
 *  - Falls back to a flat list when no headings exist
 */

import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { BarChart2, LineChart, PieChart, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

/* ─── Colour palette ──────────────────────────────────────────── */
const COLOURS = [
  { bg: 'rgba(37,  99, 235, 0.75)', border: 'rgba(37,  99, 235, 1)' },
  { bg: 'rgba(16, 185, 129, 0.75)', border: 'rgba(16, 185, 129, 1)' },
  { bg: 'rgba(245,158,  11, 0.75)', border: 'rgba(245,158,  11, 1)' },
  { bg: 'rgba(139, 92, 246, 0.75)', border: 'rgba(139, 92, 246, 1)' },
  { bg: 'rgba(236, 72, 153, 0.75)', border: 'rgba(236, 72, 153, 1)' },
  { bg: 'rgba(249,115,  22, 0.75)', border: 'rgba(249,115,  22, 1)' },
];

/* ─── Number parser ───────────────────────────────────────────── */
const parseNum = (raw) => {
  if (!raw) return NaN;
  // Strip currency symbols and whitespace
  let s = raw.replace(/[₹$€£¥,\s]/g, '');
  const hasPct = s.includes('%');
  s = s.replace('%', '');
  // Named suffixes (case-insensitive)
  if (/billion$/i.test(s))  return parseFloat(s) * 1_000;
  if (/million$/i.test(s))  return parseFloat(s);
  if (/crore$/i.test(s))    return parseFloat(s) * 10;     // crore → millions approx
  if (/lakh$/i.test(s))     return parseFloat(s) / 100;
  if (/[Bb]$/.test(s))      return parseFloat(s) * 1_000;
  if (/[Mm]$/.test(s))      return parseFloat(s);
  if (/[Kk]$/.test(s))      return parseFloat(s) / 1_000;
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
};

/* ─── Detect time-period labels ───────────────────────────────── */
const isTimePeriod = (lbl) =>
  /Q[1-4]|FY\s*\d{2,4}|H[12]|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d{2}/i.test(lbl);

/* ─── Section heading detector ────────────────────────────────── */
//   "Revenue Trend:"  /  "**Operating Margin:**"  / "Key Metrics:"
const isHeading = (line) => {
  const t = line.trim().replace(/\*+/g, '').trim();
  return (
    t.endsWith(':') &&
    t.length < 80 &&
    !t.match(/^[-•*\d]/)   // not a bullet or numbered list
  );
};

/* ─── Main extractor ──────────────────────────────────────────── */
/*
  Bullet pattern matches lines like:
    "- Q2 FY24: ₹596,920 Million"
    "• Q3 FY24: 24.3%"
    "* 2023: $1,200M"
    "- Revenue: 5,000"
*/
const BULLET_RE =
  /^[-•*]\s+(.+?):\s*([₹$€£¥]?\s*[\d,]+(?:\.\d+)?%?\s*(?:Billion|Million|Crore|Lakh|[BMKbmk])?)\s*$/i;

const extractData = (text) => {
  const lines = text.split('\n');
  const sections = [];   // [{ name, points: [{label, value}] }]
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isHeading(line)) {
      const name = line.replace(/\*+/g, '').replace(/:$/, '').trim();
      current = { name, points: [] };
      sections.push(current);
      continue;
    }

    const m = line.match(BULLET_RE);
    if (m) {
      const label = m[1].trim();
      const val   = parseNum(m[2].trim());
      if (!isNaN(val) && label.length < 60) {
        // If no section heading found yet, create a default one
        if (!current) {
          current = { name: 'Data', points: [] };
          sections.push(current);
        }
        current.points.push({ label, value: val });
      }
    }
  }

  // Keep only sections with ≥ 2 data points
  const valid = sections.filter((s) => s.points.length >= 2);
  if (valid.length === 0) return null;

  return valid.map((s, i) => ({
    name:   s.name,
    labels: s.points.map((p) => p.label),
    values: s.points.map((p) => p.value),
    isPct:  s.points.some((p) => /%./.test(String(p.raw))),   // percentage series
    colour: COLOURS[i % COLOURS.length],
    isTime: s.points.some((p) => isTimePeriod(p.label)),
  }));
};

/* ─── Trend line (linear regression) ─────────────────────────── */
const calcTrend = (values) => {
  const n = values.length;
  const sx  = values.reduce((s, _, i) => s + i, 0);
  const sy  = values.reduce((s, v)    => s + v, 0);
  const sxy = values.reduce((s, v, i) => s + i * v, 0);
  const sx2 = values.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx) || 0;
  const b = (sy - slope * sx) / n;
  return values.map((_, i) => +(slope * i + b).toFixed(2));
};

/* ─── Component ───────────────────────────────────────────────── */
const DataVisualization = ({ content }) => {
  const datasets = useMemo(() => extractData(content), [content]);

  const [tab,       setTab]       = useState(0);
  const [chartType, setChartType] = useState('auto');
  const [showTrend, setShowTrend] = useState(false);

  // Reset tab / chart-type if datasets change
  const ds = datasets?.[tab] ?? datasets?.[0];

  if (!datasets || datasets.length === 0 || !ds) return null;

  /* Auto chart type for current series */
  const autoType = ds.isTime ? 'line' : (datasets.length === 1 && ds.labels.length <= 5 ? 'bar' : 'bar');
  const activeType = chartType === 'auto' ? autoType : chartType;

  /* Chart.js data */
  const trendValues = showTrend && activeType !== 'pie' ? calcTrend(ds.values) : null;

  const chartData = {
    labels: ds.labels,
    datasets: [
      {
        label: ds.name,
        data: ds.values,
        backgroundColor: activeType === 'pie'
          ? COLOURS.slice(0, ds.values.length).map((c) => c.bg)
          : ds.colour.bg,
        borderColor: activeType === 'pie'
          ? COLOURS.slice(0, ds.values.length).map((c) => c.border)
          : ds.colour.border,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      ...(trendValues
        ? [{
            label: 'Trend',
            data: trendValues,
            type: 'line',
            borderColor: 'rgba(239,68,68,0.85)',
            borderWidth: 2,
            borderDash: [6, 4],
            fill: false,
            pointRadius: 0,
          }]
        : []),
    ],
  };

  /* Chart.js options */
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: showTrend || activeType === 'pie',
        position: 'bottom',
        labels: { padding: 10, font: { size: 11 }, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: 'rgba(13,22,41,0.95)',
        padding: 12,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont:  { size: 12 },
        callbacks: {
          label: (ctx) => {
            const v = ctx.raw ?? ctx.parsed?.y ?? 0;
            const formatted = new Intl.NumberFormat('en-IN').format(v);
            return `  ${ctx.dataset.label}: ${formatted}`;
          },
        },
      },
    },
    scales: activeType !== 'pie' ? {
      y: {
        beginAtZero: false,
        ticks: {
          font: { size: 11 },
          callback: (v) =>
            new Intl.NumberFormat('en-IN', {
              notation: 'compact',
              compactDisplay: 'short',
              maximumFractionDigits: 1,
            }).format(v),
        },
        grid: { color: 'rgba(148,163,184,0.1)' },
      },
      x: {
        ticks: { font: { size: 10 }, maxRotation: 30 },
        grid: { display: false },
      },
    } : undefined,
  };

  /* Summary stats for current series */
  const min = Math.min(...ds.values);
  const max = Math.max(...ds.values);
  const avg = ds.values.reduce((a, b) => a + b, 0) / ds.values.length;
  const lastChange = ds.values.length >= 2
    ? (((ds.values.at(-1) - ds.values.at(-2)) / Math.abs(ds.values.at(-2))) * 100).toFixed(1)
    : null;

  const fmtCompact = (v) =>
    new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(v);

  return (
    <div
      className="my-3 sm:my-4 rounded-xl border shadow-sm animate-fadeIn overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* ── Tab bar (one tab per series) ── */}
      {datasets.length > 1 && (
        <div
          className="flex overflow-x-auto scrollbar-hide border-b"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          {datasets.map((d, i) => (
            <button
              key={i}
              onClick={() => { setTab(i); setChartType('auto'); setShowTrend(false); }}
              className="flex-shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2"
              style={
                tab === i
                  ? { borderBottomColor: '#2563eb', color: '#2563eb', backgroundColor: 'var(--color-bg-elevated)' }
                  : { borderBottomColor: 'transparent', color: 'var(--color-text-secondary)' }
              }
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 sm:p-4">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-xs font-semibold truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {datasets.length === 1 ? ds.name : `${tab + 1} / ${datasets.length}`}
            </span>
            {lastChange !== null && (
              <span
                className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={
                  parseFloat(lastChange) >= 0
                    ? { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)' }
                    : { backgroundColor: 'var(--color-error-bg)',   color: 'var(--color-error-text)' }
                }
              >
                {parseFloat(lastChange) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(lastChange))}%
              </span>
            )}
          </div>

          {/* Chart type switcher */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {[
              { id: 'line', Icon: LineChart, title: 'Line' },
              { id: 'bar',  Icon: BarChart2, title: 'Bar'  },
              { id: 'pie',  Icon: PieChart,  title: 'Pie'  },
            ].map(({ id, Icon, title }) => (
              <button
                key={id}
                onClick={() => setChartType(chartType === id ? 'auto' : id)}
                title={title}
                className="p-1.5 rounded-lg transition-colors"
                style={
                  activeType === id
                    ? { backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563eb' }
                    : { color: 'var(--color-text-muted)' }
                }
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
            {activeType !== 'pie' && (
              <button
                onClick={() => setShowTrend(!showTrend)}
                title="Trend line"
                className="p-1.5 rounded-lg transition-colors"
                style={
                  showTrend
                    ? { backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563eb' }
                    : { color: 'var(--color-text-muted)' }
                }
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Chart canvas ── */}
        <div className="relative" style={{ height: '200px' }}>
          {activeType === 'line' && <Line  data={chartData} options={options} />}
          {activeType === 'bar'  && <Bar   data={chartData} options={options} />}
          {activeType === 'pie'  && <Pie   data={chartData} options={options} />}
        </div>

        {/* ── Summary stats ── */}
        <div
          className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {[['Min', min], ['Avg', avg], ['Max', max]].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {fmtCompact(val)}
              </p>
            </div>
          ))}
        </div>

        {/* ── Prev / Next tab navigators (mobile-friendly) ── */}
        {datasets.length > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setTab((t) => Math.max(0, t - 1))}
              disabled={tab === 0}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>
            <div className="flex gap-1">
              {datasets.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{
                    backgroundColor: i === tab ? '#2563eb' : 'var(--color-border)',
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setTab((t) => Math.min(datasets.length - 1, t + 1))}
              disabled={tab === datasets.length - 1}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataVisualization;
