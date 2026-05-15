@echo off
title ELS - Installation démarrage automatique
echo.
echo  Installation du démarrage automatique d'ELS Serveur...
echo.

:: Créer un raccourci dans le dossier Démarrage Windows
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set TARGET=%~dp0Demarrer ELS Serveur.bat

:: Créer le raccourci via PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP%\ELS Serveur.lnk'); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Save()"

if %ERRORLEVEL% EQU 0 (
  echo  OK : Le serveur ELS demarrera automatiquement a chaque ouverture de session.
  echo.
  echo  Raccourci cree dans :
  echo  %STARTUP%
) else (
  echo  ERREUR : Impossible de creer le raccourci.
)
echo.
pause
