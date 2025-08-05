const { db, gemini } = require('./config');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { FieldValue } = require('firebase-admin/firestore');
const { generateEnhancedNotes } = require('./noteGeneration');
const { enhanceNoteWithAI } = require('./noteEnhancements');

const genAI = new GoogleGenerativeAI(gemini);

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    systemInstruction: "You are an AI assistant for a note-taking app called 4note. You can help users find information in their notes, answer questions based on their notes, and provide summaries of their notes. Always be helpful, concise, and accurate. When users ask about their notes, prioritize information from their notes in your responses."
});

const advancedModel = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction: "You are an educational content specialist for 4note, a note-taking app. Your purpose is to create comprehensive, accurate, and well-structured study notes from various inputs. Focus on educational value, factual accuracy, and clear organization. Include relevant examples, diagrams descriptions when helpful, and ensure content is suitable for serious study and exam preparation."
});

async function getUserNotes(userId) {
    try {
        const notesSnapshot = await db.collection('notes').where('author', '==', userId).get();
        
        return notesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || '',
                content: data.content || '',
                createdAt: data.createdAt,
                folder: data.folder || ''
            };
        });
    }catch(error){
        console.error('Error getting user notes:', error);
        return [];
    }
};

async function semanticSearch(userId, query){
    try{

        const notes = await getUserNotes(userId);

        if (notes.length === 0) {
            return [];
        }

        const searchPrompt = `
            I have a collection of notes and I want to find the ones most relevant to this query: "${query}"
            
            Here are my notes (showing ID, title, and content):
            ${notes.map(note => `ID: ${note.id}\nTitle: ${note.title}\nContent: ${note.content.substring(0, 200)}...`).join('\n\n')}
            
            Return the IDs of the 3 most relevant notes to my query, in order of relevance. 
            Format your response as a JSON array of note IDs only, like this: ["id1", "id2", "id3"]
            If no notes are relevant, return an empty array: []
        `;

        const result = await model.generateContent(searchPrompt);
        const responseText = result.response.text();

        const match = responseText.match(/\[.*\]/);

        if (!match) {
            return [];
        }

        try {
            const relevantNoteIds = JSON.parse(match[0]);
            return relevantNoteIds;
        }catch(error){
            console.error('Error parsing search results:', error);
            return [];
        }

    }catch(error){
        console.error('Error in semantic search:', error);
        return [];
    }

};

async function getNotesByIds(noteIds) {
    try{

        if (!noteIds || noteIds.length === 0) {
            return [];
        }

        const notes = [];
    
        for(const id of noteIds){
            const noteDoc = await db.collection('notes').doc(id).get();
            if(noteDoc.exists){
                const data = noteDoc.data();
                notes.push({
                    id: noteDoc.id,
                    title: data.title || '',
                    content: data.content || '',
                    createdAt: data.createdAt,
                    folder: data.folder || ''
                });
            }
        }

        return notes;
    }catch(error){
        console.error('Error getting notes by IDs:', error);
        return [];
    }
};

async function generateResponse(userId, query, chatHistory = []) {
    try {
        const relevantNoteIds = await semanticSearch(userId, query);
        const relevantNotes = await getNotesByIds(relevantNoteIds);

        const formattedHistory = chatHistory.map(msg => {
            return {
                role: msg.isUser ? 'user' : 'model',
                parts: [{ text: msg.content }]
            };
        });

        let prompt;
    
        if(relevantNotes.length > 0){
            prompt = `
                I found these notes that might help answer your question:
                ${relevantNotes.map(note => `Note: ${note.title}\n${note.content}`).join('\n\n')}
                
                Based on these notes, please answer: ${query}
            `;
        }else{
            prompt = `
                I couldn't find any specific notes related to your question. 
                I'll try to help with general information about: ${query}
            `;
        }

        let response;

        if(formattedHistory.length > 0){
            const chat = model.startChat({
                history: formattedHistory
            });
            response = await chat.sendMessage(prompt);
        }else{
            response = await model.generateContent(prompt);
        }

        await saveChatMessage(userId, query, true);
        await saveChatMessage(userId, response.response.text(), false);

        return {
            success: true,
            response: response.response.text(),
            relevantNotes: relevantNotes.map(note => ({ id: note.id, title: note.title }))
        };

    }catch(error){
        console.error('Error generating response:', error);
        return {
            success: false,
            error: error.message || 'An error occurred while generating a response'
        };
    }

};

