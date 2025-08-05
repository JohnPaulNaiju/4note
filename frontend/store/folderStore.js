import { create } from 'zustand';
import { auth, db, pushListeners } from '../utils';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, limit, onSnapshot, startAfter, where, orderBy, query } from 'firebase/firestore';

const Limit = 10;

export const useFolderStore = create(
    persist(
        (set, get) => ({ 

            folders: [], 
            lastVisible: null, 

            getFolders: () => {

                const Query = query(
                    collection(db, 'folders'), 
                    where('author', '==', auth.currentUser.uid), 
                    orderBy('timestamp', 'desc'), 
                    limit(Limit)
                );

                const listener = onSnapshot(Query, (snapshot) => {
                    set((state) => ({ 
                        lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length-1] : state.lastVisible, 
                        folders: snapshot.docs.map((snap) => {
                            const { viewers, ...rest } = snap.data();
                            return { id: snap.id, ...rest };
                        }), 
                    }));
                });

                pushListeners(listener);

            }, 

            getNextFolders: async() => { 

                const lastVisible = get((state) => state.lastVisible).lastVisible;
                const length = get((state) => state.folders).folders.length;

                if(length >= Limit){

                    if(!lastVisible) return;

                    const Query = query(
                        collection(db, 'folders'), 
                        where('author', '==', auth.currentUser.uid), 
                        orderBy('timestamp', 'desc'), 
                        startAfter(lastVisible), 
                        limit(Limit)
                    );

                    const snapshot = await getDocs(Query);

                    if(snapshot.empty) return;

                    set((state) => ({ 
                        lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length-1] : state.lastVisible, 
                        folders: [...state.folders, ...snapshot.docs.map((snap) => {
                            const { viewers, ...rest } = snap.data();
                            return { id: snap.id, ...rest };
                        })], 
                    }));

                }

            }, 

        }),
        {
            name: 'folder-storage', 
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ 
                folders: state.folders?.slice(0, 10), 
            }), 
        },
    )
);