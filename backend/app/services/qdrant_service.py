import os
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from fastembed import TextEmbedding
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

class QdrantService:
    def __init__(self):
        if not QDRANT_URL:
            raise ValueError("QDRANT_URL environment variable is not set")
        
        # Connect to remote Qdrant Cloud cluster
        self.client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
        )
        self.collection_name = "college_faq_chunks"
        # BAAI/bge-small-en-v1.5 has 384 dimensions, is fast, and runs locally.
        self.embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        self._ensure_collection()

    def _ensure_collection(self):
        try:
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_names = [col.name for col in collections]
            if self.collection_name not in collection_names:
                # Create collection with 384 dimensions and Cosine similarity
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
                )
                print(f"Created Qdrant collection: {self.collection_name}")
                
                # Create payload indexes
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="category",
                    field_schema="keyword",
                )
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="document_id",
                    field_schema="integer",
                )
                print("Created Qdrant payload indexes.")
            else:
                print(f"Qdrant collection '{self.collection_name}' already exists.")
                # Ensure indexes exist even if collection was pre-created
                try:
                    self.client.create_payload_index(
                        collection_name=self.collection_name,
                        field_name="category",
                        field_schema="keyword",
                    )
                    self.client.create_payload_index(
                        collection_name=self.collection_name,
                        field_name="document_id",
                        field_schema="integer",
                    )
                except Exception as index_err:
                    print(f"Note: payload index creation skipped or already exists: {index_err}")
        except Exception as e:
            print(f"Error initializing Qdrant collection: {e}")

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        # FastEmbed embeds texts in batches and returns a generator
        embeddings_generator = self.embedding_model.embed(texts)
        return [list(emb) for emb in embeddings_generator]

    def embed_query(self, query: str) -> List[float]:
        return self.embed_texts([query])[0]

    async def add_document_chunks(
        self, 
        document_id: int, 
        filename: str, 
        category: str, 
        chunks: List[str]
    ) -> bool:
        if not chunks:
            return True
        
        try:
            # Generate embeddings
            embeddings = self.embed_texts(chunks)
            
            points = []
            for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
                point_id = str(uuid.uuid4())
                points.append(
                    PointStruct(
                        id=point_id,
                        vector=vector,
                        payload={
                            "document_id": document_id,
                            "filename": filename,
                            "category": category.lower(),
                            "text": chunk,
                            "chunk_index": i
                        }
                    )
                )
            
            # Upsert points
            batch_size = 100
            for i in range(0, len(points), batch_size):
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=points[i:i+batch_size]
                )
            return True
        except Exception as e:
            print(f"Error adding document chunks to Qdrant: {e}")
            return False

    async def search_relevant_chunks(
        self, 
        query: str, 
        category: str = "all", 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        try:
            query_vector = self.embed_query(query)
            
            # Define filter by category if not "all"
            search_filter = None
            if category and category.lower() != "all":
                search_filter = Filter(
                    must=[
                        FieldCondition(
                            key="category",
                            match=MatchValue(value=category.lower())
                        )
                    ]
                )
                
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=search_filter,
                limit=limit
            )
            
            hits = []
            for hit in results.points:
                hits.append({
                    "text": hit.payload.get("text"),
                    "filename": hit.payload.get("filename"),
                    "category": hit.payload.get("category"),
                    "document_id": hit.payload.get("document_id"),
                    "score": hit.score
                })
            return hits
        except Exception as e:
            print(f"Error searching Qdrant: {e}")
            return []

    async def delete_document_vectors(self, document_id: int) -> bool:
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id)
                        )
                    ]
                )
            )
            return True
        except Exception as e:
            print(f"Error deleting vectors for document {document_id}: {e}")
            return False
