const serviceKey = require('./key.json');

const { initializeApp, cert, getApp, getApps } = require('firebase-admin/app');

const cred = {
    credential: cert(serviceKey), 
    storageBucket: "gs://four-note-server.appspot.com", 
};

if(getApps().length === 0) initializeApp(cred);
else getApp();

const { logger } = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { onObjectFinalized, onObjectDeleted } = require("firebase-functions/v2/storage");
const { onDocumentCreated, onDocumentDeleted } = require('firebase-functions/v2/firestore');

const { updateUserStorage } = require('./storage');
const { genOTP, readNReplace, saveOTP, sendEmail, validate, checkOTP, continueForAuth, delOTP } = require('./auth');

const { GoogleGenerativeAI } = require("@google/generative-ai");

const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const { db, gemini } = require('./config');
const { updateStatus } = require('./func');
const { generateStudyNotes, improveExistingNote, convertHandwrittenNotes } = require('./ai');

const genAI = new GoogleGenerativeAI(gemini);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    systemInstruction: `Your are study note generation AI. 
    Generate detailed notes base on what is given to you. Use markdown for output. 
    Also generate a title for the note. 
    The title must enclose in <title></title>. Example: <title>Example title</title>. 
    Title must be at the starting of the output you generate. Note generated must be long enough so that user understands it.
` });

exports.requestOTP = onCall(async({data}) => {
    const email = data.email;
    let state, msg;
    try{
        const isValid = validate(email);
        if(isValid){
            const OTP = genOTP();
            const htmlFile = await readNReplace(OTP);
            await saveOTP(OTP, email);
            await sendEmail(email, htmlFile);
            state = true;
            msg = `OTP send to ${email}`;
        }else{
            state = false;
            msg = "Invalid email";
        }
        return { success: state, message: msg };
    }catch(e){
        delOTP(email);
        logger.error(`Error at requestOTP function: ${e}`);
        return { success: false, message: "Server down" };
    }
});

exports.verifyOTP = onCall(async({data}) => {
    const email = data.email;
    const otp = data.otp;
    let state, msg, key;
    try{
        const { success, message } = await checkOTP(otp, email);
        if(success){
            const cred = await continueForAuth(email);
            state = true;
            msg = "OTP verification complete!";
            key = cred;
        }else{
            state = false;
            msg = message;
            key = null;
        }
        delOTP(email);
        return { success: state, message: msg, key: key };
    }catch(e){
        delOTP(email);
        logger.error(`Error at verifyOTP function: ${e}`);
        return { success: state, message: msg, key: null };
    }
});

exports.onCloudStorageCreation = onObjectFinalized({ region: 'us-central1' }, async(event) => {
    try{
        const userMedia = /^userMedia\/[^\/]+\/[^\/]+\/[^\/]+$/;
        const filePath = event.data.name;
        if(userMedia.test(filePath)){
            const [, userId, noteId, mediaFile] = filePath.split('/');
            const type = event.data.contentType;
            const size = event.data.size;
            await updateUserStorage(userId, filePath, type, size, true);
        }
    }catch(e){
        logger.error(`Error at onCloudStorageCreation: ${e}`);
        return { success: false, message: 'Error in onCloudStorageCreation' };
    }
});

exports.onCloudStorageDeletion = onObjectDeleted({ region: 'us-central1' }, async(event) => {
    try{
        const userMedia = /^userMedia\/[^\/]+\/[^\/]+\/[^\/]+$/;
        const filePath = event.data.name;
        if(userMedia.test(filePath)){
            const [, userId, noteId, mediaFile] = filePath.split('/');
            const type = event.data.contentType;
            const size = event.data.size;
            await updateUserStorage(userId, filePath, type, size, false);
        }
    }catch(e){
        logger.error(`Error at onCloudStorageDeletion: ${e}`);
        return { success: false, message: 'Error in onCloudStorageDeletion' };
    }
});

