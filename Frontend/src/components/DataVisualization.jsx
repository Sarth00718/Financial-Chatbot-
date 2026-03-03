/**
 * Data Visualization Component
 * Auto-generates charts from financial data in messages
 */

import { useEffect, useRef } from 'react';
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
  // Extract data from content
  const extractData = (text) => {
    // Look for patterns like:
    // Q1: 100, Q2: 150, Q3: 200
    // Revenue: 1000, Expenses: 800
    // 2021: 50, 2022: 75, 2023: 100
    // - Q1 2024: $1,200,000
    // - Revenue: $50,000

    const patterns = [
      // Pattern 1: Label: $Number or Label: Number (with optional bullet/dash)
      /[-•*]?\s*([A-Za-z0-9\s]+):\s*\$?\s*([0-9,]+\.?[0-9]*)/g,
      // Pattern 2: Label - $Number or Label - Number
      /[-•*]?\s*([A-Za-z0-9\s]+)\s*-\s*\$?\s*([0-9,]+\.?[0-9]*)/g,
      // Pattern 3: Label ($Number) or Label (Number)
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

    // Need at least 2 data points to create a chart
    if (labels.length < 2) return null;

    return { labels, values };
  };

  const data = extractData(content);

  if (!data) return null;

  // Determine chart type based on data
  const getChartType = () => {
    // If labels look like quarters or years, use line chart
    if (data.labels.some(l => /Q[1-4]|20\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(l))) {
      return 'line';
    }
    // If 2-4 items, use pie chart
    if (data.labels.length <= 4) {
      return 'pie';
    }
    // Default to bar chart
    return 'bar';
  };

  const chartType = getChartType();

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Value',
        data: data.values,
        backgroundColor: chartType === 'pie' 
          ? [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(249, 115, 22, 0.8)',
              'rgba(139, 92, 246, 0.8)',
            ]
          : 'rgba(59, 130, 246, 0.8)',
        borderColor: chartType === 'pie'
          ? [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(249, 115, 22, 1)',
              'rgba(139, 92, 246, 1)',
            ]
          : 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: window.innerWidth < 640 ? 1.5 : 2,
    plugins: {
      legend: {
        display: chartType === 'pie',
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
    },
    scales: chartType !== 'pie' ? {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: window.innerWidth < 640 ? 10 : 12,
          },
        },
      },
      x: {
        ticks: {
          font: {
            size: window.innerWidth < 640 ? 10 : 12,
          },
        },
      },
    } : undefined,
  };

  return (
    <div className="my-3 sm:my-4 p-3 sm:p-4 bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h4 className="text-xs sm:text-sm font-semibold text-gray-700">📊 Data Visualization</h4>
        <span className="text-xs text-gray-500 capitalize">{chartType} Chart</span>
      </div>
      <div className="h-48 sm:h-56 md:h-64">
        {chartType === 'line' && <Line data={chartData} options={options} />}
        {chartType === 'bar' && <Bar data={chartData} options={options} />}
        {chartType === 'pie' && <Pie data={chartData} options={options} />}
      </div>
    </div>
  );
};

export default DataVisualization;
