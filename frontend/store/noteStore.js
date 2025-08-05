import { create } from 'zustand';
import { auth, db, pushListeners } from '../utils';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, limit, onSnapshot, startAfter, where, orderBy, query } from 'firebase/firestore';

const Limit = 20;

export const useNoteStore = create(
    persist(
        (set, get) => ({ 

            notes: [], 
            lastVisible: null, 

            getNotes: () => {

                const Query = query(
                    collection(db, 'notes'), 
                    where('author', '==', auth.currentUser.uid), 
                    orderBy('pinned', 'desc'), 
                    orderBy('timestamp', 'desc'), 
                    limit(Limit)
                );

                const listener = onSnapshot(Query, (snapshot) => {
                    set((state) => ({ 
                        lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length-1] : state.lastVisible, 
                        notes: snapshot.docs.map((snap) => {
                            const { viewers, ...rest } = snap.data();
                            return { id: snap.id, ...rest };
                        }), 
                    }));
                });

                pushListeners(listener);

            }, 

            getNextNotes: async() => {

                const lastVisible = get((state) => state.lastVisible).lastVisible;
                const length = get((state) => state.notes).notes.length;

                if(length >= Limit){

                    if (!lastVisible) return;

                    const Query = query(
                        collection(db, 'notes'), 
                        where('author', '==', auth.currentUser.uid), 
                        orderBy('pinned', 'desc'), 
                        orderBy('timestamp', 'desc'), 
                        startAfter(lastVisible), 
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

        }),
        {
            name: 'note-storage', 
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ 
                notes: state.notes?.slice(0, 20), 
            }), 
        },
    )
);