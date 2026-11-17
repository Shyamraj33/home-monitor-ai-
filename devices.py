import random
from typing import Dict, Any, Optional

class DeviceManager:
    def __init__(self):
        # Lights: state ('on'/'off'), brightness (0-100)
        self.lights: Dict[str, Dict[str, Any]] = {
            "living_room": {"name": "Living Room Light", "state": "off", "brightness": 80},
            "bedroom": {"name": "Bedroom Light", "state": "off", "brightness": 60},
            "kitchen": {"name": "Kitchen Light", "state": "off", "brightness": 90},
            "porch": {"name": "Porch Light", "state": "on", "brightness": 100},
        }

        # Fans: state ('on'/'off'), speed (1-5)
        self.fans: Dict[str, Dict[str, Any]] = {
            "living_room": {"name": "Living Room Fan", "state": "off", "speed": 3},
            "bedroom": {"name": "Bedroom Ceiling Fan", "state": "off", "speed": 2},
        }

        # Doors: locked (bool), open (bool)
        self.doors: Dict[str, Dict[str, Any]] = {
            "front_door": {"name": "Front Door", "locked": True, "open": False},
            "back_door": {"name": "Back Door", "locked": True, "open": False},
            "garage_door": {"name": "Garage Door", "locked": True, "open": False},
        }

        # Windows: open (bool), curtain ('open'/'closed')
        self.windows: Dict[str, Dict[str, Any]] = {
            "living_room": {"name": "Living Room Window", "open": False, "curtain": "closed"},
            "bedroom": {"name": "Bedroom Window", "open": False, "curtain": "closed"},
            "kitchen": {"name": "Kitchen Window", "open": False, "curtain": "open"},
        }

        # Temperature & Humidity sensors
        self.temperatures: Dict[str, Dict[str, Any]] = {
            "living_room": {"name": "Living Room Sensor", "temp": 23.5, "humidity": 48},
            "bedroom": {"name": "Bedroom Sensor", "temp": 22.0, "humidity": 50},
            "outdoor": {"name": "Outdoor Weather Station", "temp": 28.4, "humidity": 62},
        }

    def _normalize_id(self, key: str, lookup: dict) -> Optional[str]:
        cleaned = key.lower().strip().replace(" ", "_").replace("-", "_")
        if cleaned in lookup:
            return cleaned
        for k in lookup:
            if k in cleaned or cleaned in k:
                return k
        return None

    def set_light(self, room: str, state: Optional[str] = None, brightness: Optional[int] = None) -> Dict[str, Any]:
        norm = self._normalize_id(room, self.lights)
        if not norm:
            if "all" in room.lower():
                for k in self.lights:
                    if state: self.lights[k]["state"] = state.lower()
                    if brightness is not None: self.lights[k]["brightness"] = max(0, min(100, brightness))
                return {"success": True, "message": f"All lights turned {state}."}
            return {"success": False, "message": f"Light in '{room}' not found."}

        target = self.lights[norm]
        if state:
            target["state"] = "on" if state.lower() in ["on", "true", "1"] else "off"
        if brightness is not None:
            target["brightness"] = max(0, min(100, int(brightness)))
            if target["brightness"] > 0:
                target["state"] = "on"
        return {"success": True, "device": norm, "details": target}

    def set_fan(self, room: str, state: Optional[str] = None, speed: Optional[int] = None) -> Dict[str, Any]:
        norm = self._normalize_id(room, self.fans)
        if not norm:
            if "all" in room.lower():
                for k in self.fans:
                    if state: self.fans[k]["state"] = state.lower()
                    if speed is not None: self.fans[k]["speed"] = max(1, min(5, speed))
                return {"success": True, "message": f"All fans set to {state}."}
            return {"success": False, "message": f"Fan in '{room}' not found."}

        target = self.fans[norm]
        if state:
            target["state"] = "on" if state.lower() in ["on", "true", "1"] else "off"
        if speed is not None:
            target["speed"] = max(1, min(5, int(speed)))
            target["state"] = "on"
        return {"success": True, "device": norm, "details": target}

    def set_door(self, door: str, locked: Optional[bool] = None, open_state: Optional[bool] = None) -> Dict[str, Any]:
        norm = self._normalize_id(door, self.doors)
        if not norm:
            if "all" in door.lower():
                for k in self.doors:
                    if locked is not None: self.doors[k]["locked"] = locked
                    if open_state is not None: self.doors[k]["open"] = open_state
                action = "locked" if locked else ("closed" if open_state is False else "updated")
                return {"success": True, "message": f"All doors {action}."}
            return {"success": False, "message": f"Door '{door}' not found."}

        target = self.doors[norm]
        if locked is not None:
            target["locked"] = bool(locked)
            if target["locked"] and target["open"]:
                target["open"] = False  # Locking forces it closed
        if open_state is not None:
            if open_state and target["locked"]:
                return {"success": False, "message": f"Cannot open {target['name']}: it is locked."}
            target["open"] = bool(open_state)
        return {"success": True, "device": norm, "details": target}

    def set_window(self, window: str, open_state: Optional[bool] = None, curtain: Optional[str] = None) -> Dict[str, Any]:
        norm = self._normalize_id(window, self.windows)
        if not norm:
            if "all" in window.lower():
                for k in self.windows:
                    if open_state is not None: self.windows[k]["open"] = open_state
                    if curtain: self.windows[k]["curtain"] = curtain.lower()
                action = "opened" if open_state else ("closed" if open_state is False else "updated")
                return {"success": True, "message": f"All windows {action}."}
            return {"success": False, "message": f"Window in '{window}' not found."}

        target = self.windows[norm]
        if open_state is not None:
            target["open"] = bool(open_state)
        if curtain:
            target["curtain"] = "open" if curtain.lower() in ["open", "true"] else "closed"
        return {"success": True, "device": norm, "details": target}

    def get_temperature(self, room: Optional[str] = None) -> Dict[str, Any]:
        # Slight realistic variance for simulation
        for k in self.temperatures:
            delta = round(random.uniform(-0.1, 0.1), 1)
            self.temperatures[k]["temp"] = round(self.temperatures[k]["temp"] + delta, 1)

        if room:
            norm = self._normalize_id(room, self.temperatures)
            if norm:
                return {"success": True, "room": norm, "data": self.temperatures[norm]}
            return {"success": False, "message": f"Temperature sensor for '{room}' not found.", "all": self.temperatures}
        return {"success": True, "all": self.temperatures}

    def get_security_status(self) -> Dict[str, Any]:
        unlocked_doors = [v["name"] for v in self.doors.values() if not v["locked"]]
        open_doors = [v["name"] for v in self.doors.values() if v["open"]]
        open_windows = [v["name"] for v in self.windows.values() if v["open"]]
        
        is_secure = (len(unlocked_doors) == 0 and len(open_doors) == 0 and len(open_windows) == 0)
        return {
            "is_secure": is_secure,
            "unlocked_doors": unlocked_doors,
            "open_doors": open_doors,
            "open_windows": open_windows,
            "temperature_summary": {k: f"{v['temp']}°C" for k, v in self.temperatures.items()}
        }

    def get_all_devices(self) -> Dict[str, Any]:
        return {
            "lights": self.lights,
            "fans": self.fans,
            "doors": self.doors,
            "windows": self.windows,
            "temperatures": self.temperatures,
            "security": self.get_security_status()
        }

# Global singleton instance
devices = DeviceManager()
