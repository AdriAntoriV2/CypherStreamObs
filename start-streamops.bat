@echo off
setlocal

set "PROJECT_DIR=D:\Work\Portfolio\streamops"
set "OBS_EXE=C:\Program Files\obs-studio\bin\64bit\obs64.exe"
set "VEADOTUBE_EXE=D:\Stream\veadotube-mini-win-x64\veadotube-mini.exe"
set "PORT=42069"
set "LOG=%PROJECT_DIR%\start-streamops.log"

echo.
echo Starting StreamOps launcher...
echo Log: %LOG%
echo. > "%LOG%"
echo [%date% %time%] Launcher started >> "%LOG%"

if not exist "%PROJECT_DIR%\package.json" (
    echo ERROR: StreamOps project not found.
    echo Project: %PROJECT_DIR% >> "%LOG%"
    goto :fail
)

echo Starting veadotube mini...

if exist "%VEADOTUBE_EXE%" (
    for %%I in ("%VEADOTUBE_EXE%") do set "VEADOTUBE_DIR=%%~dpI"

    powershell -NoProfile -Command "try { Start-Process -FilePath $env:VEADOTUBE_EXE -WorkingDirectory $env:VEADOTUBE_DIR -ErrorAction Stop } catch { Write-Output ($_ | Out-String); exit 1 }"

    if errorlevel 1 (
        echo WARNING: veadotube mini failed to launch.
        echo Check the executable path and error output.
    )
) else (
    echo WARNING: veadotube mini was not found:
    echo %VEADOTUBE_EXE%
)

echo Starting StreamOps...
start "StreamOps" /D "%PROJECT_DIR%" cmd /k "npm run start:dev"

echo Waiting for StreamOps on port %PORT%...

for /L %%i in (1,1,90) do (
    powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', %PORT%); exit 0 } catch { exit 1 } finally { $c.Dispose() }" >nul 2>&1
    if not errorlevel 1 goto :ready
    timeout /t 1 /nobreak >nul
)

echo ERROR: StreamOps did not start within 90 seconds.
echo Check the StreamOps terminal.
echo Startup timeout >> "%LOG%"
goto :fail

:ready
echo StreamOps port is responding.
echo [%date% %time%] StreamOps port ready >> "%LOG%"

if not exist "%OBS_EXE%" (
    echo ERROR: OBS executable not found:
    echo %OBS_EXE%
    echo OBS executable missing >> "%LOG%"
    goto :fail
)

for %%I in ("%OBS_EXE%") do set "OBS_DIR=%%~dpI"

echo Starting OBS as administrator...
echo OBS path: %OBS_EXE%
echo OBS directory: %OBS_DIR%
echo Launching elevated OBS... >> "%LOG%"

powershell -NoProfile -Command "$ErrorActionPreference = 'Stop'; try { Start-Process -FilePath $env:OBS_EXE -WorkingDirectory $env:OBS_DIR -Verb RunAs -ErrorAction Stop; Write-Output 'OBS launch request submitted.' } catch { Write-Output ($_ | Out-String); exit 1 }" >> "%LOG%" 2>&1

if errorlevel 1 (
    echo.
    echo ERROR: Could not launch OBS. See the log below.
    type "%LOG%"
    goto :fail
)

echo OBS launch request submitted.
echo.
echo Launcher finished. StreamOps remains in its own terminal.
goto :end

:fail
echo.
echo Launcher encountered an error.
echo See: %LOG%

:end
echo.
pause
endlocal