const { gemini } = require('./config');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(gemini);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

async function generateEnhancedNotes(input, options = {}, modelOptions = {}) {
    try {

        const {
            inputType = 'auto',
            subject = 'general',
            outputFormat = 'comprehensive',
            detail = 'high',
            includeExamples = true,
            includeSummary = true,
            includeQuestions = true
        } = options;

        const aiModel = modelOptions.model || model;

        const documentAnalysis = await analyzeDocument(input, inputType, aiModel);

        const extractedContent = await extractContent(documentAnalysis, subject, aiModel);

        const enhancedContent = await enhanceKnowledge(extractedContent, detail, aiModel);

        const structuredNotes = await structureNotes(enhancedContent, outputFormat, {
            includeExamples,
            includeSummary,
            includeQuestions,
            model: aiModel
        });
    
        return {
            success: true,
            notes: structuredNotes,
            metadata: {
                inputType: documentAnalysis.detectedType || inputType,
                subject,
                format: outputFormat,
                detail,
                generatedAt: new Date().toISOString()
            }
        };
    }catch(error){
        console.error('Error generating enhanced notes:', error);
        return {
            success: false,
            error: error.message,
            notes: null
        };
    }
}

async function analyzeDocument(document, type = 'auto', customModel = model) {
    if(type === 'auto'){
        if (document.startsWith('data:image/')) {
            type = 'image';
        } else if (document.startsWith('https://') || document.startsWith('http://')) {
            type = 'url';
        } else if (document.length > 5000) {
            type = 'longtext';
        } else {
            type = 'text';
        }
    }
    switch(type) {
        case 'image':
            return await analyzeImageDocument(document);
        case 'handwritten':
            return await analyzeHandwrittenDocument(document);
        case 'url':
            return await analyzeUrlDocument(document);
        case 'pdf':
            return await analyzePdfDocument(document);
        case 'longtext':
            return await analyzeLongTextDocument(document);
        case 'text':
        default:
            return await analyzeTextDocument(document);
    }
}

async function analyzeTextDocument(text) {
    const prompt = `
        Analyze the following text content for note generation. Identify:
        1. The main topic or subject
        2. Key concepts and terms
        3. The apparent structure (is it a lecture, article, textbook excerpt, etc.)
        4. The academic level (high school, undergraduate, graduate, etc.)
        5. Any specialized domain knowledge required
        
        Text content: ${text.substring(0, 3000)}${text.length > 3000 ? '... (content truncated)' : ''}
    `;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
    
    return {
        content: text,
        analysis,
        detectedType: 'text'
    };

}

async function analyzeLongTextDocument(text) {

    const textLength = text.length;
    const chunkSize = 2000;

    const beginning = text.substring(0, chunkSize);
    const middle = text.substring(Math.floor(textLength/2) - chunkSize/2, Math.floor(textLength/2) + chunkSize/2);
    const end = text.substring(textLength - chunkSize, textLength);

    const prompt = `
        Analyze the following excerpts from a long document for note generation. These are samples from the beginning, middle, and end of the document.
        Identify:
        1. The main topic or subject
        2. Key concepts and terms
        3. The apparent structure and document type
        4. The academic level
        5. Any specialized domain knowledge required
        
        Beginning excerpt: ${beginning}
        
        Middle excerpt: ${middle}
        
        End excerpt: ${end}
    `;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
  
    return {
        content: text,
        analysis,
        detectedType: 'longtext'
    };

}

