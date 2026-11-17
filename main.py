import os
from fastapi import FastAPI, Request, Response, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

from devices import devices
from camera import camera_service
from agent import agent
from alexa import handle_alexa_request

app = FastAPI(title="Home Monitoring AI Core", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class DeviceActionRequest(BaseModel):
    state: Optional[str] = None
    brightness: Optional[int] = None
    speed: Optional[int] = None
    locked: Optional[bool] = None
    open: Optional[bool] = None

class CameraInspectRequest(BaseModel):
    query: Optional[str] = "Inspect security and describe scene"

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    result = agent.process_message(req.message)
    return result

@app.get("/api/devices")
async def get_devices():
    return devices.get_all_devices()

@app.post("/api/devices/{category}/{device_id}")
async def control_device(category: str, device_id: str, action: DeviceActionRequest):
    if category == "lights":
        res = devices.set_light(device_id, state=action.state, brightness=action.brightness)
    elif category == "fans":
        res = devices.set_fan(device_id, state=action.state, speed=action.speed)
    elif category == "doors":
        res = devices.set_door(device_id, locked=action.locked, open_state=action.open)
    elif category == "windows":
        res = devices.set_window(device_id, open_state=action.open)
    else:
        return JSONResponse(status_code=400, content={"error": f"Invalid category: {category}"})
    return {"result": res, "all_devices": devices.get_all_devices()}

@app.get("/api/camera/snapshot")
async def get_camera_snapshot():
    door_open = devices.doors["front_door"]["open"]
    light_on = devices.lights["porch"]["state"] == "on"
    img_bytes = camera_service.get_latest_snapshot(door_open=door_open, light_on=light_on)
    return Response(content=img_bytes, media_type="image/jpeg")

@app.post("/api/camera/upload")
async def upload_camera_frame(file: UploadFile = File(...)):
    contents = await file.read()
    camera_service.set_uploaded_snapshot(contents)
    return {"success": True, "message": "Camera snapshot updated from live stream."}

@app.post("/api/camera/disconnect")
async def disconnect_camera():
    camera_service.clear_uploaded_snapshot()
    return {"success": True, "message": "Webcam disconnected. Reverted to CCTV feed."}

@app.post("/api/camera/inspect")
async def inspect_camera(req: CameraInspectRequest):
    res = agent.inspect_camera(req.query or "Analyze security and room status")
    return res

@app.post("/api/alexa")
async def alexa_webhook(request: Request):
    """Alexa Skills Kit HTTPS endpoint"""
    try:
        body = await request.json()
        alexa_response = handle_alexa_request(body)
        return alexa_response
    except Exception as e:
        print(f"Error handling Alexa request: {e}")
        return JSONResponse(status_code=400, content={"error": str(e)})

# Mount static folder
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>Home Monitoring AI Server Running</h1><p>Frontend static files loading...</p>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
