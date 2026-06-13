from abc import ABC, abstractmethod


class StorageProvider(ABC):
    @abstractmethod
    def list_engines(self) -> list:
        ...

    @abstractmethod
    def save_engine(self, name: str, version: str, data: dict) -> dict:
        ...

    @abstractmethod
    def get_engine(self, name: str, version: str) -> dict:
        ...

    @abstractmethod
    def update_engine(self, name: str, version: str, data: dict) -> dict:
        ...

    @abstractmethod
    def delete_engine(self, name: str, version: str) -> None:
        ...
