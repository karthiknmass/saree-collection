import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# In-memory store for active admin session tokens.
# Very reliable for local development as it has no external package dependencies.
ACTIVE_SESSIONS = set()

# Default admin credentials (normally stored hashed in DB or env variables)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin@boutique"

def verify_admin_credentials(username: str, password: str) -> bool:
    """Simple verification of admin username and password."""
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD

def create_session_token() -> str:
    """Generate a secure session token and save it to the active sessions."""
    token = secrets.token_hex(24)
    ACTIVE_SESSIONS.add(token)
    return token

def revoke_session_token(token: str) -> None:
    """Remove a session token when admin logs out."""
    ACTIVE_SESSIONS.discard(token)

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Dependency function to protect admin routes.
    Checks the Authorization header and raises 401 if token is invalid or expired.
    """
    token = credentials.credentials
    if token not in ACTIVE_SESSIONS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or unauthorized admin token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token
