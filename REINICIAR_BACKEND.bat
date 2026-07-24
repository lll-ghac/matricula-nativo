@echo off
echo ===========================================
echo  Reiniciando Backend con Codigo Actualizado
echo ===========================================
echo.

echo [1/3] Matando procesos Node en puerto 5003...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5003') do (
    echo Matando PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] Esperando 2 segundos...
timeout /t 2 /nobreak >nul

echo [3/3] Iniciando backend...
cd backend
start "Backend Server" npm start

echo.
echo ✅ Backend reiniciado!
echo    Por favor verifica que muestre el mensaje de inicio.
echo.
pause
