"""
Local Vector Store Service (FAISS)
Replaces Pinecone with local FAISS vector database
Handles storage and retrieval of document embeddings
"""

import os
import shutil
from typing import List
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from app.config.settings import settings

class LocalVectorStore:
    """
    Manages local FAISS vector stores for document embeddings
    Each document gets its own namespace (separate FAISS index)
    """
    
    def __init__(self):
        """Initialize the vector store manager"""
        self.vector_store_path = settings.VECTOR_STORE_PATH
        
        # Ensure vector store directory exists
        os.makedirs(self.vector_store_path, exist_ok=True)
        print(f"[OK] Vector store directory: {self.vector_store_path}")
        
        self.embeddings = self._get_embeddings()
        
    def _get_embeddings(self) -> HuggingFaceEmbeddings:
        """
        Initialize HuggingFace embeddings model
        Uses a lightweight model that runs locally on CPU
        """
        try:
            embeddings = HuggingFaceEmbeddings(
                model_name=settings.EMBEDDING_MODEL,
                model_kwargs={'device': 'cpu'},
                encode_kwargs={'normalize_embeddings': True}
            )
            print(f"[OK] Embeddings model loaded: {settings.EMBEDDING_MODEL}")
            return embeddings
        except Exception as e:
            raise RuntimeError(f"Failed to load embeddings model: {e}")
    
    def _get_namespace_path(self, namespace: str) -> str:
        """
        Get the file path for a specific namespace
        Each namespace is stored as a separate FAISS index file
        """
        return os.path.join(self.vector_store_path, f"{namespace}.faiss")
    
    def create_vector_store(self, documents: List[Document], namespace: str) -> None:
        """
        Create a new FAISS vector store from documents
        
        Args:
            documents: List of LangChain Document objects to embed
            namespace: Unique identifier for this document's vector store
        """
        try:
            print(f"Creating vector store for namespace: {namespace}")
            print(f"Number of document chunks: {len(documents)}")
            
            # Create FAISS vector store from documents
            vectorstore = FAISS.from_documents(
                documents=documents,
                embedding=self.embeddings
            )
            
            # Save to disk
            namespace_path = self._get_namespace_path(namespace)
            vectorstore.save_local(namespace_path)
            
            print(f"[OK] Vector store created and saved: {namespace_path}")
            
        except Exception as e:
            print(f"[ERROR] Error creating vector store for {namespace}: {e}")
            raise
    
    def load_vector_store(self, namespace: str) -> FAISS:
        """
        Load an existing FAISS vector store from disk
        
        Args:
            namespace: Unique identifier for the vector store
            
        Returns:
            FAISS vector store object
        """
        try:
            namespace_path = self._get_namespace_path(namespace)
            
            if not os.path.exists(namespace_path):
                raise FileNotFoundError(f"Vector store not found: {namespace}")
            
            # Load FAISS index from disk
            vectorstore = FAISS.load_local(
                namespace_path,
                self.embeddings,
                allow_dangerous_deserialization=True  # Required for pickle loading
            )
            
            print(f"[OK] Vector store loaded: {namespace}")
            return vectorstore
            
        except Exception as e:
            print(f"[ERROR] Error loading vector store {namespace}: {e}")
            raise
    
    def search(self, query: str, namespaces: List[str], k: int = 5) -> List[Document]:
        """
        Search across multiple vector stores (namespaces)
        
        Args:
            query: Search query text
            namespaces: List of namespace identifiers to search
            k: Number of results to return per namespace
            
        Returns:
            List of relevant Document objects
        """
        try:
            all_results = []
            
            # Search each namespace
            for namespace in namespaces:
                try:
                    # Load vector store for this namespace
                    vectorstore = self.load_vector_store(namespace)
                    
                    # Perform similarity search
                    results = vectorstore.similarity_search(query, k=k)
                    all_results.extend(results)
                    
                    print(f"Found {len(results)} results in namespace: {namespace}")
                    
                except FileNotFoundError:
                    print(f"[WARNING] Namespace not found, skipping: {namespace}")
                    continue
                except Exception as e:
                    print(f"[WARNING] Error searching namespace {namespace}: {e}")
                    continue
            
            print(f"Total results found: {len(all_results)}")
            return all_results
            
        except Exception as e:
            print(f"[ERROR] Error during search: {e}")
            return []
    
    def delete_vector_store(self, namespace: str) -> bool:
        """
        Delete a vector store from disk
        
        Args:
            namespace: Unique identifier for the vector store
            
        Returns:
            True if successful, False otherwise
        """
        try:
            namespace_path = self._get_namespace_path(namespace)
            
            # Check if directory exists
            if os.path.exists(namespace_path):
                # Remove entire directory and all its contents
                shutil.rmtree(namespace_path)
                print(f"[OK] Vector store deleted: {namespace}")
                return True
            else:
                # Also check for legacy single-file format
                legacy_file = f"{namespace_path}.faiss"
                legacy_pkl = f"{namespace_path}.pkl"
                
                deleted = False
                if os.path.exists(legacy_file):
                    os.remove(legacy_file)
                    deleted = True
                if os.path.exists(legacy_pkl):
                    os.remove(legacy_pkl)
                    deleted = True
                
                if deleted:
                    print(f"[OK] Legacy vector store files deleted: {namespace}")
                    return True
                else:
                    print(f"[WARNING] Vector store not found: {namespace}")
                    return False
                
        except Exception as e:
            print(f"[ERROR] Error deleting vector store {namespace}: {e}")
            return False
    
    def namespace_exists(self, namespace: str) -> bool:
        """
        Check if a vector store exists for a namespace
        
        Args:
            namespace: Unique identifier to check
            
        Returns:
            True if exists, False otherwise
        """
        namespace_path = self._get_namespace_path(namespace)
        return os.path.exists(namespace_path)


# Create global vector store instance
vector_store = LocalVectorStore()
