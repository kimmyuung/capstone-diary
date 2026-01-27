@echo off
cd backend
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found in backend\venv. Please create it or check path.
)

set DJANGO_SETTINGS_MODULE=config.settings
set TESTING=True

echo Running Tests...
python -m pytest %*
pause
