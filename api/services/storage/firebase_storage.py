import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import firestore
from flask import abort

from services.storage.base import StorageProvider


class FirebaseStorageProvider(StorageProvider):
    def __init__(self):
        self._collection_name = os.getenv('FIRESTORE_COLLECTION', 'engines')
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        self._db = firestore.client()

    def _doc_id(self, name: str, version: str) -> str:
        safe_name = name.replace('/', '_').replace('\\', '_')
        safe_version = version.replace('/', '_').replace('\\', '_')
        return f'{safe_name}_v{safe_version}'

    def list_engines(self) -> list:
        entries = []
        for doc in self._db.collection(self._collection_name).stream():
            data = doc.to_dict()
            entries.append({
                'name': data.get('name', ''),
                'version': data.get('version', ''),
                'saved_at': data.get('saved_at', ''),
            })
        return entries

    def save_engine(self, name: str, version: str, data: dict) -> dict:
        doc_ref = self._db.collection(self._collection_name).document(self._doc_id(name, version))
        if doc_ref.get().exists:
            abort(409, description=f"Engine '{name}' v{version} already exists.")
        payload = {**data, 'name': name, 'version': version, 'saved_at': datetime.now(timezone.utc).isoformat()}
        doc_ref.set(payload)
        return payload

    def get_engine(self, name: str, version: str) -> dict:
        doc = self._db.collection(self._collection_name).document(self._doc_id(name, version)).get()
        if not doc.exists:
            abort(404, description=f"Engine '{name}' v{version} not found.")
        return doc.to_dict()

    def update_engine(self, name: str, version: str, data: dict) -> dict:
        doc_ref = self._db.collection(self._collection_name).document(self._doc_id(name, version))
        if not doc_ref.get().exists:
            abort(404, description=f"Engine '{name}' v{version} not found.")
        payload = {**data, 'name': name, 'version': version, 'saved_at': datetime.now(timezone.utc).isoformat()}
        doc_ref.set(payload)
        return payload

    def delete_engine(self, name: str, version: str) -> None:
        doc_ref = self._db.collection(self._collection_name).document(self._doc_id(name, version))
        if not doc_ref.get().exists:
            abort(404, description=f"Engine '{name}' v{version} not found.")
        doc_ref.delete()
