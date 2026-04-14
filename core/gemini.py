import os
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

_client = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01"),
)

_CHAT_DEPLOYMENT = os.environ.get("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini")
_EMBED_DEPLOYMENT = os.environ.get("AZURE_OPENAI_EMBED_DEPLOYMENT", "text-embedding-3-small")


def embed(text: str) -> list[float]:
    """Return embedding vector for text using text-embedding-3-small."""
    result = _client.embeddings.create(
        model=_EMBED_DEPLOYMENT,
        input=text,
    )
    return result.data[0].embedding


def chat(prompt: str) -> str:
    """Send prompt to gpt-4o-mini and return raw text response."""
    response = _client.chat.completions.create(
        model=_CHAT_DEPLOYMENT,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
        temperature=0.7,
    )
    return response.choices[0].message.content
