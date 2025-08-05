import { create } from 'zustand';
import Constants from 'expo-constants';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useEmojiStore = create(
    persist(
        (set, get) => ({ 

            emojis: [], 

            getEmojis: async() => {

                const len = get((state) => state.emojis).emojis.length;

                if(len === 0){

                    const EMOJI_API_KEY = Constants?.expoConfig?.extra?.EMOJI_API_KEY;
                    const endPoint = `https://emoji-api.com/emojis?access_key=${EMOJI_API_KEY}`;

                    const response = await fetch(endPoint);
                    const result = await response.json();
                    const emojis = result?.map(item => ({
                        emoji: item.character, 
                        name: item.unicodeName, 
                    })) || [];
                    set(() => ({ emojis: emojis }));
                }

            }, 

        }),
        {
            name: 'emoji-storage', 
            storage: createJSONStorage(() => AsyncStorage),
        },
    )
);