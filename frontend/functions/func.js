import Constants from 'expo-constants';
import Toast from "react-native-toast-message";
import { getLinkPreview } from "link-preview-js";
import * as MediaLibrary from 'expo-media-library';

const PEXEL_API_KEY = Constants?.expoConfig?.extra?.PEXEL_API_KEY;

export const regex = {
    email: /^[^\s@]+@[^\s@]+\.([^\s@]{2,})+$/, 
    phNo: /^[+]{1}(?:[0-9\-\\(\\)\\/.]\s?){6,15}[0-9]{1}$/, 
};

export const LinkPreview = async(link) => {
    try{
        let title, image, uri, desc;
        await getLinkPreview(link).then((data) => {
            title = data.title || '';
            image = data.images[0] || 'https://tool.jobassam.in/img/preview.png';
            desc = data.description || '';
            uri = data.url || '';
            const youTube = uri.includes('youtube') || uri.includes('youtu.be');
            if(youTube){
                const arr = uri.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
                const videoId = arr[1];
                image = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` || 'https://tool.jobassam.in/img/preview.png';
            }
        });
        return { title, image, uri, desc };
    }catch{
        return {
            title: 'No preview available', 
            image: 'https://tool.jobassam.in/img/preview.png', 
            uri: link, 
            desc: "This link doesn't contain any meta content"
        };
    }
};

export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
};

const getPermission = async() => {
    try{
        const { granted } = await MediaLibrary.requestPermissionsAsync();
        return granted;
    }catch(e){
        console.log(e);
        return false;
    }
};

export const getAlbums = async(setAlbums) => {
    try{
        const hasPermission = await getPermission();
        if(!hasPermission) return;
        const arr = [];
        const albums = await MediaLibrary.getAlbumsAsync({
            includeSmartAlbums: true,
        });
        arr.push({
            id: null,
            label: 'All',
        });
        for(let i = 0; i < albums.length; i++){
            arr.push({
                id: albums[i].id,
                label: albums[i].title,
            });
        }
        setAlbums(arr);
    }catch(e){
        console.log(e);
        Toast.show({ text1: "Couldn't process your request" });
    }
};

export const getAssets = async(albumId, type, setAssets, setLastVisible) => {
    try{
        const hasPermission = await getPermission();
        if(!hasPermission) return;
        const assets = await MediaLibrary.getAssetsAsync({
            ...albumId&&{ album: albumId },
            mediaType: MediaLibrary.MediaType?.[`${type}`],
        });
        setLastVisible(assets.endCursor);
        setAssets(await Promise.all(assets.assets.map(async(obj) => {
            const asset = await MediaLibrary.getAssetInfoAsync(obj.id);
            const uri = asset.localUri || asset.uri;
            return { id: obj.id, uri: uri };
        })));
    }catch(e){
        console.log(e);
        Toast.show({ text1: "Couldn't process your request" });
    }
};

export const getNextAssets = async(albumId, type, setAssets, after, setLastVisible) => {
    try{
        const assets = await MediaLibrary.getAssetsAsync({
            ...albumId&&{ album: albumId },
            ...after&&{ after: after },
            mediaType: MediaLibrary.MediaType?.[`${type}`],
        });
        setLastVisible(assets.endCursor);
        const newData = await Promise.all(assets.assets.map(async(obj) => {
            const asset = await MediaLibrary.getAssetInfoAsync(obj.id);
            const uri = asset.localUri || asset.uri;
            return { id: obj.id, uri: uri };
        }));
        setAssets(old => [...old, ...newData]);
    }catch(e){
        console.log(e);
        Toast.show({ text1: "Couldn't process your request" });
    }
};

export const getPexels = async(query, index, num) => {
    try{
        const url = `https://api.pexels.com/v1/search?query=${query||"illustration"}&page=${index}&per_page=${num?num:21}`;
        const response = await fetch(url, {
            headers: { Authorization: PEXEL_API_KEY }
        });
        const json = await response.json();
        const result = json?.photos?.map(item => ({
            photographer: item.photographer, 
            photographer_url: item.photographer_url, 
            landscape: item.src.landscape, 
            portrait: item.src.portrait, 
        }));
        return result || [];
    }catch{}
};

function getDayOfWeek(date) {
    return date.toLocaleString('en-US', { weekday: 'short' }).toLowerCase();
};

function getMonthName(date) {
    return date.toLocaleString('en-US', { month: 'short' }).toLowerCase();
};

function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th';
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const remainder = day % 10;
    return suffixes[remainder] || 'th';
};

function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr}${ampm}`;
};

export const getDate = (date) => {
    if(date){
        const firebaseTimestamp = date?.toDate ? date?.toDate() : new Date();
        const dayOfWeek = getDayOfWeek(firebaseTimestamp);
        const day = firebaseTimestamp.getDate();
        const month = getMonthName(firebaseTimestamp);
        const year = firebaseTimestamp.getFullYear();
        const ordinalSuffix = getOrdinalSuffix(day);
        const time = formatTime(firebaseTimestamp);
        return `${dayOfWeek} ${day}${ordinalSuffix} ${month} ${year} at ${time}`;
    }else return 'Date unavailable';
};

export const timeAgo = (firebaseTimestamp) => {
    if (!firebaseTimestamp || typeof firebaseTimestamp?.toDate !== 'function') return "";
    const now = new Date();
    const time = firebaseTimestamp?.toDate();
    const secondsAgo = Math.floor((now - time) / 1000);
    let interval = Math.floor(secondsAgo / 31536000);
    if (interval >= 1) return interval === 1 ? `${interval}yr` : `${interval}yrs`;
    interval = Math.floor(secondsAgo / 2592000);
    if (interval >= 1) return interval === 1 ? `${interval}mon` : `${interval}mons`;
    interval = Math.floor(secondsAgo / 86400);
    if (interval >= 1) return `${interval}d`;
    interval = Math.floor(secondsAgo / 3600);
    if (interval >= 1) return interval === 1 ? `${interval}hr` : `${interval}hrs`;
    interval = Math.floor(secondsAgo / 60);
    if (interval >= 1) return interval === 1 ? `${interval}min` : `${interval}mins`;
    return `${secondsAgo}s`;
};

export const getFileExtension = (uri) => {
    const match = uri.match(/\.[^\.\/]+$/);
    return match ? match[0].slice(1)?.toLowerCase() : null;
};

