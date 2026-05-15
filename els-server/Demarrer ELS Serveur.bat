@echo off
title ELS Planning - Serveur local
color 0A
echo.
echo  ==========================================
echo   ELS Planning — Serveur local NAS
echo  ==========================================
echo.

:: Vérifier si Node.js est installé
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  color 0C
  echo  ERREUR : Node.js n'est pas installe.
  echo.
  echo  Telechargez Node.js sur : https://nodejs.org
  echo  Choisissez la version LTS puis relancez ce script.
  echo.
  pause
  exit /b 1
)

echo  Node.js detecte : OK
echo.
echo  Demarrage du serveur...
echo  Laissez cette fenetre ouverte pendant votre session.
echo.

:: Aller dans le dossier du script (H:\ELS\)
cd /d "%~dp0"

:: Lancer le serveur
node server.js

echo.
echo  Le serveur s'est arrete.
pause
