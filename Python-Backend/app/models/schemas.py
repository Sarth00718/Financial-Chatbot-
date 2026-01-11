"""
Pydantic Models for Request/Response Validation
Defines the structure of API requests and responses
"""

from pydantic import BaseModel, Field
from typing import List, Dict

# ============================================
# REQUEST MODELS
# ============================================

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


# ============================================
# RESPONSE MODELS
# ============================================

class QueryResponse(BaseModel):
    """
    Response model for query endpoint
    Returns the AI's answer
    """
    answer: str = Field(..., description="AI-generated answer to the question")
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "The revenue in Q4 was $2.5 million, representing a 15% increase from Q3."
            }
        }


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
