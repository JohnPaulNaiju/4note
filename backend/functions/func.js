const lda = require('lda');
const { db } = require('./config');
const { logger } = require('firebase-functions');
const { FieldValue } = require('firebase-admin/firestore');

const updateStatus = async(id, status) => {
    try{
        await db.collection('note_ai').doc(id).update({ status });
        return true;
    }catch{
        return false;
    }
};

const chunkTranscript = async(transcript, chunkSize = 10000) => {
    const chunks = [];
    return await new Promise((resolve, reject) => {
        for (let i = 0; i < transcript.length; i += chunkSize) {
            chunks.push(transcript.slice(i, i + chunkSize));
        }
        resolve(chunks);
    });
};

const extractTitle = (data) => {
    let name = '';
    const regex = /<title>(.*?)<\/title>/;
    const newData = data.replace(regex, (match, p1) => {
        name = p1;
        return '';
    });
    return { name: name, data: newData };
};

const genMetaHTML = (data) => {
    let match, HTML = '';
    const regex = /<[^>]+>.*?<\/[^>]+>/g;
    while ((match = regex.exec(data)) !== null) {
        HTML = HTML + match[0];
        if(HTML.length >= 200) break;
    }
    return HTML;
};

const preProcessString = (string, x = 2, y = 5) => {
    const newString = string.replace(/<[^>]+(>|$)/gi, '').replace(/&nbsp;/gi, '').replace(/\'s/gi, '');
    const matches = newString.match( /[^\.!\?]+[\.!\?]+/g );
    const result = lda(matches, x, y);
    return result.flatMap(obj => obj.map(word => word.term)).sort() || [];
};

const addToErrors = async(uid, ename, route, noteType, code, rest) => {

    /*
    ERROR CODES:
    0: error at genFromTranscript
    1: error at genFromPrompt
    2: error at genFromWeb
    */

    const data = { ename, route, noteType, code, timestamp: FieldValue.serverTimestamp(), ...rest };

    try{
        await db.collection('users').doc(uid).collection('errors').add(data);
        return true;
    }catch(e){
        logger.error(`Error in func.js at addToErrors: ${e}`);
        return false;
    }

};

module.exports = { 
    genMetaHTML, 
    addToErrors, 
    extractTitle, 
    updateStatus, 
    chunkTranscript, 
    preProcessString, 
};