import numpy as np
from core.gemini import embed

_knowledge_base: list[dict] = []


def load(chunks: list[dict]) -> None:
    global _knowledge_base
    _knowledge_base = chunks


def retrieve(query: str, top_k: int = 5, source_bias: str | None = None) -> list[dict]:
    if not _knowledge_base:
        return []

    query_embedding = np.array(embed(query), dtype=np.float32)

    scored = []
    for chunk in _knowledge_base:
        score = _cosine_similarity(query_embedding, chunk["embedding"])
        if source_bias and chunk["source"] == source_bias:
            score *= 1.3
        scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [c for _, c in scored[:top_k]]

    if source_bias and not any(c["source"] == "research" for c in top_chunks):
        research_candidates = [(s, c) for s, c in scored if c["source"] == "research"]
        if research_candidates:
            top_chunks[-1] = research_candidates[0][1]

    return top_chunks


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a)) * float(np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


def chunk_count() -> int:
    return len(_knowledge_base)
