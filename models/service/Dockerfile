FROM python:3.13-slim
WORKDIR /app
COPY models/service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY models/service /app/service
COPY models/data/bundle /app/data/bundle
ENV MODEL_BUNDLE=/app/data/bundle
EXPOSE 8768
CMD ["python", "-m", "service"]