exports.noteGeneration = onDocumentCreated('note_ai/{docId}', async(event) => {
    try{
        const snapshot = event.data;
        const id = snapshot.id;
        const data = snapshot.data();
        const userId = data.author;

        const options = {
            detail: 'high',
            outputFormat: 'comprehensive',
            folder: data.folder || ''
        };
        
        if(data.noteType === 'prompt'){
            updateStatus(id, 'Analyzing input...');
            
            const prompt = data.text;
            options.inputType = 'text';
            options.subject = data.subject || 'general';
            
            updateStatus(id, 'Generating enhanced notes...');
            
            const result = await generateStudyNotes(userId, prompt, options);
            
            if(result.success){
                updateStatus(id, 'Completed');
            } else {
                updateStatus(id, `Error: ${result.error}`);
                logger.error(`Error generating notes from prompt: ${result.error}`);
            }
            
        }else if(data.noteType === 'youtube'){
            updateStatus(id, 'Processing transcript...');
            
            const transcript = data.transcript;
            options.inputType = 'transcript';
            options.subject = data.subject || 'video';
            options.metadata = {
                videoId: data.videoId,
                videoTitle: data.videoTitle || ''
            };
            
            updateStatus(id, 'Generating enhanced notes...');
            
            const result = await generateStudyNotes(userId, transcript, options);
            
            if(result.success){
                updateStatus(id, 'Completed');
            } else {
                updateStatus(id, `Error: ${result.error}`);
                logger.error(`Error generating notes from YouTube: ${result.error}`);
            }
            
        }else if(data.noteType === 'webpage'){
            updateStatus(id, 'Scraping webpage...');
            
            const url = data.text;
            
            try {
                const response = await fetch(url);
                
                if(!response.ok){
                    updateStatus(id, 'Error fetching webpage');
                    throw new Error(`Network error: ${response.statusText}`);
                }
                
                const html = await response.text();
                const dom = new JSDOM(html, { url });
                const reader = new Readability(dom.window.document);
                const article = reader.parse();
                
                if (!article) {
                    updateStatus(id, 'Error parsing webpage');
                    throw new Error('Failed to parse webpage content');
                }
                
                updateStatus(id, 'Analyzing content...');
                
                const webContent = `Title: ${article.title}\nByline: ${article.byline}\nContent: ${article.textContent}`;
                options.inputType = 'webpage';
                options.subject = data.subject || 'web';
                options.metadata = {
                    url: url,
                    title: article.title,
                    siteName: article.siteName || ''
                };
                
                updateStatus(id, 'Generating enhanced notes...');
                
                const result = await generateStudyNotes(userId, webContent, options);
                
                if(result.success){
                    updateStatus(id, 'Completed');
                } else {
                    updateStatus(id, `Error: ${result.error}`);
                    logger.error(`Error generating notes from webpage: ${result.error}`);
                }
            } catch (error) {
                updateStatus(id, `Error: ${error.message}`);
                logger.error(`Error processing webpage: ${error}`);
            }
            
        }else if(data.noteType === 'audio'){
            updateStatus(id, 'Processing audio...');

            updateStatus(id, 'Audio processing not yet implemented');
            
        }else if(data.noteType === 'document'){
            updateStatus(id, 'Processing document...');
            
            const url = data.text;
            const { processDocument } = require('./documentProcessor');
            
            try {

                const docOptions = {
                    enhance: true,
                    subject: data.subject || 'document',
                    ocrParams: {
                        tessedit_ocr_engine_mode: '3', 
                        tessedit_pageseg_mode: '1', 
                        preserve_interword_spaces: '1' 
                    }
                };
                
                updateStatus(id, 'Analyzing document type...');

                let documentResult;
                try {
                    documentResult = await processDocument(url, docOptions);
                    
                    if (!documentResult.success) {
                        updateStatus(id, `Error: ${documentResult.error}`);
                        throw new Error(documentResult.error);
                    }

                    if (!documentResult.text || documentResult.text.trim().length < 50) {
                        updateStatus(id, 'Warning: Very little text was extracted from the document. Attempting alternative processing...');

                        const fallbackOptions = {
                            ...docOptions,
                            enhance: true,
                            forceFallback: true
                        };
                        documentResult = await processDocument(url, fallbackOptions);
                        
                        if (!documentResult.success || !documentResult.text || documentResult.text.trim().length < 50) {
                            updateStatus(id, `Error: Could not extract sufficient text from document`);
                            throw new Error('Document processing failed to extract sufficient text');
                        }
                    }
                } catch (processingError) {
                    updateStatus(id, `Error processing document: ${processingError.message}`);
                    throw processingError;
                }
                
                updateStatus(id, `Extracting content from ${documentResult.metadata.documentType} document...`);

                options.inputType = 'document';
                options.subject = data.subject || 'document';
                options.metadata = documentResult.metadata;
                options.documentType = documentResult.metadata.documentType;
                
                updateStatus(id, 'Generating enhanced notes...');

                const result = await generateStudyNotes(userId, documentResult.text, options);

                if(result.success){
                    updateStatus(id, 'Completed');
                }else{
                    updateStatus(id, `Error: ${result.error}`);
                    logger.error(`Error generating notes from document: ${result.error}`);
                }
            }catch(error){
                updateStatus(id, `Error: ${error.message}`);
                logger.error(`Error processing document: ${error}`);
            }
            
        }else if(data.noteType === 'handwritten'){
            updateStatus(id, 'Processing handwritten notes...');
            
            const imageUrl = data.text;
            const { processDocument } = require('./documentProcessor');
            
            try {

                const handwrittenOptions = {
                    enhance: true,
                    subject: data.subject || 'notes',
                    ocrParams: {
                        tessedit_ocr_engine_mode: '2', 
                        tessedit_pageseg_mode: '6', 
                        preserve_interword_spaces: '1', 
                        textord_heavy_nr: '1', 
                        textord_min_linesize: '2.5' 
                    }
                };

                updateStatus(id, 'Analyzing handwritten content...');

                const documentResult = await processDocument(imageUrl, handwrittenOptions);
                
                if (!documentResult.success) {
                    updateStatus(id, `Error: ${documentResult.error}`);
                    throw new Error(documentResult.error);
                }
                
                updateStatus(id, 'Extracting and enhancing handwritten content...');

                options.inputType = 'handwritten';
                options.subject = data.subject || 'notes';
                options.metadata = documentResult.metadata;
                
                updateStatus(id, 'Generating enhanced notes from handwritten content...');

                const result = await convertHandwrittenNotes(userId, imageUrl, options, documentResult.text);
                
                if(result.success){
                    updateStatus(id, 'Completed');
                }else{
                    updateStatus(id, `Error: ${result.error}`);
                    logger.error(`Error converting handwritten notes: ${result.error}`);
                }
            }catch(error){
                updateStatus(id, `Error: ${error.message}`);
                logger.error(`Error processing handwritten document: ${error}`);
            }
            
        }else if(data.noteType === 'improve'){
            updateStatus(id, 'Improving existing note...');

            const noteId = data.noteId;
            options.detail = data.detail || 'high';
            options.format = data.format || 'comprehensive';
            
            updateStatus(id, 'Enhancing note content...');
            
            const result = await improveExistingNote(userId, noteId, options);
            
            if(result.success){
                updateStatus(id, 'Completed');
            }else{
                updateStatus(id, `Error: ${result.error}`);
                logger.error(`Error improving note: ${result.error}`);
            }

        }
    }catch(e){
        logger.error(`Error at noteGeneration: ${e}`);
        updateStatus(id, `Error: ${e.message || 'Unknown error'}`);
        return { success: false, message: 'Error in noteGeneration' };
    }
});

