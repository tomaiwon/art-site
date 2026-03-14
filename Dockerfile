FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir python-telegram-bot==20.7 openai requests python-docx
COPY telegram_bot.py .
CMD ["python", "-u", "telegram_bot.py"]
