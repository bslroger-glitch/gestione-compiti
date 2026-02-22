from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import shutil
from datetime import datetime
from fastapi.staticfiles import StaticFiles
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.scraper import ClasseVivaScraper

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
PROFILES_DIR = os.path.join(DATA_DIR, "profiles")
os.makedirs(PROFILES_DIR, exist_ok=True)

# Mount the entire profiles directory so we can serve attachments from /api/profiles/{user_id}/attachments/{filename}
app.mount("/api/profiles", StaticFiles(directory=PROFILES_DIR), name="profiles")

def get_user_dir(user_id: str):
    user_dir = os.path.join(PROFILES_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)
    os.makedirs(os.path.join(user_dir, "attachments"), exist_ok=True)
    return user_dir

def load_json(filename, user_id=None):
    base_dir = get_user_dir(user_id) if user_id else DATA_DIR
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        return {} if ("status" in filename or "attachments" in filename) else []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(filename, data, user_id=None):
    base_dir = get_user_dir(user_id) if user_id else DATA_DIR
    path = os.path.join(base_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# --- Schemas ---
class LoginRequest(BaseModel):
    user_id: str
    pin: str

class StatusUpdate(BaseModel):
    ev_id: str
    iniziata: bool
    completata: bool

class ManualTask(BaseModel):
    title: str
    start: str
    tipo: str
    materia_desc: str
    autore_desc: str

class NewUserRequest(BaseModel):
    name: str
    pin: str
    cv_username: str
    cv_password: str

# --- User Management ---
@app.get("/api/users")
async def get_users():
    users = load_json("users.json")
    # Strip sensitive data
    return [{"id": u["id"], "name": u["name"], "avatar_url": u.get("avatar_url"), "academic_period": u.get("academic_period", "pentamestre")} for u in users]

@app.post("/api/login")
async def login(req: LoginRequest):
    users = load_json("users.json")
    user = next((u for u in users if u["id"] == req.user_id and u["pin"] == req.pin), None)
    if user:
        return {"status": "ok", "user": {"id": user["id"], "name": user["name"], "avatar_url": user.get("avatar_url"), "academic_period": user.get("academic_period", "pentamestre")}}
    raise HTTPException(status_code=401, detail="Invalid PIN")

@app.post("/api/users")
async def create_user(req: NewUserRequest):
    users = load_json("users.json")
    user_id = req.name.lower().replace(" ", "_")
    if any(u["id"] == user_id for u in users):
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = {
        "id": user_id,
        "name": req.name,
        "pin": req.pin,
        "cv_username": req.cv_username,
        "cv_password": req.cv_password,
        "avatar_url": None,
        "academic_period": "pentamestre"
    }
    users.append(new_user)
    save_json("users.json", users)
    
    # Initialize profile directory
    get_user_dir(user_id)
    return {"status": "ok", "user": {"id": user_id, "name": req.name}}

@app.post("/api/users/{user_id}/avatar")
async def upload_avatar(user_id: str, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    users = load_json("users.json")
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    safe_filename = file.filename.replace(" ", "_").replace("/", "").replace("\\", "")
    unique_filename = f"avatar_{int(datetime.now().timestamp())}_{safe_filename}"
    
    user_dir = get_user_dir(user_id)
    file_path = os.path.join(user_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # Update user record
    user["avatar_url"] = f"/api/profiles/{user_id}/{unique_filename}"
    save_json("users.json", users)
    
    return {"status": "ok", "avatar_url": user["avatar_url"]}

# --- Data Endpoints ---
class UpdatePinRequest(BaseModel):
    old_pin: str
    new_pin: str

class UpdatePeriodRequest(BaseModel):
    academic_period: str

@app.put("/api/users/{user_id}/period")
async def update_period(user_id: str, req: UpdatePeriodRequest):
    if req.academic_period not in ["quadrimestre", "pentamestre"]:
        raise HTTPException(status_code=400, detail="Invalid period. Must be quadrimestre or pentamestre.")
        
    users = load_json("users.json")
    user = next((u for u in users if u["id"] == user_id), None)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user["academic_period"] = req.academic_period
    save_json("users.json", users)
    
    return {"status": "ok"}

@app.put("/api/users/{user_id}/pin")
async def update_pin(user_id: str, req: UpdatePinRequest):
    users = load_json("users.json")
    user = next((u for u in users if u["id"] == user_id), None)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user["pin"] != req.old_pin:
        raise HTTPException(status_code=401, detail="Vecchio PIN errato")
        
    if len(req.new_pin) < 4:
        raise HTTPException(status_code=400, detail="Il nuovo PIN deve contenere almeno 4 caratteri")
        
    user["pin"] = req.new_pin
    save_json("users.json", users)
    
    return {"status": "ok"}

def get_manual_tasks(user_id: str):
    db = load_json("manual_tasks.json", user_id)
    if isinstance(db, dict): return []
    return db

@app.get("/api/homework")
async def get_homework(user_id: str):
    hw = load_json("homework.json", user_id)
    manual = get_manual_tasks(user_id)
    return hw + manual

@app.post("/api/manual_tasks")
async def add_manual_task(task: ManualTask, user_id: str):
    db = get_manual_tasks(user_id)
    task_id = f"manual_{int(datetime.now().timestamp())}"
    new_task = {
        "id": task_id, "title": task.title, "start": task.start,
        "tipo": task.tipo, "materia_desc": task.materia_desc,
        "autore_desc": task.autore_desc, "is_manual": True
    }
    db.append(new_task)
    save_json("manual_tasks.json", db, user_id)
    return {"status": "ok", "task": new_task}

@app.delete("/api/manual_tasks/{task_id}")
async def delete_manual_task(task_id: str, user_id: str):
    db = get_manual_tasks(user_id)
    original_len = len(db)
    db = [t for t in db if t.get("id") != task_id]
    if len(db) < original_len:
        save_json("manual_tasks.json", db, user_id)
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="Task not found")

@app.get("/api/grades")
async def get_grades(user_id: str):
    return load_json("grades.json", user_id)

@app.get("/api/status")
async def get_status(user_id: str):
    return load_json("status.json", user_id)

@app.post("/api/status")
async def update_status(update: StatusUpdate, user_id: str):
    db = load_json("status.json", user_id)
    db[update.ev_id] = {"iniziata": update.iniziata, "completata": update.completata}
    save_json("status.json", db, user_id)
    return {"status": "ok"}

@app.get("/api/attachments")
async def get_attachments(user_id: str):
    return load_json("attachments.json", user_id)

@app.post("/api/attachments/{ev_id}")
async def upload_attachment(ev_id: str, user_id: str, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    safe_filename = file.filename.replace(" ", "_").replace("/", "").replace("\\", "")
    unique_filename = f"{ev_id}_{int(datetime.now().timestamp())}_{safe_filename}"
    
    user_dir = get_user_dir(user_id)
    file_path = os.path.join(user_dir, "attachments", unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    db = load_json("attachments.json", user_id)
    if ev_id not in db: db[ev_id] = []
        
    attachment_record = {
        "filename": unique_filename,
        "original_name": file.filename,
        "url": f"/api/profiles/{user_id}/attachments/{unique_filename}"
    }
    db[ev_id].append(attachment_record)
    save_json("attachments.json", db, user_id)
    
    return {"status": "ok", "attachment": attachment_record}

@app.delete("/api/attachments/{ev_id}/{filename}")
async def delete_attachment(ev_id: str, filename: str, user_id: str):
    db = load_json("attachments.json", user_id)
    if ev_id in db:
        db[ev_id] = [att for att in db[ev_id] if att["filename"] != filename]
        save_json("attachments.json", db, user_id)
        
    user_dir = get_user_dir(user_id)
    file_path = os.path.join(user_dir, "attachments", filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        
    return {"status": "ok"}

@app.post("/api/sync")
async def sync_classeviva(user_id: str):
    users = load_json("users.json")
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.get("cv_username") or not user.get("cv_password"):
        raise HTTPException(status_code=400, detail="User missing ClasseViva credentials")
        
    try:
        scraper = ClasseVivaScraper(user["cv_username"], user["cv_password"])
        # Fetch and save homework
        hw = scraper.fetch_homework(days_back=90, days_forward=90)
        save_json("homework.json", hw, user_id)
        
        # Fetch and save grades
        voti = scraper.fetch_grades()
        save_json("grades.json", voti, user_id)
        
        return {"status": "ok", "homework_count": len(hw), "grades_count": len(voti)}
    except Exception as e:
        print(f"[ERROR] Sync failed for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
