import { theme } from './theme';
import Constants from 'expo-constants';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { Platform, StatusBar } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { Colors, Typography } from 'react-native-ui-lib';
import { initializeApp, getApp, getApps } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';

let styles = {};

const updateMarkDownStyle = () => {
    styles = {
        body: {
            color: Colors.text1, 
        },
        heading1: {
            flexDirection: 'row', 
            fontSize: 32, 
            color: Colors.text1, 
        },
        heading2: {
            flexDirection: 'row',
            fontSize: 24,
            color: Colors.text1,
        },
        heading3: {
            flexDirection: 'row', 
            fontSize: 18, 
            color: Colors.text1, 
        },
        heading4: {
            flexDirection: 'row',
            fontSize: 16,
            color: Colors.text1, 
        },
        heading5: {
            flexDirection: 'row', 
            fontSize: 13, 
            color: Colors.text1, 
        },
        heading6: {
            flexDirection: 'row', 
            fontSize: 11, 
            color: Colors.text1, 
        },
        hr: {
            backgroundColor: Colors.line,
            height: 1,
        },
        strong: {
            fontWeight: 'bold',
        },
        em: {
            fontStyle: 'italic',
        },
        s: {
            textDecorationLine: 'line-through',
        },
        blockquote: {
            backgroundColor: Colors.bg3,
            borderColor: Colors.line,
            borderLeftWidth: 4,
            marginLeft: 5,
            paddingHorizontal: 5,
        },
        bullet_list: {},
        ordered_list: {},
        list_item: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
        },
        bullet_list_icon: {
            marginLeft: 10,
            marginRight: 10,
            color: Colors.blue,
        },
        bullet_list_content: {
            flex: 1,
        },
        ordered_list_icon: {
            marginLeft: 10,
            marginRight: 10,
            color: Colors.blue,
        },
        ordered_list_content: {
            flex: 1,
        },
        code_inline: {
            borderWidth: 1,
            borderColor: Colors.line,
            backgroundColor: Colors.bg3,
            padding: 10,
            borderRadius: 10,
            ...Platform.select({
                ['ios']: {
                    fontFamily: 'Courier',
                },
                ['android']: {
                    fontFamily: 'monospace',
                },
            }),
        },
        code_block: {
            borderWidth: 1,
            borderColor: Colors.line,
            backgroundColor: Colors.bg3,
            padding: 10,
            borderRadius: 10,
            ...Platform.select({
                ['ios']: {
                    fontFamily: 'Courier',
                },
                ['android']: {
                    fontFamily: 'monospace',
                },
            }),
        },
        fence: {
            borderWidth: 1,
            borderColor: Colors.line,
            backgroundColor: Colors.bg3,
            padding: 10,
            borderRadius: 10,
            ...Platform.select({
                ['ios']: {
                    fontFamily: 'Courier',
                },
                ['android']: {
                    fontFamily: 'monospace',
                },
            }),
        },
        table: {
            borderWidth: 1,
            borderColor: Colors.line,
            borderRadius: 10,
        },
        thead: {
            backgroundColor: Colors.bg3, 
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
        },
        tbody: {
            backgroundColor: Colors.bg1, 
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
        },
        th: {
            flex: 1,
            padding: 5,
        },
        tr: {
            borderBottomWidth: 1,
            borderColor: Colors.line,
            flexDirection: 'row',
        },
        td: {
            flex: 1,
            padding: 5,
        },
        link: {
            textDecorationLine: 'underline',
            color: Colors.blue, 
        },
        blocklink: {
            flex: 1,
            borderColor: Colors.line,
            borderBottomWidth: 1,
        },
        image: {
            flex: 1,
        },
        text: {},
        textgroup: {},
        paragraph: {
            marginTop: 10,
            marginBottom: 10,
            flexWrap: 'wrap',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            width: '100%',
        },
        hardbreak: {
            width: '100%',
            height: 1,
        },
        softbreak: {},
        pre: {},
        inline: {},
        span: {},
    };
};

const loadTheme = async() => {

    let scheme = await AsyncStorage.getItem('theme');

    if(scheme === null || scheme === 'default') scheme = 'light';

    Colors.setScheme(scheme);
    Colors.supportDarkMode();
    StatusBar.setBarStyle(scheme === 'dark' ? 'light-content' : 'dark-content');

    if(Platform.OS === 'android'){
        StatusBar.setBackgroundColor(scheme === 'dark' ? theme.dark.bg2 : theme.light.bg2);
        NavigationBar.setBackgroundColorAsync(scheme === 'dark' ? theme.dark.bg2 : theme.light.bg2);
        NavigationBar.setBorderColorAsync("#00000000");
        NavigationBar.setButtonStyleAsync(scheme);
    }

    Colors.loadSchemes(theme);

    setTimeout(() => {
        updateMarkDownStyle();
    }, 100);

};

const loadFonts = () => {
    Typography.loadTypographies({
        'gb': { fontFamily: 'Gilroy-Bold' }, 
        'gr': { fontFamily: 'Gilroy-Regular' }, 
        'gs': { fontFamily: 'Gilroy-SemiBold' }, 
    });
};

loadTheme();
loadFonts();

const FIREBASE_API_KEY = Constants?.expoConfig?.extra?.FIREBASE_API_KEY;
const AUTH_DOMAIN = Constants?.expoConfig?.extra?.AUTH_DOMAIN;
const PROJECT_ID = Constants?.expoConfig?.extra?.PROJECT_ID;
const STORAGE_BUCKET = Constants?.expoConfig?.extra?.STORAGE_BUCKET;
const MESSAGING_SENDER_ID = Constants?.expoConfig?.extra?.MESSAGING_SENDER_ID;
const APP_ID = Constants?.expoConfig?.extra?.APP_ID;
const MEASUREMENT_ID = Constants?.expoConfig?.extra?.MEASUREMENT_ID;

const firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: AUTH_DOMAIN,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    messagingSenderId: MESSAGING_SENDER_ID,
    appId: APP_ID,
    measurementId: MEASUREMENT_ID,
};

const app = getApps().length===0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const getMarkDownStyle = () => {
    return styles;
};

export const GEMINI_API_KEY = Constants?.expoConfig?.extra?.GEMINI_API_KEY;