from typing import Dict, Any
from agent import agent

def build_alexa_response(speech_text: str, reprompt_text: str = None, should_end_session: bool = False, card_title: str = "Home AI") -> Dict[str, Any]:
    response: Dict[str, Any] = {
        "outputSpeech": {
            "type": "PlainText",
            "text": speech_text
        },
        "card": {
            "type": "Simple",
            "title": card_title,
            "content": speech_text
        },
        "shouldEndSession": should_end_session
    }
    if reprompt_text and not should_end_session:
        response["reprompt"] = {
            "outputSpeech": {
                "type": "PlainText",
                "text": reprompt_text
            }
        }
    return {
        "version": "1.0",
        "response": response
    }

def handle_alexa_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    req = payload.get("request", {})
    req_type = req.get("type", "")

    if req_type == "LaunchRequest":
        return build_alexa_response(
            speech_text="Welcome to Home Monitoring AI. I can control your lights, fans, doors, and windows, report temperatures, or inspect your security cameras. What would you like me to do?",
            reprompt_text="You can say, turn on the living room light, check the temperature, or lock all doors."
        )

    elif req_type == "IntentRequest":
        intent = req.get("intent", {})
        intent_name = intent.get("name", "")
        slots = intent.get("slots", {})

        if intent_name in ["AMAZON.StopIntent", "AMAZON.CancelIntent"]:
            return build_alexa_response("Goodbye. Monitoring is active.", should_end_session=True)

        elif intent_name == "AMAZON.HelpIntent":
            return build_alexa_response(
                "You can ask me to turn on or off lights and fans, lock or open doors and windows, report the room temperature, or inspect your camera feed.",
                reprompt_text="What would you like me to do?"
            )

        # Smart Device Intent or Fallback / Raw intent
        # Extract direct command or query
        raw_query = ""
        if "Query" in slots and slots["Query"].get("value"):
            raw_query = slots["Query"]["value"]
        elif "Command" in slots and slots["Command"].get("value"):
            raw_query = slots["Command"]["value"]
        else:
            # Reconstruct from slots if structured
            action = slots.get("Action", {}).get("value", "")
            device = slots.get("Device", {}).get("value", "")
            room = slots.get("Room", {}).get("value", "")
            raw_query = f"{action} {room} {device}".strip()

        if not raw_query:
            # Check intent name for quick matches
            if intent_name == "GetTemperatureIntent":
                room = slots.get("Room", {}).get("value", "")
                raw_query = f"what is the temperature {room}".strip()
            elif intent_name == "InspectCameraIntent":
                raw_query = "inspect the security camera feed"
            elif intent_name == "SecurityCheckIntent":
                raw_query = "check security status and doors"
            else:
                raw_query = "status overview"

        res = agent.process_message(raw_query)
        reply = res.get("reply", "Command executed.")
        return build_alexa_response(speech_text=reply, reprompt_text="Is there anything else you need?")

    elif req_type == "SessionEndedRequest":
        return build_alexa_response("Session ended.", should_end_session=True)

    return build_alexa_response("I did not understand that command. Please try again.")
