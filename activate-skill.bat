@echo off
setlocal
if "%~1"=="" (
    echo Usage: activate-skill.bat [skill-name]
    echo Example: activate-skill.bat ab-testing
    echo To list skills: activate-skill.bat --list
    exit /b 0
)

powershell -ExecutionPolicy Bypass -File "%~dp0activate-skill.ps1" %*
