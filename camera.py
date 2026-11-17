import io
import time
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from typing import Optional

class CameraService:
    def __init__(self):
        self.custom_snapshot_bytes: Optional[bytes] = None
        self.last_updated: float = time.time()
        self.camera_name = "CAM_FRONT_PORCH_01"

    def set_uploaded_snapshot(self, image_bytes: bytes):
        """Update snapshot from browser webcam or external stream"""
        self.custom_snapshot_bytes = image_bytes
        self.last_updated = time.time()

    def clear_uploaded_snapshot(self):
        """Disconnect and revert to simulated CCTV stream"""
        self.custom_snapshot_bytes = None
        self.last_updated = 0

    def generate_simulated_snapshot(self, door_open: bool = False, light_on: bool = True) -> bytes:
        """Generates a dynamic security camera frame reflecting home status"""
        width, height = 640, 360
        # Background color reflects light level
        bg_color = (25, 30, 42) if light_on else (8, 10, 15)
        img = Image.new("RGB", (width, height), color=bg_color)
        draw = ImageDraw.Draw(img)

        # Draw security camera perspective grid (hallway / porch perspective)
        horizon = 120
        grid_color = (40, 50, 70) if light_on else (20, 25, 35)
        
        # Vanishing lines
        center_x = width // 2
        for x in [0, 160, 320, 480, 640]:
            draw.line([(center_x, horizon), (x, height)], fill=grid_color, width=1)
        for y in range(horizon + 40, height, 40):
            draw.line([(0, y), (width, y)], fill=grid_color, width=1)

        # Draw Door outline
        door_x0, door_y0 = 260, 100
        door_x1, door_y1 = 380, 280
        door_fill = (45, 55, 75) if not door_open else (15, 20, 30)
        draw.rectangle([door_x0, door_y0, door_x1, door_y1], fill=door_fill, outline=(80, 100, 140), width=2)
        
        # Door handle or open gap
        if not door_open:
            draw.ellipse([360, 190, 370, 200], fill=(220, 200, 120), outline=(255, 255, 255))
            draw.text((275, 140), "DOOR CLOSED", fill=(100, 200, 120))
        else:
            # Interior room light visible
            draw.polygon([(260, 100), (320, 120), (320, 260), (260, 280)], fill=(70, 80, 100), outline=(100, 120, 160))
            draw.text((280, 140), "[DOOR OPEN]", fill=(240, 80, 80))

        # Ceiling light fixture
        if light_on:
            draw.ellipse([305, 30, 335, 45], fill=(255, 240, 180))
            draw.polygon([(305, 45), (335, 45), (420, 180), (220, 180)], fill=(40, 45, 55))
        else:
            draw.ellipse([310, 30, 330, 40], fill=(70, 70, 80))

        # Camera HUD Overlay (CCTV style)
        timestamp_str = datetime.now().strftime("%Y-%m-%d  %H:%M:%S")
        
        # Top banner
        draw.rectangle([0, 0, width, 30], fill=(0, 0, 0))
        draw.text((10, 8), f"● REC  [{self.camera_name}]  1080P  30FPS", fill=(255, 60, 60))
        draw.text((430, 8), timestamp_str, fill=(220, 220, 220))

        # Bottom banner status
        draw.rectangle([0, height - 25, width, height], fill=(0, 0, 0))
        status_text = "SECURITY: MONITORED | AI VISION ACTIVE | SENSORS: ONLINE"
        draw.text((10, height - 20), status_text, fill=(80, 220, 120))

        # Motion detection target box
        box_color = (0, 255, 180) if not door_open else (255, 60, 60)
        draw.rectangle([250, 90, 390, 290], outline=box_color, width=1)
        draw.text((252, 92), "MONITOR_ZONE_1", fill=box_color)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()

    def get_latest_snapshot(self, door_open: bool = False, light_on: bool = True) -> bytes:
        if self.custom_snapshot_bytes and (time.time() - self.last_updated < 60):
            return self.custom_snapshot_bytes
        return self.generate_simulated_snapshot(door_open=door_open, light_on=light_on)

camera_service = CameraService()
