from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.dto.usercontext import UserContext

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

JWT_SECRET = "super-secret-key-super-secret-key-super-secret-key"
JWT_ALGORITHM = "HS256"

def get_current_user(token: str = Depends(oauth2_scheme)) -> UserContext:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        user_id : str | None = payload.get("sub")
        role : str | None = payload.get("role")

        if user_id is None or role is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

        return UserContext(user_id = user_id, role = role)

    except JWTError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error))