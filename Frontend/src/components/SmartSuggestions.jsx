/**
 * Smart Suggestions Component
 * Shows suggested follow-up questions based on context.
 * Uses CSS custom properties for full dark/light mode support.
 */

import { Lightbulb, ArrowRight } from 'lucide-react';

const SmartSuggestions = ({ lastMessage, documents, onSuggestionClick, disabled }) => {
  
  const generateSuggestions = () => {
    const suggestions = [];

    // If no documents uploaded
    if (!documents || documents.length === 0) {
      return [
        "Upload a financial document to get started",
        "What can you help me with?",
        "Explain financial terms",
      ];
    }

    // Based on last message content
    if (lastMessage) {
      const content = lastMessage.content.toLowerCase();
      
      // Revenue related
      if (content.includes('revenue') || content.includes('sales')) {
        suggestions.push(
          "What were the expenses?",
          "Calculate the profit margin",
          "Compare with previous quarter"
        );
      }
      // Profit related
      else if (content.includes('profit') || content.includes('income')) {
        suggestions.push(
          "What's the year-over-year growth?",
          "Show me the expense breakdown",
          "What are the key drivers?"
        );
      }
      // Expense related
      else if (content.includes('expense') || content.includes('cost')) {
        suggestions.push(
          "Which category has the highest cost?",
          "How can we reduce expenses?",
          "Compare with budget"
        );
      }
      // Growth related
      else if (content.includes('growth') || content.includes('increase')) {
        suggestions.push(
          "What's driving this growth?",
          "Is this sustainable?",
          "Show me the trend analysis"
        );
      }
      // General financial document
      else {
        suggestions.push(
          "Summarize the key financial metrics",
          "What are the main highlights?",
          "Show me the revenue trends"
        );
      }
    } else {
      // Default suggestions
      suggestions.push(
        "Summarize this document",
        "What are the key financial metrics?",
        "Show me revenue and profit trends"
      );
    }

    return suggestions.slice(0, 3);
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0 || disabled) return null;

  return (
    <div
      className="my-3 sm:my-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border"
      style={{
        background: 'linear-gradient(135deg, var(--color-info-bg), var(--color-primary-50))',
        borderColor: 'rgba(59, 130, 246, 0.25)',
      }}
    >
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        <Lightbulb
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
          style={{ color: 'var(--color-primary-500)' }}
        />
        <h4
          className="text-xs sm:text-sm font-semibold"
          style={{ color: 'var(--color-info-text)' }}
        >
          Suggested Questions
        </h4>
      </div>
      <div className="space-y-1.5 sm:space-y-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            disabled={disabled}
            className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 text-left rounded-lg border transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              borderColor: 'var(--color-border)',
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                e.currentTarget.style.borderColor = 'var(--color-border-focus)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-surface)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <span
              className="text-xs sm:text-sm flex-1 pr-2 text-left"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {suggestion}
            </span>
            <ArrowRight
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors flex-shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SmartSuggestions;
