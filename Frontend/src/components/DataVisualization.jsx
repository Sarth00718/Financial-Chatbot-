/**
 * DataVisualization Component
 * Renders structured JSON data into Recharts components automatically.
 * Supports: Line, Bar, Area, Pie, Donut, Radar charts.
 */

import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

const COLOURS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#F97316'];

/* ─── Legacy Number & Heading parser for content fallback ──────── */
const parseNum = (raw) => {
  if (!raw) return NaN;
  let s = raw.replace(/[₹$€£¥,\s]/g, '');
  const hasPct = s.includes('%');
  s = s.replace('%', '');
  if (/billion$/i.test(s))  return parseFloat(s) * 1_000;
  if (/million$/i.test(s))  return parseFloat(s);
  if (/crore$/i.test(s))    return parseFloat(s) * 10;
  if (/lakh$/i.test(s))     return parseFloat(s) / 100;
  if (/[Bb]$/.test(s))      return parseFloat(s) * 1_000;
  if (/[Mm]$/.test(s))      return parseFloat(s);
  if (/[Kk]$/.test(s))      return parseFloat(s) / 1_000;
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
};

const isHeading = (line) => {
  const t = line.trim().replace(/\*+/g, '').trim();
  return t.endsWith(':') && t.length < 80 && !t.match(/^[-•*\d]/);
};

const BULLET_RE = /^[-•*]\s+(.+?):\s*([₹$€£¥]?\s*[\d,]+(?:\.\d+)?%?\s*(?:Billion|Million|Crore|Lakh|[BMKbmk])?)\s*$/i;

const extractLegacyData = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const sections = [];
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
        if (!current) {
          current = { name: 'Data', points: [] };
          sections.push(current);
        }
        current.points.push({ label, value: val });
      }
    }
  }

  const valid = sections.filter((s) => s.points.length >= 2);
  if (valid.length === 0) return null;

  return valid.map(s => ({
    title: s.name,
    type: 'bar', // Default fallback
    xAxis: s.points.map(p => p.label),
    series: [{
      name: s.name,
      data: s.points.map(p => p.value)
    }]
  }));
};

const parseJsonFromText = (text) => {
  if (!text || typeof text !== 'string') return null;

  const normalizeJsonNumberCommas = (text) => {
    let result = '';
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (escape) {
        result += char;
        escape = false;
        continue;
      }
      if (char === '\\') {
        result += char;
        escape = true;
        continue;
      }
      if (char === '"') {
        result += char;
        inString = !inString;
        continue;
      }

      if (!inString && char === ',') {
        const prev = text[i - 1];
        const next = text[i + 1];
        if (prev && next && /\d/.test(prev) && /\d/.test(next)) {
          continue;
        }
      }

      result += char;
    }

    return result;
  };

  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      const cleaned = normalizeJsonNumberCommas(value);
      if (cleaned === value) return null;
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  };

  const findMatchingSegment = (source, startIndex) => {
    let depth = 0;
    let inString = false;
    let escape = false;
    const openChar = source[startIndex];
    const closeChar = openChar === '[' ? ']' : openChar === '{' ? '}' : null;
    if (!closeChar) return null;

    for (let i = startIndex; i < source.length; i += 1) {
      const char = source[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === openChar) depth += 1;
      else if (char === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return source.slice(startIndex, i + 1);
        }
      }
    }
    return null;
  };

  const cleaned = text.trim();
  let parsed = tryParse(cleaned);
  if (parsed) return parsed;

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    parsed = tryParse(fenceMatch[1].trim());
    if (parsed) return parsed;
  }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const startIndex = firstBrace !== -1 ? firstBrace : firstBracket;
  if (startIndex !== -1) {
    const segment = findMatchingSegment(cleaned, startIndex);
    parsed = segment ? tryParse(segment) : null;
    if (parsed) return parsed;
  }

  const fieldPattern = /["']?visualizations["']?\s*:\s*\[/gi;
  let match;
  while ((match = fieldPattern.exec(cleaned))) {
    const arrayStart = cleaned.indexOf('[', match.index);
    if (arrayStart === -1) continue;
    const segment = findMatchingSegment(cleaned, arrayStart);
    const arrayValue = segment ? tryParse(segment) : null;
    if (Array.isArray(arrayValue)) {
      return { visualizations: arrayValue };
    }
  }

  return null;
};

const normalizeVisualizationData = (rawData) => {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  if (typeof rawData === 'object') {
    if (Array.isArray(rawData.visualizations)) return rawData.visualizations;
    return [rawData];
  }
  return [];
};

