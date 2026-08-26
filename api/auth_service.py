"""
Auth Service — Supabase-based user registration, login, and JWT management.
"""

import os
import bcrypt
import jwt
from datetime import datetime, timedelta

from db import get_supabase

# ── Configuration ─────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "smartcrop-sih25010-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30


def init_db():
    """Verify Supabase connection at startup. Tables must already exist in Supabase."""
    try:
        from db import check_connection
        if check_connection():
            print("  [OK] Supabase database connected")
        else:
            print("  [WARN] Supabase connection failed -- auth features will not work")
    except Exception as e:
        print(f"  [WARN] Supabase connection error: {e} -- continuing without DB auth")


def _generate_token(user_id: int, phone: str, name: str) -> str:
    """Generate a JWT token for a user."""
    payload = {
        "user_id": user_id,
        "phone": phone,
        "name": name,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def register_user(phone: str, password: str, name: str = "") -> dict:
    """
    Register a new user. Returns {"token": ..., "user": {...}}.
    Raises ValueError if phone already exists or connection fails.
    """
    phone = phone.strip()
    if not phone or not password:
        raise ValueError("Phone and password are required")

    try:
        sb = get_supabase()

        # Check if phone already exists
        existing = sb.table("users").select("id").eq("phone", phone).execute()
        if existing.data and len(existing.data) > 0:
            raise ValueError("A user with this phone number already exists")

        # Hash password
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # Insert user
        result = sb.table("users").insert({
            "phone": phone,
            "password": hashed,
            "name": name.strip(),
        }).execute()

        if not result.data or len(result.data) == 0:
            raise ValueError("Failed to create user")

        user = result.data[0]
        user_id = user["id"]

        # Create empty profile for the user
        sb.table("profiles").insert({
            "user_id": user_id,
            "name": name.strip(),
        }).execute()

        token = _generate_token(user_id, phone, name)
        return {
            "token": token,
            "user": {"id": user_id, "phone": phone, "name": name},
        }
    except Exception as e:
        if isinstance(e, ValueError):
            raise e
        raise ValueError(f"Database connection error: {str(e)}")


def login_user(phone: str, password: str) -> dict:
    """
    Login a user. Returns {"token": ..., "user": {...}}.
    Raises ValueError if credentials are invalid or connection fails.
    """
    phone = phone.strip()
    if not phone or not password:
        raise ValueError("Phone and password are required")

    try:
        sb = get_supabase()

        result = sb.table("users").select("id, phone, password, name").eq("phone", phone).execute()

        if not result.data or len(result.data) == 0:
            raise ValueError("Invalid phone number or password")

        row = result.data[0]

        if not bcrypt.checkpw(password.encode("utf-8"), row["password"].encode("utf-8")):
            raise ValueError("Invalid phone number or password")

        token = _generate_token(row["id"], row["phone"], row["name"])
        return {
            "token": token,
            "user": {"id": row["id"], "phone": row["phone"], "name": row["name"]},
        }
    except Exception as e:
        if isinstance(e, ValueError):
            raise e
        raise ValueError(f"Database connection error: {str(e)}")


def get_current_user(token: str) -> dict:
    """
    Decode a JWT token and return the user payload.
    Raises ValueError if token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {
            "user_id": payload["user_id"],
            "phone": payload["phone"],
            "name": payload.get("name", ""),
        }
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired. Please login again.")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token. Please login again.")


def google_login(access_token: str) -> dict:
    """
    Authenticate a user via Google OAuth using a Supabase access token.
    1. Verify the token with Supabase to get user email & name
    2. Find or create the user in our users table
    3. Return our standard JWT token

    Returns {"token": ..., "user": {...}}.
    Raises ValueError if token is invalid or connection fails.
    """
    try:
        sb = get_supabase()

        # Verify the Supabase access token and get user info
        try:
            user_response = sb.auth.get_user(access_token)
            if not user_response or not user_response.user:
                raise ValueError("Invalid Google authentication token")
        except Exception as e:
            raise ValueError(f"Failed to verify Google token: {str(e)}")

        supabase_user = user_response.user
        email = supabase_user.email
        name = ""

        # Extract name from user metadata
        if supabase_user.user_metadata:
            name = supabase_user.user_metadata.get("full_name", "") or \
                   supabase_user.user_metadata.get("name", "")

        if not email:
            raise ValueError("Could not get email from Google account")

        # Check if user already exists by email
        existing = sb.table("users").select("id, phone, name, email, auth_provider").eq("email", email).execute()

        if existing.data and len(existing.data) > 0:
            # User exists — log them in
            user = existing.data[0]
            user_id = user["id"]
            user_name = user["name"] or name
            user_phone = user.get("phone", email)

            # Update name if it was empty before
            if not user["name"] and name:
                sb.table("users").update({"name": name}).eq("id", user_id).execute()

            token = _generate_token(user_id, user_phone, user_name)
            return {
                "token": token,
                "user": {"id": user_id, "phone": user_phone, "name": user_name, "email": email},
            }
        else:
            # New user — create account
            import secrets
            random_pw = secrets.token_urlsafe(32)
            hashed = bcrypt.hashpw(random_pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

            result = sb.table("users").insert({
                "phone": email,  # Use email as phone field for Google users
                "email": email,
                "password": hashed,
                "name": name,
                "auth_provider": "google",
            }).execute()

            if not result.data or len(result.data) == 0:
                raise ValueError("Failed to create user account")

            user = result.data[0]
            user_id = user["id"]

            # Create empty profile
            sb.table("profiles").insert({
                "user_id": user_id,
                "name": name,
            }).execute()

            token = _generate_token(user_id, email, name)
            return {
                "token": token,
                "user": {"id": user_id, "phone": email, "name": name, "email": email},
            }
    except Exception as e:
        if isinstance(e, ValueError):
            raise e
        raise ValueError(f"Database connection error: {str(e)}")