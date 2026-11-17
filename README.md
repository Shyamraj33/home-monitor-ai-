# 🛡️ AegisHome AI - Intelligent Home Monitoring & Control System

A complete smart home monitoring AI chatbot with **Alexa integration**, **Voice control**, **Camera surveillance**, **Environmental & Temperature reporting**, and **Smart device control** (doors, lights, fans, and windows).

---

## 🚀 Features

- **🗣️ Alexa Skills Kit Integration**: Full webhook endpoint at `/api/alexa` supporting standard Alexa Skills Kit requests (`LaunchRequest`, `IntentRequest`, custom slots).
- **🎙️ Direct Voice Control**: In-browser speech-to-text (Web Speech Recognition) and text-to-speech audio feedback.
- **📹 Vision & Camera Monitoring**:
  - Live security surveillance snapshot feed with CCTV HUD overlays.
  - One-click switch to stream and upload live webcam frames from your PC/laptop.
  - "Inspect AI" button for visual security audits (checking if doors are open, room lighting, unauthorized motion).
  - Multimodal Gemini Vision support when `GEMINI_API_KEY` is provided.
- **🌡️ Temperature & Climate Hub**: Real-time environmental sensing (Living Room, Bedroom, Outdoor) reporting temperature (°C) and humidity (%).
- **⚡ Smart Actuator & Device Control**:
  - **💡 Lights**: Living Room, Bedroom, Kitchen, Porch (On/Off, 0-100% Dimming).
  - **🌀 Fans**: Living Room, Bedroom Ceiling (On/Off, Speed 1-5).
  - **🚪 Doors**: Front Door, Back Door, Garage (Lock/Unlock, Open/Close, Ajar alerts).
  - **🪟 Windows**: Living Room, Bedroom, Kitchen (Open/Close).
- **🛡️ Perimeter & Security Routines**:
  - `"Good night"` routine: Locks all doors, closes windows, shuts lights, sets bedroom fan.
  - `"Away mode"` routine: Arms perimeter, shuts off unnecessary devices.

---

## 📦 Quick Start

### 1. Launch the Server
You can double-click `start.bat` or run:
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Open the Web Dashboard
Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🎙️ Voice Commands You Can Say

You can speak via the **Microphone button** in the dashboard or via **Alexa**:

- **Lights**:
  - *"Turn on the living room light"*
  - *"Set kitchen light to 50%"*
  - *"Turn off all lights"*
- **Fans**:
  - *"Turn on the bedroom fan"*
  - *"Set living room fan to speed 4"*
  - *"Stop the fan"*
- **Doors & Windows**:
  - *"Lock the front door"*
  - *"Unlock the back door"*
  - *"Open the bedroom window"*
  - *"Close all windows"*
- **Temperature & Climate**:
  - *"What is the temperature in the living room?"*
  - *"How hot is it outside?"*
  - *"Report temperature"*
- **Camera & Surveillance**:
  - *"Inspect the camera feed"*
  - *"Is anyone at the front door?"*
  - *"Check security status"*
- **Automated Routines**:
  - *"Good night"*
  - *"Leaving the house"*

---

## 📡 Connecting to Amazon Alexa

1. Log into the [Amazon Alexa Developer Console](https://developer.amazon.com/alexa/console/ask).
2. Create a **Custom Skill** named **"Home AI"**.
3. Under **Endpoint**, choose **HTTPS**.
4. Expose your local port `8000` using a tunnel (e.g. `ngrok http 8000` or Cloudflare Tunnel) and paste:
   ```
   https://<your-subdomain>.ngrok-free.app/api/alexa
   ```
5. Select the SSL certificate option: *"My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"*.
6. Save and build the skill. You can now test it in the Alexa Simulator or on your physical Echo device by saying:
   > *"Alexa, ask Home AI to turn on living room light"*
   > *"Alexa, ask Home AI what is the temperature"*
   > *"Alexa, ask Home AI to lock the front door"*

---

## 📁 Project Architecture

- [main.py](file:///c:/Users/hp/Documents/home%20AI/main.py): FastAPI server, API endpoints, static file mounting.
- [agent.py](file:///c:/Users/hp/Documents/home%20AI/agent.py): AI reasoning engine, NLP parser, and multimodal Gemini integration.
- [devices.py](file:///c:/Users/hp/Documents/home%20AI/devices.py): Smart home device manager & state engine.
- [camera.py](file:///c:/Users/hp/Documents/home%20AI/camera.py): Camera snapshot capture and visual inspection service.
- [alexa.py](file:///c:/Users/hp/Documents/home%20AI/alexa.py): Alexa Skills Kit (ASK) request/response handler.
- [static/](file:///c:/Users/hp/Documents/home%20AI/static): Modern web UI with voice input, camera feed, and interactive actuators.
