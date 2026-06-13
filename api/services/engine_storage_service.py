from services.storage.factory import get_storage_provider


def list_engines() -> list:
    return get_storage_provider().list_engines()


def save_engine(name: str, version: str, data: dict) -> dict:
    return get_storage_provider().save_engine(name, version, data)


def get_engine(name: str, version: str) -> dict:
    return get_storage_provider().get_engine(name, version)


def update_engine(name: str, version: str, data: dict) -> dict:
    return get_storage_provider().update_engine(name, version, data)


def delete_engine(name: str, version: str) -> None:
    get_storage_provider().delete_engine(name, version)
