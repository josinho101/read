import os
from functools import lru_cache

from services.storage.local_disk_storage import LocalDiskStorageProvider
from services.storage.firebase_storage import FirebaseStorageProvider


@lru_cache(maxsize=1)
def get_storage_provider():
    storage_type = os.getenv('STORAGE_TYPE', 'local-disk').strip().lower()
    if storage_type == 'firebase':
        return FirebaseStorageProvider()
    return LocalDiskStorageProvider()
