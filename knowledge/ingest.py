import json
import numpy as np
from pathlib import Path
from pypdf import PdfReader
from core.gemini import embed

BASE_DIR = Path(__file__).parent.parent
CACHE_FILE = BASE_DIR / "knowledge" / "embeddings_cache.json"

SOURCES = [
    {
        "path": BASE_DIR / "Gemini-Research.txt" / "research.txt",
        "source": "research",
        "file_type": "text",
    },
    {
        "path": BASE_DIR / "Tupil-Monsella-PDF's" / "brochure small.pdf",
        "source": "tulip",
        "file_type": "pdf",
    },
    {
        "path": BASE_DIR / "Westin-Residences-Brochure" / "The Westin Residences, Gurugram.pdf",
        "source": "westin",
        "file_type": "pdf",
    },
    {
        "path": BASE_DIR / "Westin-Residences-Brochure" / "Westin-Residences-Gurugram-WhatsApp-CP Docket.pdf",
        "source": "westin",
        "file_type": "pdf",
    },
]

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "pricing": ["price", "crore", "cost", "rate", "sqft", "sq ft", "payment", "rera", "₹"],
    "amenities": ["clubhouse", "pool", "gym", "yoga", "spa", "tennis", "amenity", "recreation", "skyhub"],
    "location": ["sector", "expressway", "metro", "airport", "connectivity", "distance", "highway"],
    "specs": ["bhk", "carpet", "super area", "floor", "tower", "configuration", "bedroom", "balcony"],
    "investment": ["roi", "appreciation", "rental", "yield", "investment", "nri", "return", "cagr"],
    "security": ["security", "cctv", "biometric", "rfid", "camera", "surveillance", "panic"],
}


def _detect_category(text: str) -> str:
    text_lower = text.lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return category
    return "general"


def _read_text_file(path: Path) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)


def _chunk(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def _load_cache() -> list[dict] | None:
    if not CACHE_FILE.exists():
        return None
    print("[ingest] Loading embeddings from cache...")
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    chunks = []
    for item in raw:
        chunks.append({
            "text": item["text"],
            "embedding": np.array(item["embedding"], dtype=np.float32),
            "source": item["source"],
            "category": item["category"],
        })
    print(f"[ingest] Cache loaded: {len(chunks)} chunks.")
    return chunks


def _save_cache(chunks: list[dict]) -> None:
    serializable = [
        {
            "text": c["text"],
            "embedding": c["embedding"].tolist(),
            "source": c["source"],
            "category": c["category"],
        }
        for c in chunks
    ]
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(serializable, f)
    print(f"[ingest] Embeddings cached to {CACHE_FILE}")


def build_knowledge_base() -> list[dict]:
    """Load from cache if available, otherwise embed all sources and cache."""
    cached = _load_cache()
    if cached is not None:
        return cached

    print("[ingest] No cache found — building from source documents...")
    all_chunks: list[dict] = []

    for source in SOURCES:
        path: Path = source["path"]
        if not path.exists():
            print(f"[ingest] WARNING: {path} not found, skipping.")
            continue

        print(f"[ingest] Loading {path.name} ({source['source']})...")

        if source["file_type"] == "text":
            raw_text = _read_text_file(path)
        else:
            raw_text = _read_pdf(path)

        chunks = _chunk(raw_text)
        print(f"[ingest]   {len(chunks)} chunks, embedding...")

        for chunk_text in chunks:
            embedding = embed(chunk_text)
            all_chunks.append({
                "text": chunk_text,
                "embedding": np.array(embedding, dtype=np.float32),
                "source": source["source"],
                "category": _detect_category(chunk_text),
            })

    print(f"[ingest] Knowledge base ready: {len(all_chunks)} chunks total.")
    _save_cache(all_chunks)
    return all_chunks
