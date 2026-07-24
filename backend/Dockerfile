FROM python:3.12-slim@sha256:c3d81d25b3154142b0b42eb1e61300024426268edeb5b5a26dd7ddf64d9daf28 AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml requirements.lock ./
RUN python -m pip install --requirement requirements.lock

COPY alembic.ini ./
COPY migrations ./migrations
COPY src ./src
COPY scripts ./scripts

RUN python -m pip install --no-deps . \
    && python -m pip check \
    && python scripts/download_pose_model.py \
    && useradd --create-home --uid 10001 posture \
    && chown -R posture:posture /app

ENV POSE_MODEL_PATH=/app/models/pose_landmarker_full.task \
    MIGRATION_ROOT=/app

USER posture

EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=5s --start-period=25s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)"

CMD ["uvicorn", "posture_guardian_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