async function saveChatMessage(userId, message, isUser = true) {
    try {
        await db.collection('users').doc(userId).collection('chat_history').add({
            content: message,
            isUser: isUser,
            timestamp: FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error saving chat message:', error);
        return false;
    }
};

async function getChatHistory(userId, limit = 20) {
    try {

        const historySnapshot = await db.collection('users').doc(userId).collection('chat_history').orderBy('timestamp', 'desc').limit(limit).get();

        const history = historySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                content: data.content,
                isUser: data.isUser,
                timestamp: data.timestamp
            };
        });

        return history.reverse();
    }catch(error){
        console.error('Error getting chat history:', error);
        return [];
    }
};

async function generateStudyNotes(userId, input, options = {}) {
    try {

        const noteOptions = {
            inputType: options.inputType || 'auto',
            subject: options.subject || 'general',
            outputFormat: options.format || 'comprehensive',
            detail: options.detail || 'high',
            includeExamples: options.includeExamples !== false,
            includeSummary: options.includeSummary !== false,
            includeQuestions: options.includeQuestions !== false,
            metadata: options.metadata || {}
        };

        const modelOptions = { model: advancedModel };

        const result = await generateEnhancedNotes(input, noteOptions, modelOptions);

        if (!result.success) {
            return { success: false, error: result.error || 'Failed to generate notes' };
        }

        const noteRef = db.collection('notes').doc();

        let title = 'Study Notes';

        let titleMatch = result.notes.match(/<title>([^<]+)<\/title>/);

        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            result.notes = result.notes.replace(/<title>[^<]+<\/title>/, '');
        }else{
            titleMatch = result.notes.match(/^#\s+(.+)$/m);
            if(titleMatch && titleMatch[1]){
                title = titleMatch[1].trim();
            }else if(options.subject){
                title = `Notes on ${options.subject}`;
            }
        }

        const enhancedNote = await enhanceNoteWithAI({
            title: title,
            content: result.notes
        }, userId);

        await noteRef.set(enhancedNote);
    
        return {
            success: true,
            noteId: noteRef.id,
            title: enhancedNote.title,
            content: enhancedNote.content,
            folder: enhancedNote.folder,
            cover: enhancedNote.cover,
            emoji: enhancedNote.emoji,
            metadata: result.metadata
        };

    }catch(error){
        console.error('Error generating study notes:', error);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        };
    }
};

async function improveExistingNote(userId, noteId, options = {}) {
  try {
        const noteDoc = await db.collection('notes').doc(noteId).get();
    
        if (!noteDoc.exists) {
            return { success: false, error: 'Note not found' };
        }

        const noteData = noteDoc.data();

        if (noteData.author !== userId) {
            return { success: false, error: 'Not authorized to improve this note' };
        }

        const improvementOptions = {
            ...options,
            inputType: 'text',
            subject: options.subject || noteData.title || 'general',
            detail: options.detail || 'high',
            outputFormat: options.format || 'comprehensive'
        };

        const modelOptions = { model: advancedModel };
        const result = await generateEnhancedNotes(noteData.content, improvementOptions, modelOptions);
    
        if (!result.success) {
            return { success: false, error: result.error || 'Failed to improve note' };
        }

        await db.collection('notes').doc(noteId).update({
            content: result.notes,
            timestamp: FieldValue.serverTimestamp(),
            lastImproved: FieldValue.serverTimestamp()
        });
    
        return {
            success: true,
            noteId: noteId,
            title: noteData.title,
            content: result.notes,
            metadata: result.metadata
        };
    }catch(error){
        console.error('Error improving note:', error);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        };
    }
};

