const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const { createWorker } = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { gemini } = require('./config');
const fetch = require('node-fetch');
const path = require('path');
const os = require('os');
const fs = require('fs');

const genAI = new GoogleGenerativeAI(gemini);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

async function processDocument(url, options = {}) {

    try{

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to download document: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileExtension = path.extname(url).toLowerCase();
        const documentType = determineDocumentType(fileExtension, buffer);
    
        console.log(`Processing document of type: ${documentType}`);

        let extractedContent = '';

        let metadata = {
            documentType,
            originalUrl: url,
            processingTime: new Date().toISOString()
        };
    
        switch(documentType){
            case 'pdf':
                const pdfResult = await processPdf(buffer);
                extractedContent = pdfResult.text;
                metadata = { ...metadata, ...pdfResult.metadata };
                break;
        
            case 'docx':
            case 'doc':
                const wordResult = await processWordDocument(buffer);
                extractedContent = wordResult.text;
                metadata = { ...metadata, ...wordResult.metadata };
                break;
        
            case 'xlsx':
            case 'xls':
                const excelResult = await processExcelDocument(buffer);
                extractedContent = excelResult.text;
                metadata = { ...metadata, ...excelResult.metadata };
                break;
        
            case 'pptx':
            case 'ppt':
                const pptResult = await processPowerPointDocument(buffer);
                extractedContent = pptResult.text;
                metadata = { ...metadata, ...pptResult.metadata };
                break;
        
            case 'image':
                const imageResult = await processImageDocument(buffer, options);
                extractedContent = imageResult.text;
                metadata = { ...metadata, ...imageResult.metadata };
                break;
        
            case 'txt':
            case 'csv':
            case 'json':
            case 'md':
                extractedContent = buffer.toString('utf-8');
                metadata.size = buffer.length;
                break;
        
            default:
                try{
                    extractedContent = buffer.toString('utf-8');
                    metadata.size = buffer.length;
                }catch(e){
                    throw new Error(`Unsupported document type: ${documentType}`);
                }
        }

        if (options.enhance && extractedContent) {
            const enhancedContent = await enhanceDocumentContent(extractedContent, documentType, options);
            return {
                success: true,
                text: enhancedContent,
                metadata,
                originalText: extractedContent
            };
        }
    
        return {
            success: true,
            text: extractedContent,
            metadata
        };

    }catch(error){
        console.error('Error processing document:', error);
        return {
            success: false,
            error: error.message || 'Unknown error processing document'
        };
    }
};

function determineDocumentType(fileExtension, buffer) {
    switch (fileExtension) {
        case '.pdf':
            return 'pdf';
        case '.docx':
        case '.doc':
            return 'docx';
        case '.xlsx':
        case '.xls':
            return 'xlsx';
        case '.pptx':
        case '.ppt':
            return 'pptx';
        case '.txt':
            return 'txt';
        case '.csv':
            return 'csv';
        case '.json':
            return 'json';
        case '.md':
            return 'md';
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
        case '.webp':
            return 'image';
    }
    if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
        return 'pdf';
    }
    if (buffer.length > 4 && buffer.toString('ascii', 0, 2) === 'PK') {
        return 'docx';
    }
    return 'txt';
};

async function processPdf(buffer) {
    try{
        const pdfData = await pdf(buffer);
        return {
            text: pdfData.text,
            metadata: {
                pageCount: pdfData.numpages || 0,
                info: pdfData.info || {},
                version: pdfData.version || ''
            }
        };
    }catch(error){
        console.error('Error processing PDF:', error);
        throw new Error('Failed to process PDF document: ' + error.message);
    }
};

async function processWordDocument(buffer){
    try{
        const result = await mammoth.extractRawText({ buffer });
        return {
            text: result.value,
            metadata: {
                messages: result.messages
            }
        };
    }catch(error){
        console.error('Error processing Word document:', error);
        throw new Error('Failed to process Word document: ' + error.message);
    }
};

async function processExcelDocument(buffer){
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        let text = '';
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            text += `\n\n--- Sheet: ${sheetName} ---\n\n`;
            text += xlsx.utils.sheet_to_csv(sheet);
        });
        return {
            text,
            metadata: {
                sheetCount: workbook.SheetNames.length,
                sheetNames: workbook.SheetNames
            }
        };
    }catch(error){
        console.error('Error processing Excel document:', error);
        throw new Error('Failed to process Excel document: ' + error.message);
    }
};

