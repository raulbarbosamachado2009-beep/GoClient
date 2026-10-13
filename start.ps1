# start.ps1
$env:Path = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64;$env:LOCALAPPDATA\Programs\Git\cmd;$env:Path"
Set-Location "C:\Users\raul.bmachado\Desktop\GoClient"
Write-Host "Iniciando GoClient no Expo..." -ForegroundColor Cyan
npx expo start