const normalizeVisualization = (vis) => {
  if (!vis || typeof vis !== 'object') return null;

  const xAxis = Array.isArray(vis.xAxis) ? vis.xAxis : [];
  const series = Array.isArray(vis.series) ? vis.series : [];
  const points = Array.isArray(vis.data) ? vis.data : []; // allow alternative data field

  if (!series.length && points.length > 0) {
    const firstRow = points[0] || {};
    const keys = Object.keys(firstRow).filter((k) => k !== 'label' && k !== 'name' && k !== 'x');
    const labels = points.map((row) => row.label ?? row.name ?? row.x ?? `Item ${points.indexOf(row) + 1}`);
    const values = keys.map((key) => ({
      name: key,
      data: points.map((row) => {
        const value = row[key];
        return typeof value === 'string' ? parseNum(value) : value;
      }),
    }));

    return {
      ...vis,
      xAxis: xAxis.length ? xAxis : labels,
      series: values,
    };
  }

  const normalized = { ...vis, xAxis, series };

  if (!normalized.xAxis.length && normalized.series.length) {
    const firstSeries = normalized.series[0];
    if (Array.isArray(firstSeries.data)) {
      normalized.xAxis = firstSeries.data.map((_, index) => `Item ${index + 1}`);
    }
  }

  if (!normalized.series.length && Array.isArray(normalized.data)) {
    normalized.series = normalized.data.map((row, index) => ({
      name: row.name || `Series ${index + 1}`,
      data: Array.isArray(row.data) ? row.data : [],
    }));
  }

  return normalized;
};

const DataVisualization = ({ content, data }) => {
  const visualizations = useMemo(() => {
    if (data) {
      if (Array.isArray(data) && data.length > 0) {
        return data.map(normalizeVisualization).filter(Boolean);
      }
      if (typeof data === 'string') {
        const parsedData = parseJsonFromText(data);
        const extracted = parsedData ? normalizeVisualizationData(parsedData?.visualizations || parsedData) : null;
        if (extracted && extracted.length > 0) {
          return extracted.map(normalizeVisualization).filter(Boolean);
        }
      }
      if (typeof data === 'object') {
        const extracted = normalizeVisualizationData(data);
        if (extracted.length > 0) {
          return extracted.map(normalizeVisualization).filter(Boolean);
        }
      }
    }

    const parsed = parseJsonFromText(content);
    const extracted = parsed ? normalizeVisualizationData(parsed?.visualizations || parsed) : null;
    if (extracted && extracted.length > 0) {
      return extracted.map(normalizeVisualization).filter(Boolean);
    }

    return extractLegacyData(content);
  }, [content, data]);

  if (!visualizations || visualizations.length === 0) return null;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
      {visualizations.map((vis, idx) => (
        <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
            {vis.title || 'Data Visualization'}
          </Typography>
          <Box sx={{ width: '100%', height: 300 }}>
            {renderChart(vis)}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

const renderChart = (vis) => {
  const chartData = [];
  const xAxisLabels = vis.xAxis || [];
  
  xAxisLabels.forEach((label, i) => {
    const dataPoint = { name: label };
    vis.series.forEach((s) => {
      dataPoint[s.name] = s.data[i];
    });
    chartData.push(dataPoint);
  });

  const type = vis.type?.toLowerCase() || 'line';
  const margin = { top: 10, right: 30, left: 0, bottom: 0 };
  const tooltipStyle = { borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(13,22,41,0.95)', color: '#fff' };
  
  const formatter = (val) => new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(val);

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" fontSize={12} tickMargin={10} />
            <YAxis fontSize={12} tickFormatter={formatter} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            {vis.series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} fill={COLOURS[i % COLOURS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" fontSize={12} tickMargin={10} />
            <YAxis fontSize={12} tickFormatter={formatter} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            {vis.series.map((s, i) => (
              <Area key={s.name} type="monotone" dataKey={s.name} fill={COLOURS[i % COLOURS.length]} stroke={COLOURS[i % COLOURS.length]} fillOpacity={0.3} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    case 'pie':
    case 'donut':
      const pieData = xAxisLabels.map((label, i) => ({
        name: label,
        value: vis.series[0]?.data[i] || 0
      }));
      const innerRadius = type === 'donut' ? 60 : 0;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={100} paddingAngle={2} dataKey="value">
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLOURS[index % COLOURS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    case 'radar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid opacity={0.3} />
            <PolarAngleAxis dataKey="name" fontSize={12} />
            <PolarRadiusAxis angle={30} domain={['auto', 'auto']} fontSize={10} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            {vis.series.map((s, i) => (
              <Radar key={s.name} name={s.name} dataKey={s.name} stroke={COLOURS[i % COLOURS.length]} fill={COLOURS[i % COLOURS.length]} fillOpacity={0.4} />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      );
    case 'composed':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" fontSize={12} tickMargin={10} />
            <YAxis fontSize={12} tickFormatter={formatter} />
            <ReferenceLine y={0} stroke="#8884d8" strokeDasharray="3 3" />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            {vis.series.map((s, i) => (
              i === 0 ? (
                <Bar key={s.name} dataKey={s.name} fill={COLOURS[i % COLOURS.length]} radius={[4, 4, 0, 0]} />
              ) : (
                <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLOURS[i % COLOURS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              )
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      );
    case 'line':
    default:
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" fontSize={12} tickMargin={10} />
            <YAxis fontSize={12} tickFormatter={formatter} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            {vis.series.map((s, i) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLOURS[i % COLOURS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
  }
};

export default DataVisualization;
