@echo off
rem run_bake.cmd - runs run_bake.ps1 (Blender lightmap bake). Arguments: smoke|fast|normal|high|check|pick  [both|day|night]
rem   run_bake.cmd            -> normal quality, day and night
rem   run_bake.cmd smoke      -> under-5-minute smoke test
rem   run_bake.cmd check      -> show which Blender is found and its version
rem   run_bake.cmd pick       -> choose blender.exe in a file dialog (remembered)
setlocal
set "Q=%~1"
if "%Q%"=="" set "Q=normal"
set "T=%~2"
if "%T%"=="" set "T=both"
if /i "%Q%"=="check" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_bake.ps1" -CheckOnly
  exit /b %ERRORLEVEL%
)
if /i "%Q%"=="pick" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_bake.ps1" -PickBlender
  exit /b %ERRORLEVEL%
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_bake.ps1" -Quality %Q% -Time %T%
exit /b %ERRORLEVEL%
