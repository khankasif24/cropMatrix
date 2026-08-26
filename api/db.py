"""
Database Module — Supabase client singleton.

All CropMatrix services import get_supabase() from here.
Compatible with supabase-py 2.31.0.
"""

import os
import httpx

from supabase import create_client, Client, ClientOptions


# ============================================================
# GLOBAL SINGLETONS
# ============================================================

_supabase_client: Client | None = None
_httpx_client: httpx.Client | None = None


# ============================================================
# HTTPX CLIENT
# ============================================================

def _get_httpx_client() -> httpx.Client:
    """
    Create a reusable HTTPX client for Supabase.

    trust_env=False is important on this Windows machine because
    normal HTTPX/Supabase requests were failing with:

        [Errno 11001] getaddrinfo failed

    while direct HTTPX with trust_env=False connected correctly.
    """

    global _httpx_client

    if _httpx_client is None:

        _httpx_client = httpx.Client(
            timeout=httpx.Timeout(
                connect=15.0,
                read=30.0,
                write=30.0,
                pool=30.0,
            ),

            # IMPORTANT FIX
            trust_env=False,

            follow_redirects=True,
        )

    return _httpx_client


# ============================================================
# SUPABASE CLIENT
# ============================================================

def get_supabase() -> Client:
    """
    Return the singleton Supabase client.

    Creates it on the first call and reuses it throughout
    the CropMatrix backend.
    """

    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    # --------------------------------------------------------
    # Load environment configuration
    # --------------------------------------------------------

    url = os.environ.get(
        "SUPABASE_URL",
        ""
    ).strip()

    key = os.environ.get(
        "SUPABASE_KEY",
        ""
    ).strip()

    # --------------------------------------------------------
    # Validate configuration
    # --------------------------------------------------------

    if not url:
        raise RuntimeError(
            "SUPABASE_URL is missing. "
            "Add it to api/.env"
        )

    if not key:
        raise RuntimeError(
            "SUPABASE_KEY is missing. "
            "Add it to api/.env"
        )

    # Avoid URLs such as:
    # https://project.supabase.co/
    url = url.rstrip("/")

    print(
        f"[DB] Connecting to Supabase: {url}"
    )

    try:

        # ----------------------------------------------------
        # Custom HTTPX client
        # ----------------------------------------------------

        http_client = _get_httpx_client()

        # ----------------------------------------------------
        # Supabase options
        # ----------------------------------------------------

        options = ClientOptions(
            schema="public",

            # Pass our working HTTPX client directly
            httpx_client=http_client,

            # Keep normal Supabase auth behaviour
            auto_refresh_token=True,
            persist_session=True,

            postgrest_client_timeout=30,
            storage_client_timeout=30,
            function_client_timeout=30,
        )

        # ----------------------------------------------------
        # Create Supabase client
        # ----------------------------------------------------

        _supabase_client = create_client(
            url,
            key,
            options=options,
        )

        print(
            "[DB] Supabase client created successfully"
        )

        return _supabase_client

    except Exception as e:

        _supabase_client = None

        print(
            "[DB ERROR] Failed to create Supabase client:"
        )

        print(
            f"{type(e).__name__}: {e}"
        )

        raise


# ============================================================
# CONNECTION CHECK
# ============================================================

def check_connection() -> bool:
    """
    Check whether Supabase can actually perform a request.

    The users table is queried with LIMIT 1 only to test
    connectivity.
    """

    try:

        sb = get_supabase()

        response = (
            sb
            .table("users")
            .select("id")
            .limit(1)
            .execute()
        )

        print(
            "[OK] Supabase connection successful"
        )

        return True

    except Exception as e:

        print(
            "[ERROR] Supabase connection failed:"
        )

        print(
            f"{type(e).__name__}: {e}"
        )

        return False


# ============================================================
# RESET CLIENT
# ============================================================

def reset_supabase_client():
    """
    Reset the Supabase singleton.

    Useful during development after changing environment
    variables.
    """

    global _supabase_client

    _supabase_client = None


# ============================================================
# CLEANUP
# ============================================================

def close_supabase():
    """
    Close the custom HTTPX client cleanly.
    """

    global _supabase_client
    global _httpx_client

    _supabase_client = None

    if _httpx_client is not None:

        try:
            _httpx_client.close()
        except Exception:
            pass

        _httpx_client = None