async function extractContent(documentAnalysis, subject, customModel = model) {

    const { content, analysis } = documentAnalysis;

    const needsChunking = content.length > 8000;

    let extractionPrompt;
  
    if(needsChunking){
        return await extractLongContent(content, analysis, subject);
    }else{
        extractionPrompt = `
            Based on the following content and analysis, extract key educational elements for note generation.
            Focus on the subject area: ${subject}
            
            Extract the following elements:
            1. Key terms and concepts (with clear definitions)
            2. Important facts and principles
            3. Formulas, equations, or methodologies (if applicable)
            4. Examples that illustrate key concepts
            5. Relationships between concepts
            6. Potential areas of confusion or misconception
            
            Content: ${content}
            
            Analysis: ${analysis}
            
            Format your response as structured JSON with the following keys:
            keyTerms, definitions, facts, formulas, examples, relationships, potentialConfusions
        `;
    }

    const result = await model.generateContent(extractionPrompt);
    const extractionText = result.response.text();

    try {

        const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
    
        if(!jsonMatch){
            console.warn('No JSON object found in extraction response');
            throw new Error('No JSON object found in response');
        }

        let jsonStr = jsonMatch[0];

        jsonStr = jsonStr.replace(/\\"([^\\"]*)\\"/, '"$1"')
                   .replace(/\\n/g, '\\n')
                   .replace(/\\r/g, '\\r')
                   .replace(/\\t/g, '\\t')
                   .replace(/,\s*}/g, '}')
                   .replace(/,\s*]/g, ']');

        const safeJsonParse = (str, fallback) => {
            try{
                return JSON.parse(str);
            }catch(e){
                console.warn('Failed to parse JSON part:', e);
                return fallback;
            }
        };

        let extracted;
        try{
            extracted = JSON.parse(jsonStr);
        }catch(innerError){

            console.error('First JSON parse attempt failed:', innerError);

            const keyTermsMatch = jsonStr.match(/\"keyTerms\"\s*:\s*(\[[^\]]*\])/);
            const definitionsMatch = jsonStr.match(/\"definitions\"\s*:\s*(\[[^\]]*\])/);
            const factsMatch = jsonStr.match(/\"facts\"\s*:\s*(\[[^\]]*\])/);
      
            extracted = {
                keyTerms: keyTermsMatch ? safeJsonParse(keyTermsMatch[1], []) : [],
                definitions: definitionsMatch ? safeJsonParse(definitionsMatch[1], []) : [],
                facts: factsMatch ? safeJsonParse(factsMatch[1], []) : [],
                formulas: [],
                examples: [],
                relationships: [],
                potentialConfusions: []
            };
        }
    
        return {
            ...extracted,
            subject,
            mainContent: content
        };
    }catch(error){
        console.error('Error parsing extraction JSON:', error);
        return {
            rawExtraction: true,
            extractionText,
            subject,
            mainContent: content,
            keyTerms: [],
            definitions: [],
            facts: [],
            formulas: [],
            examples: [],
            relationships: [],
            potentialConfusions: []
        };
    }
}

async function extractLongContent(content, analysis, subject) {

    const chunkSize = 5000;
    const overlap = 500;
    const chunks = [];

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
        chunks.push(content.substring(i, i + chunkSize));
    }

    const chunkResults = await Promise.all(chunks.map(async (chunk, index) => {
        const chunkPrompt = `
            Extract key educational elements from PART ${index+1} of ${chunks.length} of a longer document.
            Focus on the subject area: ${subject}
            
            Extract the following elements:
            1. Key terms and concepts (with clear definitions)
            2. Important facts and principles
            3. Formulas, equations, or methodologies (if applicable)
            4. Examples that illustrate key concepts
            
            Content chunk ${index+1}: ${chunk}
            
            Format your response as structured JSON with the following keys:
            keyTerms, definitions, facts, formulas, examples
        `;
    
        const result = await model.generateContent(chunkPrompt);
        const extractionText = result.response.text();

        try{
            const jsonMatch = extractionText.match(/\{[\s\S]*\}/); 
      
            if (!jsonMatch) {
                console.warn(`No JSON object found in chunk ${index} extraction`);
                return { 
                    extractionText, 
                    chunkIndex: index,
                    keyTerms: [],
                    definitions: {},
                    facts: [],
                    formulas: [],
                    examples: []
                };
            }

            let jsonStr = jsonMatch[0];

            jsonStr = jsonStr.replace(/\\"([^\\"]*)\\"/, '"$1"')
                       .replace(/\\n/g, '\\n')
                       .replace(/\\r/g, '\\r')
                       .replace(/\\t/g, '\\t')
                       .replace(/,\s*}/g, '}')
                       .replace(/,\s*]/g, ']');

            const safeJsonParse = (str, fallback) => {
                try {
                    return JSON.parse(str);
                }catch(e){
                    console.warn(`Failed to parse JSON part in chunk ${index}:`, e);
                    return fallback;
                }
            };

            try{
                return JSON.parse(jsonStr);
            }catch(innerError){
                console.error(`First JSON parse attempt failed for chunk ${index}:`, innerError);

                const keyTermsMatch = jsonStr.match(/\"keyTerms\"\s*:\s*(\[([^\[\]]|\[[^\[\]]*\])*\])/); 
                const definitionsMatch = jsonStr.match(/\"definitions\"\s*:\s*(\{([^\{\}]|\{[^\{\}]*\})*\})/); 
                const factsMatch = jsonStr.match(/\"facts\"\s*:\s*(\[([^\[\]]|\[[^\[\]]*\])*\])/); 
                const formulasMatch = jsonStr.match(/\"formulas\"\s*:\s*(\[([^\[\]]|\[[^\[\]]*\])*\])/); 
                const examplesMatch = jsonStr.match(/\"examples\"\s*:\s*(\[([^\[\]]|\[[^\[\]]*\])*\])/); 

                return {
                    keyTerms: keyTermsMatch ? safeJsonParse(keyTermsMatch[1], []) : [],
                    definitions: definitionsMatch ? safeJsonParse(definitionsMatch[1], {}) : {},
                    facts: factsMatch ? safeJsonParse(factsMatch[1], []) : [],
                    formulas: formulasMatch ? safeJsonParse(formulasMatch[1], []) : [],
                    examples: examplesMatch ? safeJsonParse(examplesMatch[1], []) : []
                };
            }

        }catch(error){
            console.error(`Error parsing extraction JSON for chunk ${index}:`, error);
            return { 
                extractionText, 
                chunkIndex: index,
                keyTerms: [],
                definitions: {},
                facts: [],
                formulas: [],
                examples: []
            };
        }
    }));

    const combined = {
        keyTerms: [],
        definitions: {},
        facts: [],
        formulas: [],
        examples: [],
        subject,
        mainContent: content
    };

    chunkResults.forEach(result => {

        if (result.keyTerms && Array.isArray(result.keyTerms)) {
            combined.keyTerms.push(...result.keyTerms);
        }

        if (result.definitions && typeof result.definitions === 'object') {
            combined.definitions = { ...combined.definitions, ...result.definitions };
        }
        
        if (result.facts && Array.isArray(result.facts)) {
            combined.facts.push(...result.facts);
        }
        
        if (result.formulas && Array.isArray(result.formulas)) {
            combined.formulas.push(...result.formulas);
        }
        
        if (result.examples && Array.isArray(result.examples)) {
            combined.examples.push(...result.examples);
        }
    });

    combined.keyTerms = Array.isArray(combined.keyTerms) ? [...new Set(combined.keyTerms)] : [];
    
    combined.facts = Array.isArray(combined.facts) ? 
        combined.facts.filter((fact, index, self) => fact && index === self.findIndex(f => f === fact)) : [];
    
    combined.formulas = Array.isArray(combined.formulas) ? 
        combined.formulas.filter((formula, index, self) => formula && index === self.findIndex(f => f === formula)) : [];

    if (Array.isArray(combined.examples) && combined.examples.length > 10) {
        combined.examples = combined.examples.slice(0, 10);
    } else if (!Array.isArray(combined.examples)) {
        combined.examples = [];
    }
    return combined;
}

async function enhanceKnowledge(extractedContent, detailLevel = 'high', customModel = model) {

    const { keyTerms, definitions, facts, formulas, examples, subject, mainContent } = extractedContent;

    const enhancementLevel = {
        'low': 0.3,
        'medium': 0.6,
        'high': 1.0
    }[detailLevel] || 0.6;

    const termsToEnhance = keyTerms.slice(0, Math.ceil(keyTerms.length * enhancementLevel));

    const enhancementPrompt = `
        Enhance the following educational content for the subject: ${subject}
        
        For each of these key terms, provide:
        1. A more comprehensive definition
        2. Additional context or background information
        3. Common applications or significance
        4. Related concepts
        
        Key terms to enhance: ${JSON.stringify(termsToEnhance)}
        
        Current definitions: ${JSON.stringify(definitions)}
        
        Format your response as a JSON object where keys are the terms and values are objects with:
        enhancedDefinition, context, applications, relatedConcepts
    `;

    const result = await model.generateContent(enhancementPrompt);
    const enhancementText = result.response.text();

    const safeJsonParse = (str, fallback) => {
        try{
            return JSON.parse(str);
        }catch(e){
            console.warn('Failed to parse JSON part in enhancement:', e);
            return fallback;
        }
    };

    try {
        const jsonMatch = enhancementText.match(/\{[\s\S]*\}/);
    
        if (!jsonMatch) {
            console.warn('No JSON object found in enhancement response');
            throw new Error('No JSON object found in enhancement response');
        }

        let jsonStr = jsonMatch[0];

        jsonStr = jsonStr.replace(/\\"([^\\"]*)\\"/, '"$1"')
                   .replace(/\\n/g, '\\n')
                   .replace(/\\r/g, '\\r')
                   .replace(/\\t/g, '\\t')
                   .replace(/,\s*}/g, '}')
                   .replace(/,\s*]/g, ']');

        let enhancedDefinitions;

        try{
            enhancedDefinitions = JSON.parse(jsonStr);
        }catch(innerError){
            console.error('First JSON parse attempt failed for enhancement:', innerError);
            try {
                const keyValuePairs = jsonStr.match(/\"([^\"]+)\"\s*:\s*(\{[^\}]*\}|\[[^\]]*\]|\"[^\"]*\"|[^,\}\]]*)/g);
                
                if (keyValuePairs) {
                    enhancedDefinitions = {};
                    keyValuePairs.forEach(pair => {
                        try {
                            const keyMatch = pair.match(/\"([^\"]+)\"/); 
                            if (keyMatch && keyMatch[1]) {
                                const key = keyMatch[1];
                                const valueMatch = pair.match(/:\s*(.+)/);
                                if (valueMatch && valueMatch[1]) {
                                    let value = valueMatch[1].trim();
                                    if (value.endsWith(',')) {
                                        value = value.slice(0, -1);
                                    }
                                    try {
                                        enhancedDefinitions[key] = JSON.parse(value);
                                    } catch (e) {
                                        enhancedDefinitions[key] = { enhancedDefinition: value };
                                    }
                                }
                            }
                        } catch (pairError) {
                            console.warn('Error processing key-value pair:', pairError);
                        }
                    });
                }
                
                if (!enhancedDefinitions || Object.keys(enhancedDefinitions).length === 0) {
                    enhancedDefinitions = {};
                }
            } catch (regexError) {
                console.error('Regex extraction failed:', regexError);
                enhancedDefinitions = {};
            }
        }

        const gapsPrompt = `
            Based on this educational content for ${subject}, identify 3-5 important concepts or explanations that appear to be missing but would be valuable for a complete understanding.
            
            For each identified gap:
            1. Name the missing concept
            2. Explain why it's important
            3. Provide the missing information
            
            Current content includes:
            Key terms: ${JSON.stringify(keyTerms)}
            Facts: ${JSON.stringify(facts.slice(0, 10))}${facts.length > 10 ? '... (more facts available)' : ''}
            
            Format your response as a JSON array of objects with:
            conceptName, importance, explanation
        `;

        const gapsResult = await model.generateContent(gapsPrompt);
        const gapsText = gapsResult.response.text();

        const gapsJsonMatch = gapsText.match(/\[[\s\S]*\]/);
    
        let knowledgeGaps = [];

        if(gapsJsonMatch){

            let gapsJsonStr = gapsJsonMatch[0];

            gapsJsonStr = gapsJsonStr.replace(/\\"([^\\"]*)\\"/, '"$1"')
                         .replace(/\\n/g, '\\n')
                         .replace(/\\r/g, '\\r')
                         .replace(/\\t/g, '\\t')
                         .replace(/,\s*}/g, '}')
                         .replace(/,\s*]/g, ']');

            try {
                knowledgeGaps = JSON.parse(gapsJsonStr);
            }catch(gapsError){
                console.error('Error parsing knowledge gaps JSON:', gapsError);
                const conceptMatches = gapsJsonStr.match(/\"conceptName\"\s*:\s*\"([^\"]*)\"/g);
                if(conceptMatches){
                    knowledgeGaps = conceptMatches.map((match, index) => {
                        const conceptName = match.replace(/\"conceptName\"\s*:\s*\"([^\"]*)\"/, '$1');
                        return {
                            conceptName,
                            importance: 'Important for complete understanding',
                            explanation: `This concept relates to ${subject} and should be included in the notes.`
                        };
                    });
                }
            }
        }
    
        return {
            ...extractedContent,
            enhancedDefinitions,
            knowledgeGaps
        };
    } catch (error) {
        console.error('Error parsing enhancement JSON:', error);
        return {
            ...extractedContent,
            enhancementText
        };
    }
};

