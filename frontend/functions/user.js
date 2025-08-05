import { auth, db } from "../utils";
import { updateProfile } from 'firebase/auth';
import Toast from "react-native-toast-message";
import { doc, updateDoc } from "firebase/firestore";

export const avatars = [
    'https://doodleipsum.com/700x700/avatar-2?i=aea46cbcaac8b9152022a23280ef4f3e', 
    'https://doodleipsum.com/700x700/avatar-2?i=b403f32a10b2a7473c695c3cc705a8ea', 
    'https://doodleipsum.com/700x700/avatar-2?i=c0515d27f50e828469ba5468e4c8c739', 
    'https://doodleipsum.com/700x700/avatar-2?i=f7402920909e99b3850e78f13a950f42', 
    'https://doodleipsum.com/700x700/avatar-2?i=0d727c38e559de3d4c87406f5c5fd227', 
    'https://doodleipsum.com/700x700/avatar-2?i=6bff1692e77c36e5effde3d6f48fab6e', 
    'https://doodleipsum.com/700x700/avatar-2?i=bc931314c32811784f60b4911e26ea36', 
    'https://doodleipsum.com/700x700/avatar-2?i=938dbae0abaeea488182b8d2b937db89', 
];

export const updateUser = async (name, url) => {
    try{
        const data = {
            displayName: name, 
            photoURL: url, 
        };
        updateProfile(auth.currentUser, data);
        const docRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(docRef, data);
        Toast.show({ text1: "Your profile was updated" });
    }catch(e){
        console.log(e);
        Toast.show({ text1: "Couldn't update profile" });
        return false;
    }
};