async function processPowerPointDocument(buffer) {
    try {

        let text = '';

        const bufferString = buffer.toString('utf-8');

        const matches = bufferString.match(/<a:t>[^<]*<\/a:t>/g) || [];
        text = matches.map(match => match.replace(/<a:t>|<\/a:t>/g, '')).join('\n');
    
        if (!text) {
            text = "PowerPoint content extraction requires specialized processing. Please use the AI to analyze the content.";
        }

        return {
            text,
            metadata: {
                format: 'pptx',
                extractionMethod: 'simplified'
            }
        };
    }catch(error){
        console.error('Error processing PowerPoint document:', error);
        throw new Error('Failed to process PowerPoint document: ' + error.message);
    }
};

async function processImageDocument(buffer, options = {}) {
    try {

        const tempFilePath = path.join(os.tmpdir(), `image-${Date.now()}.png`);
        fs.writeFileSync(tempFilePath, buffer);

        const isHandwritten = options.inputType === 'handwritten';

        const worker = await createWorker();

        await worker.loadLanguage('eng');
        await worker.initialize('eng');

        if(isHandwritten){
            const handwrittenParams = {
                tessedit_ocr_engine_mode: '2', 
                tessedit_pageseg_mode: '6', 
                preserve_interword_spaces: '1', 
                textord_heavy_nr: '1', 
                textord_min_linesize: '2.5', 
                ...options.ocrParams 
            };
            await worker.setParameters(handwrittenParams);
            console.log('Using handwritten-optimized OCR parameters');
        }else if(options.ocrParams){
            await worker.setParameters(options.ocrParams);
            console.log('Using custom OCR parameters');
        }else{
            await worker.setParameters({
                tessedit_ocr_engine_mode: '3', 
                tessedit_pageseg_mode: '1', 
                preserve_interword_spaces: '1' 
            });
            console.log('Using default OCR parameters for printed text');
        }

        console.log(`Starting OCR processing on image...`);
        let data;
        try{
            const result = await worker.recognize(tempFilePath);
            data = result.data;
            console.log(`OCR completed with confidence: ${data.confidence}`);
        }catch(ocrError){
            console.error('OCR processing failed:', ocrError);
            if (isHandwritten) {
                console.log('Attempting alternative processing for handwritten content...');
            }
            data = { text: '', confidence: 0, words: [] };
        }finally{
            await worker.terminate();
        }

        fs.unlinkSync(tempFilePath);

        let enhancedText = data.text;
        let enhancementMethod = 'standard';

        if (data.confidence < 65 || enhancedText.length < 100) {
            console.log(`Low OCR confidence (${data.confidence}), applying AI enhancement`);
            const enhancementPrompt = `
                I have extracted the following text from ${isHandwritten ? 'a handwritten document' : 'a document'} using OCR.
                The OCR confidence is low (${data.confidence}%), so there may be errors or missing content.
                
                Please correct any obvious errors, fix formatting issues, and make this text more readable.
                DO NOT add any new information that isn't implied by the text.
                
                OCR extracted content:
                ${enhancedText}
            `;
            try{
                const enhancementResult = await model.generateContent(enhancementPrompt);
                enhancedText = enhancementResult.response.text();
                enhancementMethod = 'ocr-plus-ai';
                console.log('Applied AI enhancement to OCR results');
            }catch (aiError){
                console.error('Error applying AI enhancement to OCR results:', aiError);
            }
        }
    
        return {
        text: enhancedText,
            metadata: {
                confidence: data.confidence,
                words: data.words?.length || 0,
                isHandwritten: isHandwritten,
                enhancementMethod: enhancementMethod
            }
        };
    }catch(error){
        console.error('Error processing image with OCR:', error);
        throw new Error('Failed to process image document: ' + error.message);
    }
};

