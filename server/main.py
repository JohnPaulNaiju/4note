import os
import json
import base64
import asyncio
import tempfile
import io
import uvicorn
import whisper
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from google import genai
from google.genai import types

client = genai.Client(api_key="GEMINI_API_KEY") 

STTmodel = whisper.load_model("base")

app = FastAPI()

audio_buffer = io.BytesIO()
buffer_lock = asyncio.Lock()

transcription_text = ""

previous_notes = ""

session_id = None

async def receive_audio(websocket: WebSocket):
    global audio_buffer, session_id
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            chunk = payload.get("chunk")
            timestamp = payload.get("timestamp")
            client_session_id = payload.get("sessionId")
            if session_id is None:
                session_id = client_session_id
                print(f"Starting new session: {session_id}")
            elif client_session_id != session_id:
                session_id = client_session_id
                global transcription_text, previous_notes
                transcription_text = ""
                previous_notes = ""
                print(f"Switching to new session: {session_id}")
                
            print(f"Received chunk at {timestamp}: {chunk[:30]}...")
            audio_bytes = base64.b64decode(chunk)
            async with buffer_lock:
                audio_buffer.write(audio_bytes)
    except WebSocketDisconnect:
        print("Audio receiver disconnected.")

def gemini_stream_generate(prompt, model="gemini-2.0-flash-lite", max_output_tokens=200, temperature=0.7):
    response_stream = client.models.generate_content_stream(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=max_output_tokens,
            temperature=temperature,
        )
    )
    for chunk in response_stream:
        yield chunk.text

async def generate_notes(websocket: WebSocket, update_interval: float = 5.0):
    global audio_buffer, transcription_text, previous_notes
    while True:
        await asyncio.sleep(update_interval)
        async with buffer_lock:
            current_audio = audio_buffer.getvalue()
            audio_buffer = io.BytesIO()
        if not current_audio:
            continue 

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            tmp_file.write(current_audio)
            tmp_filename = tmp_file.name

        try:
            result = STTmodel.transcribe(tmp_filename)
            new_transcription = result.get("text", "")
            if new_transcription.strip():
                transcription_text += "\n" + new_transcription
                print("Updated transcription:", transcription_text)
            else:
                print("No new transcription detected")
                os.remove(tmp_filename)
                continue
        except Exception as e:
            error_response = {"status": "error", "text": f"Transcription error: {str(e)}"}
            await websocket.send_text(json.dumps(error_response))
            os.remove(tmp_filename)
            continue

        os.remove(tmp_filename)

        is_continuation = len(previous_notes) > 0
        
        if is_continuation:
            prompt = (
                "You are continuing to generate structured study notes based on a lecture transcription. "
                "You have already generated some notes (shown below). Now, you need to continue these notes "
                "based on new transcription content.\n\n"
                "IMPORTANT: DO NOT repeat information you've already covered. DO NOT start with introductions "
                "or conclusions. Just continue the notes seamlessly as if they were part of the same document.\n\n"
                f"Previous notes:\n{previous_notes}\n\n"
                f"New transcription to incorporate:\n{new_transcription}\n\n"
                "Continue the notes in markdown format, maintaining the same style and structure as the previous notes."
            )
        else:
            prompt = (
                "Convert the following transcription into structured study notes with clear headings, "
                "subheadings, and bullet points. Output must be in markdown format.\n\n"
                f"Transcription so far:\n{transcription_text}\n"
            )
        
        print("Sending prompt to Gemini 2.0 Flash-Lite...")
        print(f"Is continuation: {is_continuation}")

        def get_chunks():
            return list(gemini_stream_generate(prompt))

        chunks = await asyncio.to_thread(get_chunks)
        current_generation = ""
        
        for chunk in chunks:
            response = {"status": "success", "text": chunk}
            current_generation += chunk
            await websocket.send_text(json.dumps(response))

        previous_notes += current_generation

        if len(previous_notes) > 10000:
            previous_notes = previous_notes[-10000:]
            
        await websocket.send_text(json.dumps({"status": "info", "text": "[generation cycle complete]"}))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")
    receiver_task = asyncio.create_task(receive_audio(websocket))
    generator_task = asyncio.create_task(generate_notes(websocket))
    try:
        await asyncio.gather(receiver_task, generator_task)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print("Unexpected error:", e)
    finally:
        receiver_task.cancel()
        generator_task.cancel()

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# ipconfig getifaddr en0