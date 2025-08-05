import React from 'react';
import { useAudio } from 'expo-audio';
import { Icon } from '../../components';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system';
import Markdown from 'react-native-markdown-display';
import { Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth, db, GEMINI_API_KEY, getMarkDownStyle } from '../../utils';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { View, Text, TouchableOpacity, Colors } from 'react-native-ui-lib';
import { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const TypingMarkdown = ({ text, speed = 100 }) => {

    const [displayedText, setDisplayedText] = React.useState('');
    const intervalRef = React.useRef(null);
    const indexRef = React.useRef(0);

    React.useEffect(() => {

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (!text.startsWith(displayedText)) {
            setDisplayedText('');
            indexRef.current = 0;
        }

        if (text.length > displayedText.length) {
            indexRef.current = displayedText.length;
            
            intervalRef.current = setInterval(() => {
                if (indexRef.current < text.length) {
                    setDisplayedText(text.slice(0, indexRef.current + 1));
                    indexRef.current++;
                } else {
                    clearInterval(intervalRef.current);
                }
            }, speed);
            
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [text, speed]);

    return (

        <Markdown style={getMarkDownStyle()}>{displayedText}</Markdown>

    );

};

const RecordingTimer = ({ isRecording, onPress }) => {

    const opacity = useSharedValue(1);

    const timerRef = React.useRef(null);

    const [elapsedTime, setElapsedTime] = React.useState(0);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    React.useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRecording]);

    React.useEffect(() => {
        if(isRecording){
            setElapsedTime(0);
            opacity.value = withRepeat(
                withTiming(0.4, { 
                    duration: 800, 
                    easing: Easing.sin, 
                }),
                -1, 
                true 
            );
        }else{
            opacity.value = withTiming(1, { duration: 300 });
        }
    }, [isRecording]);

    return (

        <View bg-black paddingV-8 paddingH-16 br100 row centerV style={Colors.shadow}>
            {isRecording && <View reanimated br100 bg-red marginR-8 width={10} height={10} style={style}/>}
            <Text white text70R>{formatTime(elapsedTime)}</Text>
            <TouchableOpacity center paddingL-16 onPress={onPress}>
                <Icon name={isRecording ? 'pause' : 'play'} type='font6' size={20} color={Colors.white}/>
            </TouchableOpacity>
        </View>

    );
};

export default function Lecture() {

    const scrollRef = React.useRef(null);

    const navigation = useNavigation();

    const ws = React.useRef(null);
    const audioRecorder = useAudio();
    const recordState = React.useRef(null);
    const sessionId = React.useRef(Date.now().toString());

    const [recording, setRecording] = React.useState(false);
    const [note, setNote] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);

    const looper = async () => {
        try{
            const recordingSession = await audioRecorder.startRecordingAsync({
                format: 'aac',
                quality: 'high',
            });
            recordState.current = recordingSession;
            navigation.setParams({ text: 'Listening...' });
            setTimeout(async () => {
                const result = await audioRecorder.stopRecordingAsync();
                looper();
                const base64Data = await FileSystem.readAsStringAsync(result.fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                        chunk: base64Data,
                        sessionId: sessionId.current,
                        timestamp: Date.now(),
                    }));
                    navigation.setParams({ text: 'Analyzing...' });
                }
            }, 60000);
        }catch(error){
            console.log('Error during recording loop:', error);
            Toast.show({ text1: 'Recording failed' });
        }
    };

    const record = async () => {
        try{
            const { granted } = await audioRecorder.requestPermissionsAsync();
            if(!granted){
                Toast.show({ text1: 'Microphone permission denied' });
                return;
            }
            await audioRecorder.prepareRecording();
            sessionId.current = Date.now().toString();
            setNote("");
            Toast.show({ text1: 'Starting recording...' });
            setRecording(true);
            looper();
        }catch(e){
            console.log('Failed to start recording:', e);
            Toast.show({ text1: 'Failed to start recording' });
        }
    };

    const stopRecording = async () => {
        setRecording(false);
        try{
            await audioRecorder.stopRecordingAsync();
        }catch(error){
            console.log('Error stopping recording:', error);
        }
        navigation.setParams({ text: 'Waiting...' });
    };

    const generateTitle = async (content) => {
        try {

            const truncatedContent = content.length > 1000 ? content.substring(0, 1000) + '...' : content;

            const prompt = `Generate a concise, descriptive title (maximum 5 words) for this audio transcription:\n${truncatedContent}`;

            const result = await model.generateContent(prompt);
            const title = result.response.text().trim();

            const Title = title.length > 50 ? title.substring(0, 47) + '...' : title;

            return Title;
        }catch(error){
            console.error('Error generating title:', error);
            return 'Audio Transcription';
        }
    };

    const saveNote = async (note) => {

        if(note.length === 0) {
            Toast.show({ text1: 'Nothing to save' });
            return;
        }

        try {

            navigation.setParams({ text: 'Saving...' });

            setIsSaving(true);

            const title = await generateTitle(note);
            console.log('Generated title:', title);

            const noteData = {
                title: title, 
                content: note, 
                author: auth.currentUser.uid, 
                timestamp: serverTimestamp(), 
                folder: null, 
                emoji: '🎙️', 
                pinned: false, 
                sharing: false, 
                createdAt: serverTimestamp(), 
            };

            const docRef = collection(db, 'notes');
            await addDoc(docRef, noteData);

            Toast.show({ text1: 'Note saved successfully' });

            navigation.setParams({ text: null });

            setTimeout(() => {
                navigation.goBack();
            }, 100);

        }catch(error){
            navigation.setParams({ text: null });
            console.error('Error saving note:', error);
            Toast.show({ text1: 'Failed to save note' });
        }finally{
            setIsSaving(false);
        }
    };

    React.useEffect(() => {
        if(!recording) return;
        ws.current = new WebSocket('ws://192.168.151.210:8000/ws');
        ws.current.onopen = () => console.log('Connected to backend');
        ws.current.onmessage = (e) => {
            const message = JSON.parse(e.data);
            if(message?.text){
                navigation.setParams({ text: 'Generating...' });
                setNote((prev) => prev + message?.text);
            }
        }
        ws.current.onerror = (e) => console.log('WebSocket error: ', e.message);
        ws.current.onclose = (e) => console.log('WebSocket closed: ', e.code);
        return () => {
            if(ws.current) ws.current.close();
            recordState.current = null;
        };
    }, [recording]);

    return (

        <View flex useSafeArea bg-bg2>
            <View flex paddingH-6 paddingB-80>
                <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
                    {note.length > 0 ? <TypingMarkdown text={note} speed={50} /> : null}
                </ScrollView>
            </View>
            <View absB height={240} width={width}>
                <LinearGradient style={{ flex: 1 }} colors={[Colors.transparent, Colors.bg2]}>
                    <View height={100}/>
                    <View flex>
                        <View center height={70} width={width}>
                            <RecordingTimer isRecording={recording} onPress={recording ? stopRecording : record}/>
                        </View>
                        <View center height={70} width={width}>
                            {note.length > 0 ? 
                            <TouchableOpacity center br100 bg-blue activeOpacity={0.5} paddingH-26 style={{ height: 36 }} disabled={recording || isSaving}
                            onPress={() => saveNote(note)}>
                                <Text white text70 gs>{isSaving ? 'Saving...' : 'Save as note'}</Text>
                            </TouchableOpacity> : null}
                        </View>
                    </View>
                </LinearGradient>
            </View>
        </View>

    );

};