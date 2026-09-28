"""
Robust reader for backend/.env (used by manage_admin.py).

python-dotenv silently misses variables in common Windows situations:
  * the file was saved as "UTF-8 with BOM" -> the first key becomes "\\ufeffDATABASE_URL"
  * the file was saved as UTF-16 (e.g. PowerShell `>` / Out-File) -> decode error
  * DATABASE_URL already exists in the environment but is EMPTY -> load_dotenv() won't override it

read_env_file() decodes UTF-8 (with/without BOM) and UTF-16, and strips BOMs from keys.
Values are never printed by this module.
"""
import codecs
import io
import os

from dotenv import dotenv_values

BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_ENV_FILE = os.path.join(BACKEND_DIR, '.env')


def _decode(raw):
    if raw.startswith(codecs.BOM_UTF8):
        return raw[len(codecs.BOM_UTF8):].decode('utf-8'), 'utf-8-sig'
    if raw.startswith(codecs.BOM_UTF16_LE) or raw.startswith(codecs.BOM_UTF16_BE):
        return raw.decode('utf-16'), 'utf-16'
    try:
        return raw.decode('utf-8'), 'utf-8'
    except UnicodeDecodeError:
        return raw.decode('latin-1'), 'latin-1'


def read_env_file(path=BACKEND_ENV_FILE):
    """Return ({KEY: value}, encoding) for the .env file, or ({}, None) if it does not exist."""
    if not os.path.isfile(path):
        return {}, None
    with open(path, 'rb') as f:
        text, encoding = _decode(f.read())
    values = dotenv_values(stream=io.StringIO(text))
    cleaned = {}
    for key, value in values.items():
        if key is None:
            continue
        cleaned[key.strip().lstrip('﻿').strip()] = value
    return cleaned, encoding


def load_backend_env(path=BACKEND_ENV_FILE, authoritative=('DATABASE_URL',)):
    """
    Load backend/.env into os.environ.

    - Keys listed in `authoritative` are taken from the file whenever the file has a non-empty value
      (so a stale/empty Windows environment variable cannot hide it).
    - Other keys only fill variables that are missing or empty (same as python-dotenv).
    Returns a dict with non-secret diagnostics: path, exists, encoding, keys (names only), sources.
    """
    values, encoding = read_env_file(path)
    sources = {}
    for key, value in values.items():
        value = (value or '').strip()
        if not value:
            continue
        current = (os.environ.get(key) or '').strip()
        if key in authoritative or not current:
            os.environ[key] = value
            sources[key] = 'backend/.env'
    for key in authoritative:
        if key not in sources and (os.environ.get(key) or '').strip():
            sources[key] = 'environment'
    return {
        'path': path,
        'exists': os.path.isfile(path),
        'encoding': encoding,
        'keys': sorted(values.keys()),
        'empty_keys': sorted(k for k, v in values.items() if not (v or '').strip()),
        'sources': sources,
    }
