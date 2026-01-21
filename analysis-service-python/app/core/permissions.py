from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.dto.usercontext import UserContext


def require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user


def require_leader(user: UserContext = Depends(get_current_user)) -> UserContext:
    if user.role not in ("LEADER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Leader access required"
        )
    return user


def require_auditor(user: UserContext = Depends(get_current_user)) -> UserContext:
    if user.role not in ("AUDITOR", "LEADER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Auditor access required"
        )
    return user
