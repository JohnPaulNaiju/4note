## 4note: AI note taking app 📝 <img width="400" height="400" alt="Gesture" src="https://github.com/user-attachments/assets/f991bfa3-6445-439f-8db3-e1ca4df61eef" />

4note is an **AI-powered note-taking platform** designed to capture, organize, and enhance knowledge from virtually any source. Whether it’s lectures, meetings, videos, audio recordings, scanned documents, or PDFs, 4note automatically processes and transforms your content into searchable, interactive, and easy-to-understand notes.

With 4note, you can:
- **Capture** notes in real time or from recordings and files.
- **Transcribe & summarize** content at multiple levels of detail.
- **Chat** with your notes to clarify concepts, answer questions, or explore related ideas.
- **Visualize** information with AI-generated diagrams, mind maps, and short explainer videos.
- **Organize & search** using intelligent tagging, semantic search, and topic linking.
- **Collaborate** with others in shared workspaces for study groups, projects, or meetings.

Our mission is to go beyond simple note-taking — 4note acts as your **AI learning partner**, helping you not only store information but also understand, retain, and apply it.

## Key Features ✨

- **Multi-Source Capture** – Import notes from lectures, meetings, audio, video, scanned documents, and PDFs.  
- **AI-Powered Transcription** – Convert speech and handwriting into accurate, editable text.  
- **Smart Summarization** – Generate concise summaries, timelines, and key points from any content.  
- **Interactive Q&A** – Chat with your notes to clarify concepts, expand ideas, or quiz yourself.  
- **Visual Learning Tools** – Create diagrams, mind maps, and explainer videos automatically.  
- **Semantic Search** – Find concepts and related information, not just exact keywords.  
- **Organized Knowledge** – Tag, categorize, and link notes for easy navigation.  
- **Collaboration Mode** – Share workspaces, co-edit notes, and track changes in real time.  
- **Cross-Platform Access** – Access your notes from web and (future) mobile platforms.

## Tech Stack 🛠️

- **Frontend:** React Nate
- **Backend:** Node.js with Express.js, Python
- **Database:** Firestore (Cloud Firestore for scalable, real-time storage)  
- **AI & NLP:** Gemini, Whisper for transcription
- **File Processing:** PDF.js, Tesseract.js (OCR for scanned documents)  
- **Authentication:** Firebase Authentication  
- **Hosting & Deployment:** Firebase (Backend services)  
- **Other Integrations:** Cloud Storage (for media files)

## Prizes & Recognition 🏆

- 1st Prize, College level Ideafest. [See here](https://github.com/JohnPaulNaiju/achievements/blob/main/certificates/ideafest.pdf)

### Current Status 🚧

Please note that 4note is currently **not hosted live**. The provided codebases for the mobile app, and server logic are available within the repository for review.

### Visuals 📸🎬

https://github.com/user-attachments/assets/f26ad277-5655-4a34-b712-61903bed9803

### Main files:
- backend (firebase cloud functions)
- frontend (React Native crossplatform application)
- server (Locally hosted server in python)

### Requirements:
- Python
- NodeJS
- Expo & EAS CLI
- Firebase CLI

### Step by step guide to make project run

1) Go to [Google AI Studio](https://aistudio.google.com) and get an GEMINI API KEY.

1) Open terminal and navigate to `/server` and run `pip install fastapi uvicorn openai-whisper google-generativeai`.

2) Add the GEMINI AI API KEY (obtained in step 1) in line 14 in `/server/main.py`

3) Open terminal and navigate to `/server` and run `uvicorn main:app --host 0.0.0.0 --port 8000 --reload` to start the server. Server is required to take notes in realtime by listening to lectures in realtime.

4) Create firebase project and enable the following:
- Firestore
- Authentication (Email and password)
- Cloud Storage
- Cloud Functions

You need blaze plan for Cloud functions.

5) Go to [emoji-api](https://emoji-api.com) and create api key.

6) Go to [Pexels](https://www.pexels.com) and create api key.

7) Go to `/frontend` and create `.env` at the root and add firebase, emoji and pexel api keys as follows:
- FIREBASE_API_KEY=ABCD
- AUTH_DOMAIN=ABCD
- PROJECT_ID=ABCD
- STORAGE_BUCKET=ABCD
- MESSAGING_SENDER_ID=ABCD
- APP_ID=ABCD
- MEASUREMENT_ID=ABCD
- EMOJI_API_KEY=ABCD
- PEXEL_API_KEY=ABCD
- GEMINI_API_KEY=ABCD 

8) Open terminal and navigate to `/frontend` run `npm install`. Since this is old code there will be breaking changes when you run it. So fix issues by yourself as this is not maintained.

9) In terminal as same path as before (`/frontend`) run `sudo npx expo start --clear` to run the app.

10) Open terminal and navigate to `backend` and run `firebase init` and initialize your firebase project.

11) In terminal in same path navigate to `functions` and run `npm install`.

12) From firebase download service key json file for admin privileges and add it in the path `/server/functions/key.json` as `key.json`.

13) In `/backend/functions/config.js` add GEMINI API KEY.

14) Deploy firebase in terminal from path `/server` by running `firebase deploy --only functions`.

15) For listen to lecture open the file `Lecture.jsx` in `/frontend/screens/home/Lecture.jsx` and go to line 269 and you can see a ip address. There add IP address of your locally running server. You can get the IP by running `ipconfig getifaddr en0` in your terminal.

16) You can also create your own android apk files, submit to app n play store etc. You can find how to do it online!


## Thank you :)
