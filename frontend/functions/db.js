import { auth, db } from '../utils';
import Toast from 'react-native-toast-message';
import { addDoc, collection, serverTimestamp, doc, deleteDoc, setDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';

export const createFolder = async(name, color) => {
    try{

        const data = {
            name: name, 
            color: color, 
            timestamp: serverTimestamp(), 
            createdAt: serverTimestamp(), 
            author: auth.currentUser.uid, 
            notes: 0, 
        };

        const docRef = collection(db, 'folders');
        await addDoc(docRef, data);

        return true;

    }catch(e){
        console.log(e);
        Toast.show({ text1: "Couldn't create folder" });
        return false;
    }
};

export const deleteFolder = async(folderId) => {
    try{

        const docRef = doc(db, 'folders', folderId);
        await deleteDoc(docRef);

        return true;

    }catch(e){
        console.log(e);
        Toast.show({ text1: "Couldn't delete folder" });
        return false;
    }
};

export const incFolder = (id, prevFolderId) => {
    try{

        if(id){
            const docRef = doc(db, 'folders', id);
            updateDoc(docRef, { notes: increment(1), timestamp: serverTimestamp() });
        }

        if(prevFolderId){
            const docRef = doc(db, 'folders', prevFolderId);
            updateDoc(docRef, { notes: increment(-1), timestamp: serverTimestamp() });
        }

    }catch(e){
        console.log(e);
        return false;
    }
};

export const saveNoteMetaData = async(id, isNew, data, prevFolderId) => {
    try{

        const docRef = doc(db, 'notes', id);

        const metaData = {
            ...data, 
            timestamp: serverTimestamp(), 
            ...isNew && {
                pinned: false, 
                sharing: false, 
                author: auth.currentUser.uid, 
                createdAt: serverTimestamp(), 
            }, 
        };

        if(data?.folder?.id || prevFolderId) incFolder(data?.folder?.id, prevFolderId);

        if(isNew) await setDoc(docRef, metaData);
        else await updateDoc(docRef, metaData);

    }catch(e){
        console.log(e);
        Toast.show({ text1: "Couldn't save note" });
        return false;
    }
};

export const pinNote = (id, pinned) => {
    try{

        const docRef = doc(db, 'notes', id);

        const data = {
            pinned: !pinned, 
        };

        updateDoc(docRef, data);

        return true;

    }catch(e){
        console.log(e);
        return false;
    }
};

export const delNote = async(id) => {
    try{
        const docRef = doc(db, 'notes', id);
        await deleteDoc(docRef);
        //delete note content
    }catch(e){
        console.log(e);
        return false;
    }
};

export const addViewers = async(id, emails) => {
    try{
        const docRef = doc(db, 'notes', id);
        const data = {
            viewers: arrayUnion(...emails), 
        };
        await updateDoc(docRef, data);
    }catch(e){
        console.log(e);
        return false;
    }
};

export const clearViewers = async(id) => {
    try{
        const docRef = doc(db, 'notes', id);
        const data = {
            viewers: [], 
        };
        await updateDoc(docRef, data);
    }catch(e){
        console.log(e);
        return false;
    }
};

export const deleteViewer = async(id, email) => {
    try{
        const docRef = doc(db, 'notes', id);
        const data = {
            viewers: arrayRemove(email), 
        };
        await updateDoc(docRef, data);
    }catch(e){
        console.log(e);
        return false;
    }
};

export const toggleNoteSharing = async(id, bool) => {
    try{
        const docRef = doc(db, 'notes', id);
        const data = {
            sharing: !bool, 
        };
        await updateDoc(docRef, data);
    }catch(e){
        console.log(e);
        return false;
    }
};