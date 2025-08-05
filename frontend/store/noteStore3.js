import { db } from '../utils';
import { create } from 'zustand';
import Toast from 'react-native-toast-message';
import { getDoc, doc } from 'firebase/firestore';
import { addViewers, clearViewers, deleteViewer, toggleNoteSharing } from '../functions';

export const useNoteStore3 = create((set, get) => ({ 

    viewers: [], 
    loading: true, 
    metaData: {}, 
    prevId: null, 

    getMetaData: async(id) => {

        const prevId = get((state) => state.prevId).prevId;

        if(prevId === id) return;

        set(() => ({
            viewers: [], 
            loading: true, 
            metaData: {}, 
            prevId: id, 
        }));

        const docRef = doc(db, 'notes', id);
        const Doc = await getDoc(docRef);
        const { viewers, ...rest } = Doc.data();

        set(() => ({
            viewers: viewers || [], 
            loading: false, 
            metaData: rest, 
        }));

    }, 

    addViewers: (id, emails) => {

        const viewers = get((state) => state.viewers).viewers;

        const length1 = viewers.length;
        const length2 = emails.length;

        const length = length1 + length2;

        if(length > 100){
            Toast.show({ text1: "Invitee length exceeded" });
            const viewersArr = [...emails, ...viewers];
            const newArr = viewersArr.slice(0, 100);
            set(() => ({
                viewers: newArr, 
            }));
            addViewers(id, newArr);
        }else{
            set((state) => ({
                viewers: [...emails, ...state.viewers, ], 
            }));
            addViewers(id, emails);
        }
    }, 

    clearAll: (id) => {

        set(() => ({
            viewers: [], 
        }));

        clearViewers(id);

    }, 

    deleteViewer: (id, email) => {

        set((state) => ({
            viewers: state.viewers.filter(item => item !== email), 
        }));

        deleteViewer(id, email);

    },

    toggleSharing: (id) => {

        set((state) => {
            const sharing = state.metaData.sharing;
            toggleNoteSharing(id, sharing);
            return { metaData: { ...state.metaData, sharing: !sharing } }
        });

    }, 

}));