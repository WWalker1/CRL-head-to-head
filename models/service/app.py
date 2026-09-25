"""Authenticated CPU inference with bounded requests and one active scoring job."""
from contextlib import asynccontextmanager
from pathlib import Path
import hmac
import json
import os
import threading
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict
from .model import Runtime
from .search import DeckSearch

BUNDLE = Path(os.getenv('MODEL_BUNDLE', Path(__file__).resolve().parents[1] / 'data' / 'bundle'))
runtime = None
searcher = None
gate = threading.BoundedSemaphore(1)

def boot():
    global runtime, searcher
    if runtime is None:
        runtime = Runtime(BUNDLE)
        runtime.predict(json.loads((BUNDLE / 'examples.json').read_text())[0]['decks'])
        searcher = DeckSearch(runtime)

@asynccontextmanager
async def lifespan(app):
    if not os.getenv('MODEL_SERVICE_TOKEN'): raise RuntimeError('Set MODEL_SERVICE_TOKEN before starting the service.')
    boot()
    yield

app = FastAPI(title='Rival Royale Model Service', version='1', lifespan=lifespan)

class PredictRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    decks: list[dict] = Field(min_length=2, max_length=2)

class WeightedOpponent(BaseModel):
    deck: dict
    weight: float = Field(gt=0, le=1e9, allow_inf_nan=False)

class SearchRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    locked: list[str] = Field(default_factory=list, max_length=8)
    excluded: list[str] = Field(default_factory=list, max_length=256)
    level: int = Field(default=16, ge=1, le=16, strict=True)
    tower_id: int | None = None
    tower_level: int = Field(default=16, ge=1, le=16, strict=True)
    budget: int = Field(default=512, ge=32, le=1536, strict=True)

class CounterRequest(SearchRequest):
    target: dict | None = None
    targets: list[WeightedOpponent] | None = Field(default=None, min_length=1, max_length=3)

@app.middleware('http')
async def boundary(request: Request, call_next):
    if request.url.path not in ('/health', '/ready'):
        token = os.getenv('MODEL_SERVICE_TOKEN', '')
        if not token or not hmac.compare_digest(request.headers.get('authorization', ''), f'Bearer {token}'):
            return JSONResponse({'error': 'Unauthorized'}, status_code=401)
    if request.method == 'POST':
        size = 0; chunks = []
        async for chunk in request.stream():
            size += len(chunk)
            if size > 32768: return JSONResponse({'error': 'Request too large'}, status_code=413)
            chunks.append(chunk)
        request._body = b''.join(chunks)
    return await call_next(request)

@app.get('/health')
def health(): return {'status': 'ok'}

@app.get('/ready')
def ready():
    if runtime is None: raise HTTPException(503, 'Model is not loaded')
    return {'ready': True, 'model_version': runtime.manifest['model_id']}

@app.get('/catalog')
def catalog(): return runtime.catalog

@app.get('/examples')
def examples(): return json.loads((BUNDLE / 'examples.json').read_text())

def guarded(operation):
    if not gate.acquire(blocking=False): raise HTTPException(429, 'The model is busy. Retry shortly.')
    try: return operation()
    except (ValueError, TypeError, KeyError, AttributeError) as error:
        raise HTTPException(400, str(error)) from error
    finally: gate.release()

@app.post('/predict')
def predict(body: PredictRequest): return guarded(lambda: runtime.predict(body.decks))

@app.post('/counter')
def counter(body: CounterRequest):
    if (body.target is None) == (body.targets is None): raise HTTPException(400, 'Supply one target deck or a weighted list of targets.')
    return guarded(lambda: searcher.run(**body.model_dump()))

@app.post('/complete')
def complete(body: SearchRequest): return guarded(lambda: searcher.run(**body.model_dump()))
