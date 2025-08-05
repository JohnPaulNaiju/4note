import { storage } from '../utils';
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

export const uploadFile = async(path, uri, setProgress) => {

    const setPrg = (val) => {
        if(setProgress) setProgress(`Uploading: ${val}%`);
    };

    const storageRef = ref(storage, path);

    try{

        const response = await fetch(uri);
        const blob = await response.blob();

        const uploadTask = uploadBytesResumable(storageRef, blob);

        return await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', snap => {
                const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                setPrg(progress);
            }, (err) => {
                console.log(err);
                if(err.code === 'storage/unauthorized'){
                    //storage full
                }
                reject(false);
            }, async() => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
            });
        });

    }catch(e){
        console.log(e);
        return false;
    }

};