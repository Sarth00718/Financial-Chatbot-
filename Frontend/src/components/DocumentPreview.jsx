/**
 * Document Preview Component
 * Shows uploaded documents with status and preview options
 */

import { useState, useEffect } from 'react';
import { FileText, X, Trash2, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { documentAPI } from '../utils/api';

const DocumentPreview = ({ conversationId, isOpen, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchDocuments();
    }
  }, [isOpen, conversationId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentAPI.getByConversation(conversationId);
      setDocuments(response.data.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;

    try {
      await documentAPI.delete(docId);
      setDocuments((prev) => prev.filter((doc) => doc._id !== docId));
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'processed':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'failed':
        return 'Failed';
      default:
        return 'Uploading...';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-800">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Documents</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-400">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'} uploaded
            </p>
          </div>

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center mt-24">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-slate-600" />
                </div>
                <p className="text-sm text-slate-400 font-medium">No documents yet</p>
                <p className="text-xs text-slate-500 mt-1">Upload files to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(doc.status)}
                          <span className="text-xs text-slate-400">
                            {getStatusText(doc.status)}
                          </span>
                        </div>
                        {doc.errorMessage && (
                          <p className="text-xs text-red-400 mt-1">{doc.errorMessage}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(doc.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-all duration-200"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DocumentPreview;
