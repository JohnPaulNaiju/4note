const { db, storage } = require('./config');
const { logger } = require('firebase-functions');
const { FieldValue } = require('firebase-admin/firestore');

const updateUserStorage = async(userId, filePath, type, size, creation) => {
    try{

        let contentType;

        if(type.startsWith("image/")) contentType = 'image';
        else if(type.startsWith("video/")) contentType = 'video';
        else contentType = type;

        const Size = parseInt(size);

        db.collection('subscription').doc(userId).update({
            storage_used: FieldValue.increment(creation ? Size : -Size)
        });

        if(creation){

            const bucket = storage.bucket();
            const file = bucket.file(filePath);

            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: '03-01-2500',
            });

            const mediaData = {
                uri: url, 
                size: size/1048576, 
                type: contentType, 
                timestamp: FieldValue.serverTimestamp(), 
            };

            await db.collection('users').doc(userId).collection('media').add(mediaData);

        }

    }catch(e){
        logger.error(`Error in storage.js at updateUserStorage: ${e}`);
        throw new Error("Error updating user storage");
    }
};

module.exports = { updateUserStorage };