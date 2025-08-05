import { create } from 'zustand';
import { auth, db } from '../utils';
import { useNoteStore } from './noteStore';
import { collection, getDocs, limit, startAfter, where, orderBy, query, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';

const Limit = 10;

export const useNoteStore2 = create((set, get) => ({ 

    notes: [], 
    loading: true, 
    lastVisible: null, 
    prevFolderId: null, 

    getNotes: async(folderId) => {

        const prevFolderId = get((state) => state.prevFolderId).prevFolderId;
        if(prevFolderId === folderId) return;

        set(() => ({ 
            notes: [], 
            loading: true, 
            prevFolderId: folderId, 
        }));

        const filteredNotes = useNoteStore.getState().notes?.filter((note) => note?.folder?.id === folderId);

        if(filteredNotes.length === 0){

            const Query = query(
                collection(db, 'notes'), 
                where('folder.id', '==', folderId), 
                where('author', '==', auth.currentUser.uid), 
                orderBy('pinned', 'desc'), 
                orderBy('timestamp', 'desc'), 
                limit(Limit)
            );

            const snapshot = await getDocs(Query).catch(console.log);

            if(snapshot.empty){
                set(() => ({ loading: false }));
                return;
            }

            set((state) => ({ 
                loading: false, 
                lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length-1] : state.lastVisible, 
                notes: [...state.notes, ...snapshot.docs.map((snap) => {
                    const { viewers, ...rest } = snap.data();
                    return { id: snap.id, ...rest };
                })], 
            }));

        }else{

            const lastVisibleId = filteredNotes[filteredNotes.length - 1]?.id;

            const docRef = doc(db, 'notes', lastVisibleId);

            const lastVisible = await getDocFromCache(docRef).catch(async() => {
               return await getDocFromServer(docRef);
            });

            set(() => ({ 
                loading: false, 
                lastVisible: lastVisible, 
                notes: [...filteredNotes], 
            }));

            if(filteredNotes.length < Limit){

                const newLimit = Limit - filteredNotes.length;

                const Query = query(
                    collection(db, 'notes'), 
                    where('folder.id', '==', folderId), 
                    where('author', '==', auth.currentUser.uid), 
                    orderBy('pinned', 'desc'), 
                    orderBy('timestamp', 'desc'), 
                    startAfter(lastVisible), 
                    limit(newLimit)
                );

                const snapshot = await getDocs(Query);

                if(snapshot.empty){
                    set(() => ({ loading: false }));
                    return;
                }

                set((state) => ({ 
                    loading: false, 
                    lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length-1] : state.lastVisible, 
                    notes: [...state.notes, ...snapshot.docs.map((snap) => {
                        const { viewers, ...rest } = snap.data();
                        return { id: snap.id, ...rest };
                    })], 
                }));

            }

        }
    }, 

    getNextNotes: async(folderId) => { 

        const lastVisible = get((state) => state.lastVisible).lastVisible;
        const length = get((state) => state.notes).notes.length;

        if(length >= Limit){

            if (!lastVisible) return;

            const Query = query(
                collection(db, 'notes'), 
                where('folder.id', '==', folderId), 
                where('author', '==', auth.currentUser.uid), 
                orderBy('pinned', 'desc'), 
                orderBy('timestamp', 'desc'), 
                limit(Limit)
            );

            const snapshot = await getDocs(Query);

            if(snapshot.empty) return;

            set((state) => ({ 
                lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length-1] : state.lastVisible, 
                notes: [...state.notes, ...snapshot.docs.map((snap) => {
                    const { viewers, ...rest } = snap.data();
                    return { id: snap.id, ...rest };
                })], 
            }));

        }

    }, 

    updateNote: (folderId, value) => {
        set((state) => {
            const notes = state.notes;
            const index = notes.findIndex(item => item.id === folderId);
            if (index !== -1){
                const updatedNote = { ...notes[index], ...value };
                const updatedNotes = [...notes];
                updatedNotes.splice(index, 1);
                return { notes: [updatedNote, ...updatedNotes] };
            }
            return { notes };
        });
    },

    deleteNote: (folderId) => {
        set((state) => {
            const notes = state.notes;
            const index = notes.findIndex(item => item.id === folderId);
            if (index !== -1){
                const updatedNotes = [...notes];
                updatedNotes.splice(index, 1);
                return { notes: updatedNotes };
            }
            return { notes };
        });
    }, 

}));