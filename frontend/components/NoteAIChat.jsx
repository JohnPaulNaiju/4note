import React from 'react';
import Toast from 'react-native-toast-message';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Icon, Input, Logo, StateScreen } from '../components';
import MaskedView from '@react-native-masked-view/masked-view';
import { auth, db, getMarkDownStyle, GEMINI_API_KEY } from '../utils';
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp, setDoc } from 'firebase/firestore';
import { View, Text, Colors, Button, Modal, TouchableOpacity } from 'react-native-ui-lib';
import { useAnimatedStyle, useSharedValue, withTiming, withRepeat } from 'react-native-reanimated';

const MESSAGE_TYPES = {
    USER: 'user',
    AI: 'ai'
};

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const ThinkingAnimation = () => {

    const translateX = useSharedValue(-100);

    React.useEffect(() => {
        translateX.value = withRepeat(
            withTiming(150, { duration: 2500 }),
            -1,
            false
        );
        return () => {
            translateX.value = 0;
        };
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    return (

        <MaskedView maskElement={
            <View center width={100} height={40}>
                <Text text80R white>Thinking...</Text>
            </View>
        }>
           <View bg-text2 width={100} height={40}>
                <View reanimated br100 bg-white width={40} height={40} overflow='hidden' style={animatedStyle}>
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[Colors.text2, Colors.grey50, Colors.grey50, Colors.text2, Colors.text2]} style={{ flex: 1 }}/>
                </View>
           </View>
        </MaskedView>

    );

};

const NoteAIChat = ({ visible, onClose, noteId, noteContent, noteTitle }) => {

    const flatListRef = React.useRef(null);

    const chat = React.useRef(null);

    const [messages, setMessages] = React.useState([]);
    const [inputMessage, setInputMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSending, setIsSending] = React.useState(false);

    const loadChatHistory = async () => {
        try {

            setIsLoading(true);
            const noteRef = doc(db, 'notes', noteId, 'chat', 'chat');
            const noteDoc = await getDoc(noteRef).catch(console.log);

            if(!noteDoc.exists()){

                const welcomeMessage = {
                    id: Date.now().toString(),
                    content: `Hi! I'm your AI assistant from 4note. I can help answer questions about "${noteTitle || 'this note'}". What would you like to know?`,
                    type: MESSAGE_TYPES.AI,
                    timestamp: Timestamp.now()
                };

                setMessages([welcomeMessage]);

                await setDoc(noteRef, {
                    chatHistory: [welcomeMessage]
                }).catch(console.log);

            }else{
                const noteData = noteDoc.data();
                if(noteData.chatHistory){

                    setMessages(noteData.chatHistory);

                    const formattedHistory = noteData.chatHistory?.map(msg => {
                        return {
                            role: msg.type === MESSAGE_TYPES.USER ? 'user' : 'model',
                            parts: [{ text: msg.content }]
                        };
                    }) || [];

                    const contextMessage = { 
                        role: 'user', 
                        parts: [{ 
                            text: `
                                Hi, I'm ${auth.currentUser.displayName}. 
                                I'm looking at a note titled "${noteTitle || 'Untitled'}" with the following content:
                                \n\n${noteContent}\n\n
                                Please help me understand this note. 
                                When answering, use markdown formatting when appropriate, be concise and accurate.
                                Your goal is to provide helpful, accurate, and concise responses about this note.
                                When appropriate, format your responses using markdown for better readability.
                                If you don't know something or if the information isn't in the note, be honest about it.` 
                        }]
                    };

                    const aiResponse = {
                        role: 'model',
                        parts: [{ 
                            text: `
                                Hello ${auth.currentUser.displayName}! I am an AI created by AI note taking app 4note!
                                I'll help you understand the note "${noteTitle || 'Untitled'}". 
                                What would you like to know about it?` 
                        }]
                    };

                    chat.current = model.startChat({
                        history: [contextMessage, aiResponse, ...formattedHistory],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 1000,
                        }
                    });

                }
            }
        }catch(error){
            console.error('Error loading chat history:', error);
            Toast.show({ text1: 'Failed to load chat history', type: 'error' });
        }finally{
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {

        if (!inputMessage.trim()) return;

        const userMessage = {
            id: Date.now().toString(),
            content: inputMessage.trim(),
            type: MESSAGE_TYPES.USER,
            timestamp: Timestamp.now()
        };

        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInputMessage('');
        setIsSending(true);

        try{

            const noteRef = doc(db, 'notes', noteId, 'chat', 'chat');

            await updateDoc(noteRef, {
                chatHistory: arrayUnion(userMessage)
            }).catch(console.log);

            if (!chat.current) {

                const contextMessage = { 
                    role: 'user', 
                    parts: [{ 
                        text: `Hi, I'm ${auth.currentUser.displayName}. I'm looking at a note titled "${noteTitle || 'Untitled'}" with content: ${noteContent.substring(0, 500)}...` 
                    }]
                };

                chat.current = model.startChat({
                    history: [contextMessage],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1000,
                    }
                });

            }

            const result = await chat.current.sendMessage(inputMessage);
            const aiResponse = result?.response?.text()?.trim();

            if (aiResponse) {
                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    content: aiResponse,
                    type: MESSAGE_TYPES.AI,
                    timestamp: Timestamp.now()
                };

                setMessages(prevMessages => [...prevMessages, aiMessage]);

                await updateDoc(noteRef, {
                    chatHistory: arrayUnion(aiMessage)
                }).catch(console.log);
            } else {
                throw new Error('Empty response from AI');
            }

        } catch (error) {
            console.error('Error sending message:', error);

            let errorContent = 'Sorry, I encountered an error processing your request. Please try again later.';
            
            if (error.message.includes('Empty response')) {
                errorContent = 'I couldn\'t generate a response for this question. Please try asking in a different way.';
            } else if (error.message.includes('network')) {
                errorContent = 'Network error. Please check your internet connection and try again.';
            } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
                errorContent = 'AI service is currently busy. Please try again in a few moments.';
            }
            
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                content: errorContent,
                type: MESSAGE_TYPES.AI,
                timestamp: Timestamp.now()
            };

            setMessages(prevMessages => [...prevMessages, errorMessage]);

            try{
                const noteRef = doc(db, 'notes', noteId, 'chat', 'chat');
                await updateDoc(noteRef, {
                    chatHistory: arrayUnion(errorMessage)
                }).catch(console.log);
            }catch(dbError){
                console.error('Error saving error message to database:', dbError);
            }

            Toast.show({ text1: 'Failed to get AI response', text2: errorContent.substring(0, 60) + '...', type: 'error' });
        }finally{
            setIsSending(false);
        }
    };

    const renderItem = React.useCallback(({item, index}) => {

        const isUser = item.type === MESSAGE_TYPES.USER;

        return (

            <View width='100%' left={!isUser} right={isUser} key={index}>
                <View paddingV-8 paddingH-12 br60 marginB-10 bg-bg1={!isUser} bg-blue={isUser} maxWidth='80%'>
                    <View>
                        {isUser ? <Text text70R white>{item.content}</Text> : <Markdown style={getMarkDownStyle()}>{item.content}</Markdown>}
                    </View>
                    <Text marginT-36={!isUser} text90R white={isUser} text2={!isUser}>
                        {item.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                    </Text>
                </View>
            </View>

        );
    }, []);

    React.useEffect(() => {
        if(noteId && visible) loadChatHistory();
    }, [noteId, visible]);

    return (

        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent statusBarTranslucent>
            <View flex bottom bg-overlay>
                <View bg-bg2 width='100%' height='95%' style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>

                    <View row centerV spread paddingH-16 paddingV-22>
                        <View row centerV>
                            <Logo size={28} sparkle/>
                            <Text text60 marginL-6>Ask AI</Text>
                        </View>
                        <TouchableOpacity padding-6 onPress={onClose}>
                            <Icon name="x" type="feather" size={24} />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? <StateScreen loader subtitle='Loading chat history'/> :
                    <View flex paddingH-12>
                        <FlatList
                        windowSize={10}
                        data={messages}
                        ref={flatListRef}
                        removeClippedSubviews
                        renderItem={renderItem}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={(item) => item.id || String(Math.random())}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        ListEmptyComponent={<StateScreen subtitle="No messages yet. Start a conversation!" />}
                        ListFooterComponent={
                            <View>
                                {isSending ? (
                                    <View left width='100%' marginV-10>
                                        <ThinkingAnimation/>
                                    </View>
                                ) : null}
                            </View>
                        }
                        />
                    </View>}

                    <KeyboardAvoidingView 
                    style={{ width: '100%' }}
                    behavior={Platform.OS === 'ios' ? 'padding' : null} 
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
                        <View row centerV paddingV-16 spread width='100%' bg-bg1>
                            <Input
                             multiline
                            placeholder="Ask AI about this note..."
                            value={inputMessage}
                            onChange={setInputMessage}
                            maxHeight={80}
                            style={{ fontSize: 16 }}
                            right={
                                <Button
                                bg-blue br100 marginR-4
                                onPress={handleSendMessage}
                                style={{ width: 40, height: 40 }}
                                disabled={isLoading || isSending || !inputMessage.trim()}
                                iconSource={() => <Icon name="send" type="feather" size={20} color={Colors.white} />}/>
                            }/>
                        </View>
                    </KeyboardAvoidingView>

                </View>
            </View>
        </Modal>

    );

};

export default React.memo(NoteAIChat);
