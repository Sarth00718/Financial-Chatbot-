/**
 * Export Reports Component
 * Export conversations as PDF or formatted documents
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { FileDown, FileText } from 'lucide-react';

const ExportReports = ({ messages, conversationTitle }) => {
  
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Blue
    doc.text(conversationTitle || 'Financial AI Chat Report', margin, yPosition);
    yPosition += 10;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 15;

    // Messages
    doc.setFontSize(11);
    messages.forEach((msg, index) => {
      if (msg.role === 'system') return;

      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      // Role header
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      const roleText = msg.role === 'user' ? '👤 You' : '🤖 AI Assistant';
      doc.text(roleText, margin, yPosition);
      yPosition += 7;

      // Message content
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(msg.content, pageWidth - 2 * margin);
      
      lines.forEach((line) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });

      yPosition += 10;
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${totalPages} | FinChatBot Report`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Save
    const fileName = `${conversationTitle || 'chat'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const exportToMarkdown = () => {
    let markdown = `# ${conversationTitle || 'Financial AI Chat Report'}\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    messages.forEach((msg) => {
      if (msg.role === 'system') return;
      
      const role = msg.role === 'user' ? '👤 **You**' : '🤖 **AI Assistant**';
      markdown += `${role}\n\n`;
      markdown += `${msg.content}\n\n`;
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${conversationTitle || 'chat'}_${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button
        onClick={exportToPDF}
        className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium"
        title="Export as PDF"
      >
        <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">PDF</span>
      </button>
      <button
        onClick={exportToMarkdown}
        className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium"
        title="Export as Markdown"
      >
        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">MD</span>
      </button>
    </div>
  );
};

export default ExportReports;
