# Avvia il backend FastAPI in una nuova finestra
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; & '..\..\.venv\Scripts\python.exe' main.py"

# Avvia il frontend Vite in una nuova finestra
$env:PATH += ";C:\Program Files\nodejs"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& 'C:\Program Files\nodejs\npm.cmd' run dev"
