@echo off
echo Starting Celery Worker with Eventlet (Windows Compatible)...
echo Ensure Redis is running!
python -m celery -A config worker -l info -P eventlet