exports.generateNote = onCall(async ({ data, auth }) => {
    try {
        if (!auth) {
            throw new Error('Authentication required');
        }
        
        const userId = auth.uid;
        const { input, options = {} } = data;
        
        if (!input) {
            throw new Error('Input is required');
        }

        const noteOptions = {
            ...options,
            detail: options.detail || 'high',
            outputFormat: options.format || 'comprehensive'
        };

        let result;
        
        switch (options.inputType) {
            case 'handwritten':
                result = await convertHandwrittenNotes(userId, input, noteOptions);
                break;
            case 'improve':
                result = await improveExistingNote(userId, input, noteOptions);
                break;
            default:
                result = await generateStudyNotes(userId, input, noteOptions);
        }
        
        return result;
    }catch(error){
        logger.error(`Error in generateNote: ${error}`);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        };
    }
});

exports.enhanceNote = onCall(async ({ data, auth }) => {
    try{

        if (!auth) {
            throw new Error('Authentication required');
        }

        const userId = auth.uid;
        const { content, title = 'Untitled Note' } = data;

        if(!content){
            throw new Error('Note content is required');
        }

        const { enhanceNoteWithAI } = require('./noteEnhancements');

        const noteData = {
            title: title,
            content: content
        };

        const enhancedNote = await enhanceNoteWithAI(noteData, userId);
        
        return {
            success: true,
            cover: enhancedNote.cover,
            folder: enhancedNote.folder,
            categoryName: enhancedNote.categoryName,
            categoryEmoji: enhancedNote.categoryEmoji
        };

    }catch(error){
        logger.error(`Error in enhanceNote: ${error}`);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        };
    }
});

