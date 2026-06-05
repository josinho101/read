import os
import json
from datetime import datetime, timezone
from flask import abort

_STORAGE_PATH = os.getenv('ENGINE_STORAGE_PATH', './saved_engines')


def _ensure_dir():
    os.makedirs(_STORAGE_PATH, exist_ok=True)


def _file_path(name: str, version: str) -> str:
    safe_name = name.replace('/', '_').replace('\\', '_')
    safe_version = version.replace('/', '_').replace('\\', '_')
    return os.path.join(_STORAGE_PATH, f'{safe_name}_v{safe_version}.json')


def list_engines() -> list:
    _ensure_dir()
    entries = []
    for filename in os.listdir(_STORAGE_PATH):
        if not filename.endswith('.json'):
            continue
        full_path = os.path.join(_STORAGE_PATH, filename)
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            entries.append({
                'name': data.get('name', ''),
                'version': data.get('version', ''),
                'saved_at': data.get('saved_at', ''),
            })
        except Exception:
            continue
    return entries


def save_engine(name: str, version: str, data: dict) -> dict:
    _ensure_dir()
    path = _file_path(name, version)
    if os.path.exists(path):
        abort(409, description=f"Engine '{name}' v{version} already exists.")
    payload = {**data, 'name': name, 'version': version, 'saved_at': datetime.now(timezone.utc).isoformat()}
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)
    return payload


def get_engine(name: str, version: str) -> dict:
    path = _file_path(name, version)
    if not os.path.exists(path):
        abort(404, description=f"Engine '{name}' v{version} not found.")
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def update_engine(name: str, version: str, data: dict) -> dict:
    path = _file_path(name, version)
    if not os.path.exists(path):
        abort(404, description=f"Engine '{name}' v{version} not found.")
    payload = {**data, 'name': name, 'version': version, 'saved_at': datetime.now(timezone.utc).isoformat()}
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)
    return payload


def delete_engine(name: str, version: str) -> None:
    path = _file_path(name, version)
    if not os.path.exists(path):
        abort(404, description=f"Engine '{name}' v{version} not found.")
    os.remove(path)
