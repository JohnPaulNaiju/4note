const { db, gemini } = require('./config');
const { FieldValue } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(gemini);
const advancedModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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
    try {
        const prompt = `
            Based on the following note content about ${subject}, suggest a topic for
            a cover image that visually represents the main concepts. The topic should be concise 
            and focus on visual elements that would make a good cover image. 
            For example if a note is based on "artificial intelligence", then your output must be "Artificial Intelligence".\n
            Note content (excerpt)\n:
            ${noteContent.substring(0, 500)}...
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
            url: `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNNLEL-qmmLeFR1nxJuepFOgPYfnwHR56vcw&s`,
            prompt: 'Default study notes cover',
            subject: subject
        };
    }
};

async function detectNoteCategory(noteContent, userId) {
    try{

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
        try {
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
    
        if (matchingExistingFolder) {
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
            notes: 0,
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
            notes: 0,
        };

        await defaultFolderRef.set(defaultFolder);

        return {
            id: defaultFolderRef.id,
            name: '📚 Study Notes'
        };
    }
}

async function enhanceNoteWithAI(noteData, userId) {
    try {
        const { content, title } = noteData;
        const subject = title || 'Study Notes';

        const coverImage = await generateCoverImage(content, subject);

        const category = await detectNoteCategory(content, userId);

        const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
        const emojiMatch = category.name.match(emojiRegex);
        const emoji = emojiMatch ? emojiMatch[0] : null;
    
        return {
            title: noteData.title || subject,
            content: noteData.content || '',
            cover: coverImage.url,
            emoji: emoji, 
            folder: {
                id: category.id,
                name: category.name
            },
            timestamp: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            author: userId,
            pinned: noteData.pinned || false,
            sharing: noteData.sharing || false
        };
    } catch (error) {
        console.error('Error enhancing note with AI:', error);
        return {
            title: noteData.title || 'Study Notes',
            content: noteData.content || '',
            cover: '',
            emoji: '📝', 
            folder: {
                id: '',
                name: ''
            },
            timestamp: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            author: userId,
            pinned: noteData.pinned || false,
            sharing: noteData.sharing || false
        };
    }
}

module.exports = {
  generateCoverImage,
  detectNoteCategory,
  enhanceNoteWithAI
};
