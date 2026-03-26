from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from .settings import get_settings


@contextmanager
def get_db() -> Iterator[psycopg.Connection]:
    settings = get_settings()
    connection = psycopg.connect(settings.database_url, row_factory=dict_row)
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()
