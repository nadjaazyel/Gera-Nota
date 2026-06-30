@echo off
title Iniciar GeraNota
color 0A

echo ====================================
echo        INICIANDO O GERANOTA
echo ====================================
echo.
echo Aguarde, ligando o servidor...
echo.

:: Vai para a pasta do backend
cd /d "%~dp0\back"

:: Abre o navegador no endereço do sistema
start http://localhost:3333

:: Inicia o servidor Node
call npm run dev

pause
