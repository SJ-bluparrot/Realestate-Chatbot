import numpy as np
from unittest.mock import patch
from knowledge.retriever import load, retrieve, chunk_count, _cosine_similarity


MOCK_CHUNKS = [
    {
        "text": "Westin Residences pricing starts at 5.75 Crore for 3 BHK",
        "embedding": np.array([1.0, 0.0, 0.0], dtype=np.float32),
        "source": "westin",
        "category": "pricing",
    },
    {
        "text": "Tulip Monsella 4 BHK units priced from 11.25 Crore",
        "embedding": np.array([0.0, 1.0, 0.0], dtype=np.float32),
        "source": "tulip",
        "category": "pricing",
    },
    {
        "text": "Golf Course Road appreciation forecast 8-10% CAGR",
        "embedding": np.array([0.0, 0.0, 1.0], dtype=np.float32),
        "source": "research",
        "category": "investment",
    },
]


def test_load_sets_chunk_count():
    load(MOCK_CHUNKS)
    assert chunk_count() == 3


def test_retrieve_returns_top_k():
    load(MOCK_CHUNKS)
    with patch("knowledge.retriever.embed", return_value=[1.0, 0.0, 0.0]):
        results = retrieve("Westin price", top_k=2)
    assert len(results) == 2


def test_retrieve_first_result_most_similar():
    load(MOCK_CHUNKS)
    with patch("knowledge.retriever.embed", return_value=[1.0, 0.0, 0.0]):
        results = retrieve("Westin price", top_k=3)
    assert results[0]["source"] == "westin"


def test_retrieve_source_bias_boosts_matching_chunks():
    load(MOCK_CHUNKS)
    with patch("knowledge.retriever.embed", return_value=[0.577, 0.577, 0.577]):
        results = retrieve("property details", top_k=2, source_bias="tulip")
    assert results[0]["source"] == "tulip"


def test_retrieve_ensures_research_chunk_with_bias():
    load(MOCK_CHUNKS)
    with patch("knowledge.retriever.embed", return_value=[1.0, 0.0, 0.0]):
        results = retrieve("Westin price", top_k=2, source_bias="westin")
    sources = [r["source"] for r in results]
    assert "research" in sources


def test_retrieve_returns_empty_when_not_loaded():
    load([])
    with patch("knowledge.retriever.embed", return_value=[1.0, 0.0, 0.0]):
        results = retrieve("anything")
    assert results == []


def test_cosine_similarity_identical_vectors():
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    assert abs(_cosine_similarity(a, a) - 1.0) < 1e-6


def test_cosine_similarity_orthogonal_vectors():
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    b = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    assert abs(_cosine_similarity(a, b)) < 1e-6


def test_cosine_similarity_zero_vector():
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    b = np.array([0.0, 0.0, 0.0], dtype=np.float32)
    assert _cosine_similarity(a, b) == 0.0
