@echo off
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64;%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
cd /d "C:\Users\raul.bmachado\Desktop\GoClient"
echo Iniciando Expo para GoClient...
call npx expo start
