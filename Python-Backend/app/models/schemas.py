"""
Pydantic Models for Request/Response Validation
Defines the structure of API requests and responses
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class ProcessDocumentRequest(BaseModel):
    """
    Request model for document processing endpoint
    Sent by Node.js backend when a document is uploaded
    """
    documentId: str = Field(..., description="Unique document ID from MongoDB")
    filePath: str = Field(..., description="Local file path to the uploaded document")
    fileName: str = Field(..., description="Original filename")
    vectorNamespace: str = Field(..., description="Unique namespace for vector storage")
    
    class Config:
        json_schema_extra = {
            "example": {
                "documentId": "507f1f77bcf86cd799439011",
                "filePath": "/path/to/uploads/document.pdf",
                "fileName": "financial_report.pdf",
                "vectorNamespace": "doc-123e4567-e89b-12d3-a456-426614174000"
            }
        }


class QueryRequest(BaseModel):
    """
    Request model for query endpoint
    Sent when user asks a question
    """
    question: str = Field(..., description="User's question")
    chatHistory: List[Dict[str, str]] = Field(
        default=[],
        description="Previous messages in the conversation"
    )
    vectorNamespaces: List[str] = Field(
        default=[],
        description="List of document namespaces to search"
    )
    featureUsed: str = Field(
        default="Smart_Chat",
        description="Conversation mode (Smart_Chat, Document_Analysis, etc.)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "What was the revenue in Q4?",
                "chatHistory": [
                    {"role": "user", "content": "Hello"},
                    {"role": "assistant", "content": "Hi! How can I help?"}
                ],
                "vectorNamespaces": ["doc-123", "doc-456"],
                "featureUsed": "Smart_Chat"
            }
        }


class DeleteDocumentRequest(BaseModel):
    """
    Request model for document deletion
    Sent when a document needs to be removed
    """
    filePath: str = Field(..., description="Local file path to delete")
    vectorNamespace: str = Field(..., description="Vector namespace to delete")
    
    class Config:
        json_schema_extra = {
            "example": {
                "filePath": "/path/to/uploads/document.pdf",
                "vectorNamespace": "doc-123e4567-e89b-12d3-a456-426614174000"
            }
        }

class Citation(BaseModel):
    """Source citation from retrieved document chunks."""
    page: str = Field(default="N/A", description="Page number in source document")
    source: str = Field(default="", description="Source file or extraction type")
    type: str = Field(default="text", description="Content type: text, image, scanned_page, table")
    snippet: str = Field(default="", description="Relevant text excerpt")
    namespace: str = Field(default="", description="Vector namespace identifier")


class QueryResponse(BaseModel):
    """
    Response model for query endpoint
    Returns the AI's answer with optional source citations
    """
    answer: str = Field(..., description="AI-generated answer to the question")
    citations: List[Citation] = Field(default=[], description="Source citations from RAG retrieval")
    documents: Optional[Dict] = Field(default={}, description="Extracted document insights")
    insights: Optional[Dict] = Field(default={}, description="Analytical insights")
    general: Optional[Dict] = Field(default={}, description="General metadata and entities")
    visualizations: Optional[List[Dict]] = Field(default=[], description="Chart data array for Recharts")
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "The revenue in Q4 was $2.5 million, representing a 15% increase from Q3.",
                "citations": [
                    {
                        "page": "12",
                        "source": "annual_report.pdf",
                        "type": "text",
                        "snippet": "Q4 revenue totaled $2.5 million...",
                        "namespace": "doc-abc123"
                    }
                ],
                "documents": {},
                "insights": {},
                "general": {},
                "visualizations": []
            }
        }


class EnterpriseAnalysisRequest(BaseModel):
    """Request for enterprise financial analysis endpoints."""
    analysisType: str = Field(..., description="Type of analysis to perform")
    vectorNamespaces: List[str] = Field(default=[], description="Document namespaces to analyze")
    question: str = Field(default="", description="Optional custom question or focus area")
    chatHistory: List[Dict[str, str]] = Field(default=[], description="Optional chat history for explain mode")


class EnterpriseAnalysisResponse(BaseModel):
    """Response from enterprise analysis endpoints."""
    analysisType: str
    answer: str
    citations: List[Citation] = Field(default=[])
    documents: Optional[Dict] = Field(default={}, description="Document metadata and comparison rows")
    insights: Optional[List[Dict]] = Field(default=[], description="Structured insights such as KPIs, risks, or findings")
    general: Optional[Dict] = Field(default={}, description="General metadata and extracted SWOT details")
    visualizations: Optional[List[Dict]] = Field(default=[], description="Chart payloads for visualization components")
    metadata: Dict = Field(default={})


class EnterpriseChartRequest(BaseModel):
    """Request for enterprise chart extraction endpoint."""
    analysisType: str = Field(..., description="Type of analysis to derive charts from")
    vectorNamespaces: List[str] = Field(default=[], description="Document namespaces to analyze")
    question: str = Field(default="", description="Optional custom question or focus area")
    chatHistory: List[Dict[str, str]] = Field(default=[], description="Optional chat history for explain mode")


class EnterpriseChartResponse(BaseModel):
    """Response from enterprise chart extraction endpoint."""
    analysisType: str
    visualizations: List[Dict] = Field(default=[], description="Chart visualization payload")
    metadata: Dict = Field(default={})


class ProcessDocumentResponse(BaseModel):
    """
    Response model for document processing endpoint
    Confirms processing has started
    """
    message: str = Field(..., description="Status message")
    documentId: str = Field(..., description="Document ID being processed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Document processing started successfully",
                "documentId": "507f1f77bcf86cd799439011"
            }
        }


class HealthResponse(BaseModel):
    """
    Response model for health check endpoint
    """
    status: str = Field(..., description="Service status")
    message: str = Field(..., description="Status message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "message": "FinChatBot Python AI Service is running"
            }
        }
