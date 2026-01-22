import os
from celery import Celery

# Use the environment variable or fallback to localhost (for local dev without docker)
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery(
    "worker",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Taipei",
    enable_utc=True,
    # Periodic Tasks Schedule
    beat_schedule={
        "fetch-news-every-30-mins": {
            "task": "app.tasks.run_crawler",
            "schedule": 1800.0, # 30 minutes
        },
    },
)