async function updateFolderNoteCount(folderId, increment = true) {

    if (!folderId) return;

    try {

        const folderRef = db.collection('folders').doc(folderId);
        const folderDoc = await folderRef.get();
        
        if (!folderDoc.exists) {
            logger.warn(`Folder ${folderId} does not exist, cannot update note count`);
            return;
        }

        await folderRef.update({
            notes: FieldValue.increment(increment ? 1 : -1),
            timestamp: FieldValue.serverTimestamp()
        });

        logger.info(`Updated note count for folder ${folderId}: ${increment ? 'incremented' : 'decremented'}`);
    }catch (error){
        logger.error(`Error updating folder note count: ${error}`);
    }
};

exports.onNoteDeleted = onDocumentDeleted('notes/{noteId}', async (event) => {
    try {

        const snapshot = event.data;

        if (!snapshot) {
            logger.warn('No data associated with the delete event');
            return;
        }

        const noteData = snapshot.data();

        const folderId = noteData.folder && typeof noteData.folder === 'object' ? noteData.folder.id : (typeof noteData.folder === 'string' ? noteData.folder : '');

        if(folderId){
            await updateFolderNoteCount(folderId, false);
        }
    }catch (error){
        logger.error(`Error in onNoteDeleted: ${error}`);
    }

});

exports.autoEnhanceNotes = onDocumentCreated('notes/{noteId}', async (event) => {
    try{

        const snapshot = event.data;

        if (!snapshot) {
            logger.warn('No data associated with the event');
            return;
        }

        const noteData = snapshot.data();
        const noteId = snapshot.id;
        const userId = noteData.author;

        if (noteData.cover && noteData.folder) {
            logger.info(`Note ${noteId} already has cover and folder. Skipping enhancement.`);
            return;
        }

        if (!noteData.content || noteData.content.trim() === '') {
            logger.info(`Note ${noteId} has no content. Skipping enhancement.`);
            return;
        }

        logger.info(`Auto-enhancing note ${noteId} for user ${userId}`);

        const { enhanceNoteWithAI } = require('./noteEnhancements');

        const enhancedNote = await enhanceNoteWithAI(noteData, userId);

        const previousFolderId = noteData.folder && typeof noteData.folder === 'object' ? noteData.folder.id : (typeof noteData.folder === 'string' ? noteData.folder : '');

        const newFolderId = enhancedNote.folder && typeof enhancedNote.folder === 'object' ? enhancedNote.folder.id : '';

        await db.collection('notes').doc(noteId).update({
            cover: enhancedNote.cover || '',
            emoji: enhancedNote.emoji || null, 
            folder: enhancedNote.folder || { id: '', name: '' },
            timestamp: FieldValue.serverTimestamp(),
            createdAt: noteData.createdAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        if(newFolderId && newFolderId !== previousFolderId){
            if(previousFolderId){
                await updateFolderNoteCount(previousFolderId, false);
            }
            await updateFolderNoteCount(newFolderId, true);
        }
        logger.info(`Successfully enhanced note ${noteId} with cover image and folder`);
    }catch (error){
        logger.error(`Error in autoEnhanceNotes: ${error}`);
    }
});