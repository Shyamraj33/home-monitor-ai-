from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/")
    assert res.status_code == 200
    print("[PASS] GET / (Dashboard loaded)")

def test_chat_commands():
    # Test light
    res = client.post("/api/chat", json={"message": "Turn on living room light"})
    assert res.status_code == 200
    data = res.json()
    assert data["devices"]["lights"]["living_room"]["state"] == "on"
    print("[PASS] Chat: Light turned ON")

    # Test temp
    res = client.post("/api/chat", json={"message": "What is the temperature in the living room?"})
    assert res.status_code == 200
    print("[PASS] Chat: Temp query returned ->", res.json()["reply"])

    # Test door lock
    res = client.post("/api/chat", json={"message": "Lock the front door"})
    assert res.status_code == 200
    assert res.json()["devices"]["doors"]["front_door"]["locked"] is True
    print("[PASS] Chat: Door locked")

    # Test window
    res = client.post("/api/chat", json={"message": "Open the bedroom window"})
    assert res.status_code == 200
    assert res.json()["devices"]["windows"]["bedroom"]["open"] is True
    print("[PASS] Chat: Window opened")

    # Test camera inspection
    res = client.post("/api/camera/inspect", json={"query": "Is front door safe?"})
    assert res.status_code == 200
    assert "analysis" in res.json()
    print("[PASS] Camera AI Inspection working")

def test_alexa():
    # LaunchRequest
    launch_req = {
        "version": "1.0",
        "request": {
            "type": "LaunchRequest",
            "requestId": "r123"
        }
    }
    res = client.post("/api/alexa", json=launch_req)
    assert res.status_code == 200
    alexa_json = res.json()
    assert "Welcome to Home Monitoring AI" in alexa_json["response"]["outputSpeech"]["text"]
    print("[PASS] Alexa LaunchRequest supported")

    # IntentRequest: Turn on living room fan
    intent_req = {
        "version": "1.0",
        "request": {
            "type": "IntentRequest",
            "requestId": "r124",
            "intent": {
                "name": "ControlDeviceIntent",
                "slots": {
                    "Command": {"value": "turn on the living room fan"}
                }
            }
        }
    }
    res = client.post("/api/alexa", json=intent_req)
    assert res.status_code == 200
    alexa_json = res.json()
    print("[PASS] Alexa Intent response ->", alexa_json["response"]["outputSpeech"]["text"])

if __name__ == "__main__":
    test_health()
    test_chat_commands()
    test_alexa()
    print("\nALL AUTOMATED TESTS PASSED SUCCESSFULLY!")
