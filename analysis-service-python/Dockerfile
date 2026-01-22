FROM python:3.11-slim

# 1. Рабочая директория внутри контейнера
WORKDIR /app

# 2. Сначала зависимости (кеш Docker)
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# 3. Потом код
COPY . .

# 4. Открываем порт
EXPOSE 8000

# 5. Запуск приложения
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
