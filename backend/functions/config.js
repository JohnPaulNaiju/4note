const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const { getFirestore } = require('firebase-admin/firestore');

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const gemini = 'GEMINI_API_KEY';

module.exports = { auth, db, storage, gemini };