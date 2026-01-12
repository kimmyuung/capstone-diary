@echo off
:menu
cls
echo =================================================
echo       Capstone Diary Docker Manager
echo =================================================
echo 1. Start (No Build)
echo 2. Build & Start (Recommended for updates)
echo 3. Stop Containers
echo 4. Restart Containers
echo 5. View Logs
echo 6. Backend Shell (Access Container)
echo 7. Clean Up (Prune System)
echo 8. Exit
echo =================================================
set /p choice=Select an option (1-8): 

if "%choice%"=="1" goto start
if "%choice%"=="2" goto build_start
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto shell
if "%choice%"=="7" goto clean
if "%choice%"=="8" goto exit

echo Invalid choice. Please try again.
pause
goto menu

:start
echo Starting containers...
docker-compose up -d
pause
goto menu

:build_start
echo Building and starting containers...
docker-compose up -d --build
pause
goto menu

:stop
echo Stopping containers...
docker-compose down
pause
goto menu

:restart
echo Restarting containers...
docker-compose down
docker-compose up -d
pause
goto menu

:logs
echo Showing logs (Ctrl+C to exit logs)...
docker-compose logs -f
pause
goto menu

:shell
echo Accessing backend container shell...
docker-compose exec web bash
pause
goto menu

:clean
echo Pruning docker system (removes unused data)...
docker system prune -a
pause
goto menu

:exit
echo Goodbye!
exit