async function enhanceDocumentContent(text, documentType, options = {}) {
    try {

        const subject = options.subject || 'general';
        const detail = options.detail || 'high';
        const outputFormat = options.outputFormat || 'comprehensive';
        const isHandwritten = options.inputType === 'handwritten';

        if (!text || text.trim().length < 50) {
            console.warn('Document text is too short or empty, cannot enhance');
            return text || 'No content could be extracted from the document.';
        }

        let processedText = text;
        if (text.length > 30000) {
            console.log(`Document is very large (${text.length} chars), processing in chunks`);
            processedText = await processLargeDocument(text, documentType, subject);
        }

        let prompt = '';
        const detailLevel = detail === 'high' ? 'comprehensive and detailed' : 'concise but thorough';

        const commonInstructions = `
            Create ${detailLevel} study notes that would be useful for exam preparation.
            Use markdown formatting with proper headings, lists, and emphasis where appropriate.
            Include a title at the beginning using the format: <title>Title Here</title>
            
            The notes should include:
            - Clear organization with headings and subheadings
            - Key concepts and definitions
            - Important relationships between concepts
            ${detail === 'high' ? '- Examples or applications where relevant' : ''}
            ${outputFormat === 'comprehensive' ? '- A brief summary at the end' : ''}
        `;
    
        switch (documentType) {
            case 'pdf':
                prompt = `
                    I have extracted text from a PDF document about ${subject}.
                    ${commonInstructions}
                    
                    The extracted text may have formatting issues, missing context, or unclear sections.
                    Please fix these issues and create clear, organized notes.
                    
                    Document content:\n${processedText}
                `;
                break;

            case 'docx':
            case 'doc':
                prompt = `
                    I have extracted text from a Word document about ${subject}.
                    ${commonInstructions}
                    
                    The extracted text may have formatting issues or unclear sections.
                    Please fix these issues and create clear, organized notes.
                    
                    Document content:\n${processedText}
                `;
                break;

            case 'xlsx':
            case 'xls':
                prompt = `
                    I have extracted data from an Excel spreadsheet about ${subject}.
                    ${commonInstructions}
                    
                    For this spreadsheet data:
                    - Explain any patterns, relationships, or key insights from the data
                    - Convert tabular information into well-structured explanatory text
                    - Include any important calculations or formulas that were present
                    
                    Spreadsheet content:\n${processedText}
                `;
                break;

            case 'pptx':
            case 'ppt':
                prompt = `
                    I have extracted text from a PowerPoint presentation about ${subject}.
                    ${commonInstructions}
                    
                    For this presentation content:
                    - Preserve the logical flow and structure of the presentation
                    - Expand on bullet points to provide more complete explanations
                    - Note where visual elements (charts, diagrams) were likely present
                    
                    Presentation content:\n${processedText}
                `;
                break;

            case 'image':
                if(isHandwritten){
                    prompt = `
                        I have extracted text from handwritten notes about ${subject} using OCR.
                        ${commonInstructions}
                        The OCR process may have introduced errors or missed some text.
                        Please:
                        - Correct any obvious errors from the OCR process
                        - Fill in logical gaps that seem to be missing due to OCR limitations
                        - Organize the content into a coherent structure
                        - Expand abbreviated or shorthand notations into complete concepts
                        
                        Handwritten content extracted by OCR:\n${processedText}
                    `;
                }else{
                    prompt = `
                        I have extracted text from an image (likely printed or typed) about ${subject} using OCR.
                        ${commonInstructions}
                        
                        The OCR process may have introduced errors or missed some text.
                        Please correct any obvious errors and organize this content into well-structured study notes.
                        
                        OCR extracted content:\n${processedText}
                    `;
                }
                break;

            case 'txt':
            case 'md':
                prompt = `
                    I have extracted text from a plain text document about ${subject}.
                    ${commonInstructions}
                    
                    Please organize this content into well-structured study notes while preserving the original information.
                    
                    Document content:\n${processedText}
                `;
                break;

            default:
                prompt = `
                    I have extracted text from a document about ${subject}.
                    ${commonInstructions}
                    
                    Please organize this content into well-structured study notes.
                    
                    Document content:\n${processedText}
                `;
                break;
        }

        console.log(`Generating enhanced content for ${documentType} document about ${subject}`);

        const result = await model.generateContent(prompt);
        const enhancedText = result.response.text();

        const finalText = postProcessEnhancedText(enhancedText, documentType);

        return finalText;
    }catch(error){
        console.error('Error enhancing document content:', error);
        return text + '\n\n*Note: Automatic enhancement failed. This is the original extracted content.*';
    }
};

