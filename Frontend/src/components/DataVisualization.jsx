/**
 * Data Visualization Component
 * Auto-generates interactive charts from financial data in messages
 * Supports zoom, drill-down, and multiple chart types
 */

import { useState, useRef } from 'react';
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
import { BarChart2, LineChart, PieChart, TrendingUp } from 'lucide-react';

// Register ChartJS components
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

const DataVisualization = ({ content }) => {
  const [chartType, setChartType] = useState('auto');
  const [showTrend, setShowTrend] = useState(false);
  const chartRef = useRef(null);

  // Extract data from content
  const extractData = (text) => {
    const patterns = [
      /[-•*]?\s*([A-Za-z0-9\s]+):\s*\$?\s*([0-9,]+\.?[0-9]*)/g,
      /[-•*]?\s*([A-Za-z0-9\s]+)\s*-\s*\$?\s*([0-9,]+\.?[0-9]*)/g,
      /[-•*]?\s*([A-Za-z0-9\s]+)\s*\(\$?\s*([0-9,]+\.?[0-9]*)\)/g,
    ];

    let matches = [];
    for (const pattern of patterns) {
      const found = [...text.matchAll(pattern)];
      if (found.length >= 2) {
        matches = found;
        break;
      }
    }

    if (matches.length < 2) return null;

    const labels = [];
    const values = [];

    matches.forEach((match) => {
      const label = match[1].trim();
      const value = parseFloat(match[2].replace(/,/g, ''));
      if (!isNaN(value) && label.length > 0 && label.length < 50) {
        labels.push(label);
        values.push(value);
      }
    });

    if (labels.length < 2) return null;

    return { labels, values };
  };

  const data = extractData(content);

  if (!data) return null;

  // Calculate trend line (simple linear regression)
  const calculateTrend = (values) => {
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return values.map((_, i) => slope * i + intercept);
  };

  // Determine chart type
  const getChartType = () => {
    if (chartType !== 'auto') return chartType;
    
    if (data.labels.some(l => /Q[1-4]|20\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(l))) {
      return 'line';
    }
    if (data.labels.length <= 4) {
      return 'pie';
    }
    return 'bar';
  };

  const activeChartType = getChartType();

  // Calculate YoY change if applicable
  const calculateYoYChange = () => {
    if (data.values.length < 2) return null;
    const latest = data.values[data.values.length - 1];
    const previous = data.values[data.values.length - 2];
    const change = ((latest - previous) / previous) * 100;
    return change.toFixed(2);
  };

  const yoyChange = calculateYoYChange();

  const trendData = showTrend ? calculateTrend(data.values) : null;

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Value',
        data: data.values,
        backgroundColor: activeChartType === 'pie' 
          ? [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(249, 115, 22, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)',
            ]
          : 'rgba(59, 130, 246, 0.8)',
        borderColor: activeChartType === 'pie'
          ? [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(249, 115, 22, 1)',
              'rgba(139, 92, 246, 1)',
              'rgba(236, 72, 153, 1)',
            ]
          : 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        tension: 0.4,
      },
      ...(showTrend && trendData ? [{
        label: 'Trend',
        data: trendData,
        type: 'line',
        borderColor: 'rgba(239, 68, 68, 0.8)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: activeChartType === 'pie' || showTrend,
        position: 'bottom',
        labels: {
          font: {
            size: window.innerWidth < 640 ? 10 : 12,
          },
          padding: window.innerWidth < 640 ? 8 : 10,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US').format(context.parsed.y);
            }
            return label;
          }
        }
      },
    },
    scales: activeChartType !== 'pie' ? {
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 12 },
          callback: function(value) {
            return new Intl.NumberFormat('en-US', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value);
          }
        },
      },
      x: {
        ticks: {
          font: { size: 12 },
        },
      },
    } : undefined,
  };


  return (
    <div className="my-3 sm:my-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border shadow-sm" 
         style={{ 
           backgroundColor: 'var(--color-bg-elevated)',
           borderColor: 'var(--color-border)'
         }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            📊 Data Visualization
          </h4>
          {yoyChange && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={parseFloat(yoyChange) > 0
                ? { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)' }
                : { backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error-text)' }
              }
            >
              {parseFloat(yoyChange) > 0 ? '+' : ''}{yoyChange}%
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartType('line')}
            className={`icon-btn p-1 ${activeChartType === 'line' ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
            title="Line chart"
          >
            <LineChart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`icon-btn p-1 ${activeChartType === 'bar' ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
            title="Bar chart"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`icon-btn p-1 ${activeChartType === 'pie' ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
            title="Pie chart"
          >
            <PieChart className="w-3.5 h-3.5" />
          </button>
          {activeChartType !== 'pie' && (
            <button
              onClick={() => setShowTrend(!showTrend)}
              className={`icon-btn p-1 ${showTrend ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
              title="Show trend"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      
      <div className="h-48 sm:h-56 md:h-64">
        {activeChartType === 'line' && <Line ref={chartRef} data={chartData} options={options} />}
        {activeChartType === 'bar' && <Bar ref={chartRef} data={chartData} options={options} />}
        {activeChartType === 'pie' && <Pie ref={chartRef} data={chartData} options={options} />}
      </div>
      
      {/* Summary Stats */}
      <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Min</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {Math.min(...data.values).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Avg</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {(data.values.reduce((a, b) => a + b, 0) / data.values.length).toLocaleString(undefined, {maximumFractionDigits: 0})}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Max</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {Math.max(...data.values).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataVisualization;