async function convertHandwrittenNotes(userId, imageUrl, options = {}, preprocessedText = null) {
    try {

        const conversionOptions = {
            ...options,
            inputType: 'handwritten',
            detail: options.detail || 'high',
            outputFormat: options.format || 'comprehensive'
        };
    
        let result;

        if (preprocessedText) {
            console.log('Using preprocessed text from document processor for handwritten notes');

            const enhancementPrompt = `
                I have extracted the following text from a handwritten document using OCR.
                The OCR process may have introduced errors or missed some text.
                
                Please correct any obvious errors and organize this content into comprehensive, well-structured study notes suitable for exam preparation.
                Fill in any gaps that seem to be missing due to OCR limitations.
                
                Your notes should include:
                - Clear headings and subheadings to organize the content
                - Key concepts and definitions clearly identified
                - Important relationships between concepts
                - Examples or applications where relevant
                - A brief summary at the end if appropriate
                
                Use markdown formatting with proper headings, lists, and emphasis.
                Include a descriptive title at the beginning using the format: <title>Title Here</title>
                
                Subject: ${options.subject || 'General Notes'}
                Detail level: ${options.detail || 'high'}
                
                OCR extracted content:\n${preprocessedText}
            `;

            const enhancementResult = await advancedModel.generateContent(enhancementPrompt);
            const enhancedText = enhancementResult.response.text();

            result = {
                success: true,
                notes: enhancedText,
                metadata: {
                    inputType: 'handwritten',
                    subject: options.subject || 'General Notes',
                    format: options.outputFormat || 'comprehensive',
                    enhancementMethod: 'ocr-plus-ai'
                }
            };
        }else{
            console.log('No preprocessed text available, using standard handwritten note conversion');
            const modelOptions = { model: advancedModel };
            result = await generateEnhancedNotes(imageUrl, conversionOptions, modelOptions);
        }

        if (!result.success) {
            return { success: false, error: result.error || 'Failed to convert handwritten notes' };
        }

        const noteRef = db.collection('notes').doc();

        let title = 'Converted Handwritten Notes';

        let titleMatch = result.notes.match(/<title>([^<]+)<\/title>/);

        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            result.notes = result.notes.replace(/<title>[^<]+<\/title>/, '');
        }else{
            titleMatch = result.notes.match(/^#\s+(.+)$/m);
            if(titleMatch && titleMatch[1]){
                title = titleMatch[1].trim();
            }else if(options.subject){
                title = `Notes on ${options.subject}`;
            }
        }

        const enhancedNote = await enhanceNoteWithAI({
            title: title,
            content: result.notes
        }, userId);

        const noteData = {
            ...enhancedNote,
            author: userId,
            timestamp: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            generatedFrom: {
                inputType: 'handwritten',
                originalImage: imageUrl,
                subject: result.metadata.subject,
                format: result.metadata.format
            }
        };

        await noteRef.set(noteData);
    
        return {
            success: true,
            noteId: noteRef.id,
            title: enhancedNote.title,
            content: enhancedNote.content,
            folder: enhancedNote.folder,
            cover: enhancedNote.cover,
            emoji: enhancedNote.emoji,
            metadata: result.metadata
        };

    }catch(error){
        console.error('Error converting handwritten notes:', error);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        };
    }

};

const getPexels = async(query) => {
    try{
        const url = `https://api.pexels.com/v1/search?query=${query||"illustration"}&page=0&per_page=1`;
        const response = await fetch(url, {
            headers: { Authorization: 'QkwC440eFK2r7lDPOksz4VmnJEi820gOm8D8Y3QDj2OUAWcey6L4BP6P' }
        });
        const json = await response.json();
        const result = json?.photos?.[0]?.src?.landscape;
        return result;
    }catch(error){
        console.error('Error fetching Pexels image:', error);
        return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNNLEL-qmmLeFR1nxJuepFOgPYfnwHR56vcw&s';
    }
};

async function generateCoverImage(noteContent, subject) {
    try{

        const prompt = `
            Based on the following note content about ${subject}, suggest a topic for
            a cover image that visually represents the main concepts. The topic should be concise 
            and focus on visual elements that would make a good cover image. 
            For example if a note is based on "artificial intelligence", then your output must be "Artificial Intelligence".\n
            Note content (excerpt)\n:
            ${noteContent?.substring(0, 500)}...
        `;

        const promptResult = await advancedModel.generateContent(prompt);
        const imagePrompt = promptResult.response.text().trim();

        const imgUrl = await getPexels(imagePrompt);
    
        return {
            url: imgUrl,
            prompt: imagePrompt,
            subject: subject
        };

    }catch(error){
        console.error('Error generating cover image:', error);
        const timestamp = Date.now();
        return {
            url: `https://source.unsplash.com/featured/1024x768/?notes&t=${timestamp}`,
            prompt: 'Default study notes cover',
            subject: subject
        };
    }

};

