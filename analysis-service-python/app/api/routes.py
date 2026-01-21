from fastapi import APIRouter, Depends

from app.core.security import UserContext, get_current_user

router = APIRouter()

@router.get("/ping")
def ping():
    return {"pong": True}

@router.get("/me")
def me(user: UserContext = Depends(get_current_user)):
    return ({"user_id": user.user_id,
             "role": user.role})