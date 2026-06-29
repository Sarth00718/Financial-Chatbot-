/**
 * Export Reports
 * Export a conversation as PDF / DOCX / Markdown. Logic unchanged — only the
 * trigger UI was rebuilt as a single MUI menu button.
 */

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { FileDownloadOutlined, PictureAsPdfOutlined, DescriptionOutlined, ArticleOutlined } from '@mui/icons-material';

const ExportReports = ({ messages, conversationTitle }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const closeMenu = () => setAnchorEl(null);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text(conversationTitle || 'Financial AI Chat Report', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 15;

    doc.setFontSize(11);
    messages.forEach((msg) => {
      if (msg.role === 'system') return;

      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      const roleText = msg.role === 'user' ? 'You' : 'AI Assistant';
      doc.text(roleText, margin, yPosition);
      yPosition += 7;

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

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${totalPages} | FinChatBot Report`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.save(`${conversationTitle || 'chat'}_${new Date().toISOString().split('T')[0]}.pdf`);
    closeMenu();
  };

  const exportToMarkdown = () => {
    let markdown = `# ${conversationTitle || 'Financial AI Chat Report'}\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n---\n\n`;

    messages.forEach((msg) => {
      if (msg.role === 'system') return;
      const role = msg.role === 'user' ? '**You**' : '**AI Assistant**';
      markdown += `${role}\n\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${conversationTitle || 'chat'}_${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
    closeMenu();
  };

  const exportToDocx = async () => {
    const children = [
      new Paragraph({ text: conversationTitle || 'Financial AI Chat Report', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, italics: true })] }),
      new Paragraph({ text: '' }),
    ];

    messages.forEach((msg) => {
      if (msg.role === 'system') return;
      children.push(
        new Paragraph({ text: msg.role === 'user' ? 'You' : 'AI Assistant', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: msg.content }),
        new Paragraph({ text: '' }),
      );
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${conversationTitle || 'chat'}_${new Date().toISOString().split('T')[0]}.docx`);
    closeMenu();
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<FileDownloadOutlined fontSize="small" />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ color: 'text.secondary', borderColor: 'divider' }}
      >
        Export
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={exportToPDF}>
          <ListItemIcon><PictureAsPdfOutlined fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Export as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={exportToDocx}>
          <ListItemIcon><DescriptionOutlined fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText>Export as DOCX</ListItemText>
        </MenuItem>
        <MenuItem onClick={exportToMarkdown}>
          <ListItemIcon><ArticleOutlined fontSize="small" color="action" /></ListItemIcon>
          <ListItemText>Export as Markdown</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportReports;