async function processLargeDocument(text, documentType, subject) {
    try {
        console.log('Processing large document in chunks...');

        const chunks = [];
        let startIndex = 0;

        while (startIndex < text.length) {
            let endIndex = startIndex + 10000;

            if (endIndex < text.length) {
                const paragraphBreak = text.indexOf('\n\n', endIndex - 500);
                if (paragraphBreak !== -1 && paragraphBreak < endIndex + 500) {
                    endIndex = paragraphBreak;
                }else{
                    const lineBreak = text.indexOf('\n', endIndex - 300);
                    if(lineBreak !== -1 && lineBreak < endIndex + 300){
                        endIndex = lineBreak;
                    }else{
                        const sentenceEnd = text.indexOf('. ', endIndex - 200);
                        if (sentenceEnd !== -1 && sentenceEnd < endIndex + 200) {
                        endIndex = sentenceEnd + 1;
                        }
                    }
                }
            } else {
                endIndex = text.length;
            }

            chunks.push(text.substring(startIndex, endIndex));
            startIndex = endIndex;
        }

        console.log(`Split document into ${chunks.length} chunks`);

        const processedChunks = [];
    
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Processing chunk ${i+1} of ${chunks.length} (${chunk.length} chars)`);

            const chunkPrompt = `
                I have a large document about ${subject} that I've split into parts.
                This is part ${i+1} of ${chunks.length}.
                
                Please extract the most important information from this part, including:
                - Key concepts, definitions, and facts
                - Important relationships or processes
                - Any critical data points or examples
                - Preserve any headings, section titles, or structural elements
                
                Provide this as a well-structured summary (300-500 words) that preserves both the essential information and document structure.
                Use markdown formatting to maintain headings and lists.
                
                Text from part ${i+1}:\n${chunk}
            `;

            try{
                const result = await model.generateContent(chunkPrompt);
                const chunkSummary = result.response.text();
                processedChunks.push(chunkSummary);
                console.log(`Successfully processed chunk ${i+1}`);
            }catch (error){
                console.error(`Error processing chunk ${i+1}:`, error);
                processedChunks.push(`[Chunk ${i+1} summary] ${chunk.substring(0, 1000)}...`);
            }
        }

        const combinedText = processedChunks.join('\n\n--- Next Section ---\n\n');
        return combinedText;
    }catch (error){
        console.error('Error processing large document:', error);
        return text.substring(0, 25000) + '\n\n[Document truncated due to size]';
    }
};

function postProcessEnhancedText(text, documentType) {

    let processedText = text;

    if (!processedText.includes('<title>')) {
        const titleMatch = processedText.match(/^#\s+(.+)$/m);
        if(titleMatch && titleMatch[1]){
            const extractedTitle = titleMatch[1].trim();
            processedText = `<title>${extractedTitle}</title>\n\n${processedText}`;
        }else{
            let defaultTitle = 'Study Notes';
            switch (documentType) {
                case 'pdf':
                defaultTitle = 'PDF Study Notes';
                break;
                case 'docx':
                case 'doc':
                defaultTitle = 'Document Study Notes';
                break;
                case 'xlsx':
                case 'xls':
                defaultTitle = 'Spreadsheet Data Analysis';
                break;
                case 'pptx':
                case 'ppt':
                defaultTitle = 'Presentation Notes';
                break;
                case 'image':
                defaultTitle = 'Image Content Notes';
                break;
            }
            processedText = `<title>${defaultTitle}</title>\n\n${processedText}`;
        }
    }

    processedText = processedText
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1')
        .replace(/<h4>(.*?)<\/h4>/gi, '#### $1')
        .replace(/<h5>(.*?)<\/h5>/gi, '##### $1')
        .replace(/<h6>(.*?)<\/h6>/gi, '###### $1')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<u>(.*?)<\/u>/gi, '_$1_')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>\s*<p>/gi, '\n\n');

    processedText = processedText.replace(/\n{3,}/g, '\n\n');

    return processedText;

};

module.exports = {
    processDocument,
    processPdf,
    processWordDocument,
    processExcelDocument,
    processPowerPointDocument,
    processImageDocument,
    enhanceDocumentContent
};