async function structureNotes(enhancedContent, format = 'comprehensive', options = {}) {

    const { 
        includeExamples = true,
        includeSummary = true,
        includeQuestions = true
    } = options;

    const customModel = options.model || model;

    const {
        keyTerms,
        definitions,
        enhancedDefinitions,
        facts,
        formulas,
        examples,
        knowledgeGaps,
        subject,
        mainContent
    } = enhancedContent;

    let formattingPrompt;
  
    switch(format) {
        case 'cornell':
            formattingPrompt = `
                Structure the following educational content into Cornell Notes format (with cues, notes, and summary).
                Subject: ${subject}
                
                Content to structure:
                Key terms: ${JSON.stringify(keyTerms)}
                Definitions: ${JSON.stringify(enhancedDefinitions || definitions)}
                Facts: ${JSON.stringify(facts)}
                Formulas: ${JSON.stringify(formulas)}
                ${includeExamples ? `Examples: ${JSON.stringify(examples)}` : ''}
                ${knowledgeGaps ? `Additional important concepts: ${JSON.stringify(knowledgeGaps)}` : ''}
                
                Format your response as markdown with clear Cornell Notes structure:
                - Left column (cues/questions)
                - Right column (notes/answers)
                - Summary section at the bottom
                
                Make sure the notes are comprehensive and well-organized for effective studying.
            `;
            break;
        
        case 'outline':
            formattingPrompt = `
                Structure the following educational content into a hierarchical outline format with main topics, subtopics, and details.
                Subject: ${subject}
                
                Content to structure:
                Key terms: ${JSON.stringify(keyTerms)}
                Definitions: ${JSON.stringify(enhancedDefinitions || definitions)}
                Facts: ${JSON.stringify(facts)}
                Formulas: ${JSON.stringify(formulas)}
                ${includeExamples ? `Examples: ${JSON.stringify(examples)}` : ''}
                ${knowledgeGaps ? `Additional important concepts: ${JSON.stringify(knowledgeGaps)}` : ''}
                
                Format your response as a markdown outline with:
                - Main topics (Level 1 headings)
                - Subtopics (Level 2 headings)
                    - Key points (bullet points)
                    - Supporting details (indented bullet points)
                
                Organize the content logically by related concepts rather than just listing everything.
            `;
            break;
        
        case 'flashcard':
            formattingPrompt = `
                Structure the following educational content into a set of flashcards for effective studying.
                Subject: ${subject}
                
                Content to structure:
                Key terms: ${JSON.stringify(keyTerms)}
                Definitions: ${JSON.stringify(enhancedDefinitions || definitions)}
                Facts: ${JSON.stringify(facts)}
                Formulas: ${JSON.stringify(formulas)}
                ${knowledgeGaps ? `Additional important concepts: ${JSON.stringify(knowledgeGaps)}` : ''}
                
                Format your response as markdown with each flashcard in this format:
                
                ## Question/Term
                Answer/Definition
                
                Create flashcards for key terms, important concepts, and formulas. Include application questions that test understanding.
            `;
            break;
        
        case 'comprehensive':
        default:
            formattingPrompt = `
                Create comprehensive, well-structured study notes from the following educational content.
                Subject: ${subject}
                
                Content to structure:
                Key terms: ${JSON.stringify(keyTerms)}
                Definitions: ${JSON.stringify(enhancedDefinitions || definitions)}
                Facts: ${JSON.stringify(facts)}
                Formulas: ${JSON.stringify(formulas)}
                ${includeExamples ? `Examples: ${JSON.stringify(examples)}` : ''}
                ${knowledgeGaps ? `Additional important concepts: ${JSON.stringify(knowledgeGaps)}` : ''}
                
                Format your response as markdown with:
                1. A clear introduction explaining the main topic
                2. Well-organized sections with headings and subheadings
                3. Definitions and explanations of key terms
                4. Formulas with explanations of variables and applications
                5. Examples that illustrate key concepts
                ${includeSummary ? '6. A summary of the most important points' : ''}
                ${includeQuestions ? '7. Practice questions to test understanding' : ''}
                
                Make the notes comprehensive enough for serious study, but well-structured and easy to follow.
            `;
            break;
    }

    const result = await model.generateContent(formattingPrompt);
    const formattedNotes = result.response.text();

    return formattedNotes;

};

async function analyzeImageDocument(imageData) {
    return {
        content: "Image content would be extracted here",
        analysis: "This is an image document",
        detectedType: 'image'
    };
};

async function analyzeHandwrittenDocument(document) {
    return {
        content: "Handwritten content would be extracted here",
        analysis: "This is a handwritten document",
        detectedType: 'handwritten'
    };
};

async function analyzeUrlDocument(url) {
    return {
        content: `Content from URL: ${url} would be extracted here`,
        analysis: "This is a web document",
        detectedType: 'url'
    };
};

async function analyzePdfDocument(pdfUrl) {
    return {
        content: `Content from PDF would be extracted here`,
        analysis: "This is a PDF document",
        detectedType: 'pdf'
    };
};

module.exports = {
    generateEnhancedNotes,
    analyzeDocument,
    extractContent,
    enhanceKnowledge,
    structureNotes
};