async function detectNoteCategory(noteContent, userId) {
    try {

        const foldersSnapshot = await db.collection('folders').where('author', '==', userId).get();

        const existingFolders = foldersSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            emoji: doc.data().emoji
        }));

        const prompt = `
            Analyze the following note content and suggest the most appropriate category for it.
            Also suggest an emoji that represents this category well.
            
            Note content (excerpt):
            ${noteContent.substring(0, 1000)}...
            
            Existing categories (IMPORTANT: Try to use one of these if the content fits):
            ${existingFolders.map(f => `${f.emoji} ${f.name} (ID: ${f.id})`).join(', ')}
            
            IMPORTANT INSTRUCTIONS:
            1. If the content fits into ANY existing category, use that category exactly as it appears above.
            2. For topics like Computer Science, Programming, Math, Physics, etc., be very careful to check if a similar category already exists.
            3. Prioritize matching with existing categories over creating new ones.
            4. Only suggest a new category if the content is clearly different from all existing categories.
            
            Return your response in this exact JSON format:
            {
                "category": "Category Name",
                "emoji": "📚",
                "useExisting": true/false,
                "matchingFolderId": "id-of-matching-folder-or-empty-if-none"
            }
        `;

        const categoryResult = await advancedModel.generateContent(prompt);
        const categoryText = categoryResult.response.text().trim();

        let categoryData;
        try{
            const jsonMatch = categoryText.match(/\{[\s\S]*\}/);
            if(jsonMatch){
                categoryData = JSON.parse(jsonMatch[0]);
            }else{
                throw new Error('Invalid JSON format in response');
            }
        }catch(parseError){
            console.error('Error parsing category JSON:', parseError);
            categoryData = {
                category: 'Study Notes',
                emoji: '📚',
                useExisting: false,
                matchingFolderId: ''
            };
        }

        const normalizedCategory = categoryData.category.toLowerCase().trim();

        let matchingExistingFolder = existingFolders.find(f => {
            const folderNameWithoutEmoji = f.name.replace(/[\u{1F300}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim().toLowerCase();
            return folderNameWithoutEmoji === normalizedCategory;
        });

        if(!matchingExistingFolder){
            matchingExistingFolder = existingFolders.find(f => {
                const folderNameWithoutEmoji = f.name.replace(/[\u{1F300}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim().toLowerCase();
                return folderNameWithoutEmoji.includes(normalizedCategory) || normalizedCategory.includes(folderNameWithoutEmoji);
            });
        }
    
        if(matchingExistingFolder){
            console.log(`Using existing folder: ${matchingExistingFolder.name}`);
            return {
                id: matchingExistingFolder.id,
                name: matchingExistingFolder.name
            };
        }

        const folderName = categoryData.category.startsWith(categoryData.emoji) ? categoryData.category : `${categoryData.emoji} ${categoryData.category}`;

        const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

        const newFolderRef = db.collection('folders').doc();

        const newFolder = {
            name: folderName,
            color: randomColor,
            author: userId,
            timestamp: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            notes: 1, 
        };
    
        await newFolderRef.set(newFolder);

        return {
            id: newFolderRef.id,
            name: `${categoryData.emoji} ${categoryData.category}`,
            emoji: categoryData.emoji
        };
    }catch(error){

        console.error('Error detecting note category:', error);
        const defaultFolderRef = db.collection('folders').doc();
        const defaultColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
        const defaultFolder = {
            name: '📚 Study Notes',
            color: defaultColor,
            author: userId,
            timestamp: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            notes: 1, 
        };
    
        await defaultFolderRef.set(defaultFolder);
    
        return {
            id: defaultFolderRef.id,
            name: '📚 Study Notes'
        };
    }

};

module.exports = {
    semanticSearch,
    generateResponse,
    saveChatMessage,
    getChatHistory,
    generateStudyNotes,
    improveExistingNote,
    convertHandwrittenNotes,
    generateCoverImage,
    detectNoteCategory
};