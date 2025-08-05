import React from 'react';
import Toast from 'react-native-toast-message';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Icon, Input, Logo, NoteBox } from '../../components';
import MaskedView from '@react-native-masked-view/masked-view';
import { auth, db, GEMINI_API_KEY, getMarkDownStyle } from '../../utils';
import { Colors, View, Text, Card, TouchableOpacity, Avatar } from 'react-native-ui-lib';
import { useAnimatedStyle, useSharedValue, withTiming, withRepeat } from 'react-native-reanimated';
import { KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';

const isAndroid = Platform.OS === 'android';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: `'You are an AI assistant for a note-taking app called 4note. You can help users find information in their notes, 
    answer questions based on their notes, and provide summaries of their notes. Always be helpful, concise, and accurate. When users ask 
    about their notes, prioritize information from their notes in your responses.`
});

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

const Message = React.memo(({ message, isUser, sourceNotes = [], onNotePress }) => {

    const [showSources, setShowSources] = React.useState(false);

    const hasSourceNotes = !isUser && sourceNotes && sourceNotes.length > 0;

    return (

        <View marginB-10 row style={{ alignItems: 'flex-start', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            {!isUser && (
                <View bg-blue br100 marginR-10 center width={28} height={28}>
                    <Icon name='hubot' type='octicons' color={Colors.white} size={16} />
                </View>
            )}
            <View br60 paddingH-12 paddingV-5 maxWidth='80%' bg-blue={isUser} bg-bg1={!isUser}>
                {hasSourceNotes ? 
                    <TouchableOpacity row centerV marginB-8 paddingB-8 onPress={() => setShowSources(!showSources)}>
                        <Text text80 blue marginR-4>Source Notes</Text>
                        <MaterialIcons name={showSources ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={16} color={Colors.blue}/>
                    </TouchableOpacity>
                : null}
                {hasSourceNotes ? showSources ? 
                    <View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {sourceNotes.map((note, index) => (
                                <View key={index} marginR-8>
                                    <NoteBox onPress={() => onNotePress(note.id)} {...note}/>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                : null : null}
                {isUser ? <Text white text70R>{message.content}</Text> : <Markdown style={getMarkDownStyle()}>{message.content}</Markdown>}
            </View>
            {isUser ?
                <View marginL-10>
                    <Avatar backgroundColor={Colors.bg1} label={auth.currentUser.displayName || auth.currentUser.email} source={{ uri: auth.currentUser.photoURL }} size={28}/>
                </View>
            : null}
        </View>
    );
}, (prevProps, nextProps) => {
    return prevProps.isUser === nextProps.isUser && 
           prevProps.message.id === nextProps.message.id && 
           prevProps.message.content === nextProps.message.content && 
           JSON.stringify(prevProps.sourceNotes) === JSON.stringify(nextProps.sourceNotes);
});

const RelevantNotes = React.memo(({ notes, onNotePress }) => {

    const [open, setOpen] = React.useState(false);

    if (!notes || notes.length === 0) return null;

    return (
        <View marginT-6>
            <TouchableOpacity marginL-16 marginB-5 row centerV onPress={() => setOpen(state => !state)}>
                <Text text80R text2 marginR-4>Related Notes</Text>
                <MaterialIcons name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={16} color={Colors.blue}/>
            </TouchableOpacity>
            {open ? 
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {notes.map((note, index) => (
                    <View key={index} marginR-8>
                        <NoteBox onPress={() => onNotePress(note.id)} {...note}/>
                    </View>
                ))}
            </ScrollView> : null}
        </View>
    );
}, (prevProps, nextProps) => {
    return JSON.stringify(prevProps.notes) === JSON.stringify(nextProps.notes);
});

export default function Main() {

    const navigation = useNavigation();
    const [messages, setMessages] = React.useState([]);
    const [inputText, setInputText] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [relevantNotes, setRelevantNotes] = React.useState([]);
    const [searchResults, setSearchResults] = React.useState([]);
    const [sourceNotesMap, setSourceNotesMap] = React.useState({});

    const memoizedRelevantNotes = React.useMemo(() => relevantNotes, [JSON.stringify(relevantNotes)]);
    const memoizedSourceNotesMap = React.useMemo(() => sourceNotesMap, [JSON.stringify(sourceNotesMap)]);

    const flatListRef = React.useRef(null);
    const left = React.useMemo(() => <Logo marginL-10 size={34}/>, []);

    const loadChatHistory = async () => {
        try{
            setIsLoading(true);
            const Query = query(
                collection(db, 'chat_history'),
                where('userId', '==', auth.currentUser.uid),
                orderBy('timestamp', 'desc'),
                limit(20)
            );

            const historySnapshot = await getDocs(Query);
            const history = historySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).reverse();

            setMessages(history);

            const sourceNotesData = {};

            for (const msg of history) {
                if (msg.role === 'assistant' && msg.sourceNoteIds && msg.sourceNoteIds.length > 0) {
                    const notes = await getNotesByIds(msg.sourceNoteIds);
                    sourceNotesData[msg.id] = notes;
                }
            }

            setSourceNotesMap(sourceNotesData);

            setIsLoading(false);

        }catch (error){
            console.error('Error loading chat history:', error);
            setIsLoading(false);
            Toast.show({ text1: 'Error loading chat history' });
        }
    };

    const getUserNotes = async () => {
        try{
            const q = query(
                collection(db, 'notes'),
                where('author', '==', auth.currentUser.uid),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || '',
                    content: data.content || '',
                    timestamp: data.timestamp,
                    folder: data.folder || '',
                    emoji: data.emoji || '📝'
                };
            });
        } catch (error) {
            console.error('Error getting user notes:', error);
            return [];
        }
    };

    const getNotesByIds = async (noteIds) => {
        try {
            const notes = [];
            for(const noteId of noteIds){
                const noteDoc = await getDoc(doc(db, 'notes', noteId));
                if(noteDoc.exists()){
                    const data = noteDoc.data();
                    notes.push({
                        id: noteDoc.id,
                        title: data.title || '',
                        content: data.content || '',
                        timestamp: data.timestamp,
                        folder: data.folder || '',
                        emoji: data.emoji || '📝'
                    });
                }
            }
            return notes;
        }catch(error){
            console.error('Error getting notes by IDs:', error);
            return [];
        }
    };

    const saveChatMessage = async (message, isUser = true, sourceNoteIds = []) => {
        try{
            const userId = auth.currentUser.uid;
            await addDoc(collection(db, 'chat_history'), {
                userId,
                content: message,
                role: isUser ? 'user' : 'assistant',
                timestamp: serverTimestamp(),
                sourceNoteIds: isUser ? [] : sourceNoteIds
            });
        }catch(error){
            console.error('Error saving chat message:', error);
        }
    };

    const semanticSearch = React.useCallback(async (query) => {
        try{
            setIsLoading(true);
            console.log('Starting semantic search for:', query);
            const notes = await getUserNotes();
            
            if (notes.length === 0) {
                console.log('No notes found for search');
                setIsLoading(false);
                return [];
            }

            console.log(`Found ${notes.length} notes to search through`);

            const searchPrompt = `
                I have the following notes. Please identify the top 3 most semantically relevant notes to this query: "${query}"\n
                For each relevant note, provide the note ID and a relevance score from 0-100.
                Format your response as a JSON array with objects containing 'id' and 'score' properties.
                Only include the JSON array in your response, nothing else.\n
                Notes:
                ${notes.map(note => `
                    //------------------------------------------------------------------------------//
                    ID: ${note.id}\n
                    Title: ${note.title || 'Untitled'}\n
                    Content: ${note.content ? note.content.substring(0, 500) + (note.content.length > 500 ? '...' : '') : ''}
                `).join('')}
            `;

            console.log('Sending search request to Gemini...');
            const result = await model.generateContent(searchPrompt);
            const resultText = result.response.text();
            console.log('Received response from Gemini');
            let relevantNoteIds = [];
            try {
                const jsonMatch = resultText.match(/\[\s*\{.*\}\s*\]/s);
                if (jsonMatch) {
                    relevantNoteIds = JSON.parse(jsonMatch[0]);
                    console.log('Successfully parsed JSON response');
                } else {
                    relevantNoteIds = JSON.parse(resultText);
                    console.log('Parsed entire response as JSON');
                }
            }catch (e){
                console.error('Error parsing semantic search results:', e);
                console.log('Falling back to keyword search');

                const fallbackResults = notes.filter(note => 
                    (note.title && note.title.toLowerCase().includes(query.toLowerCase())) || 
                    (note.content && note.content.toLowerCase().includes(query.toLowerCase()))
                ).slice(0, 3);

                console.log(`Found ${fallbackResults.length} notes via keyword search`);
                setIsLoading(false);
                return fallbackResults;
            }

            if(!relevantNoteIds || relevantNoteIds.length === 0){
                console.log('No relevant notes found in search results');
                setIsLoading(false);
                return [];
            }
            
            console.log(`Found ${relevantNoteIds.length} relevant notes`);

            const relevantNotes = [];

            for (const item of relevantNoteIds) {
                const note = notes.find(n => n.id === item.id);
                if (note) {
                    relevantNotes.push({
                        ...note,
                        score: item.score
                    });
                }
            }
            
            console.log(`Returning ${relevantNotes.length} notes from search`);
            setIsLoading(false);
            return relevantNotes;
        }catch (error){
            console.error('Error in semantic search:', error);
            setIsLoading(false);
            return [];
        }
    }, []);

    const generateResponse = async (query, chatHistory = []) => {
        try {

            const searchResults = await semanticSearch(query);

            if (searchResults.length === 0) {

                const genericPrompt = `
                    The user asked: "${query}"\n
                    They don't have any notes related to this query. Please provide a helpful response.\n
                    Chat history:${chatHistory.map(msg => `\n${msg.role}: ${msg.content}`).join('')}
                `;
                
                const result = await model.generateContent(genericPrompt);

                return {
                    response: result.response.text(),
                    relevantNotes: []
                };

            }

            const prompt = `
                The user asked: "${query}"\n
                Here are their relevant notes:\n
                ${searchResults.map(note => `\nNote Title: ${note.title || 'Untitled'}\nNote Content: ${note.content || ''}---`).join('')}
                \nChat history:
                ${chatHistory.map(msg => `\n${msg.role}: ${msg.content}`).join('')}
                Please provide a helpful response based on their notes. 
                If you're referring to specific information from their notes, mention which note it came from.
            `;

            const result = await model.generateContent(prompt);

            return {
                response: result.response.text(),
                relevantNotes: searchResults
            };

        }catch(error){
            console.error('Error generating AI response:', error);
            return {
                response: "I'm sorry, I encountered an error while processing your request. Please try again later.",
                relevantNotes: []
            };
        }
    };

    const sendMessage = async (inputText) => {
        if (!inputText.trim()) return;
        
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');

        await saveChatMessage(userMessage.content, true);

        const isSearchRequest = /find|search|show|get|list|notes about|notes on|related to/i.test(userMessage.content);
        
        try {
            setIsLoading(true);
            if(isSearchRequest){

                const searchResults = await semanticSearch(userMessage.content);
                setSearchResults(searchResults);

                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: searchResults.length > 0 
                        ? `I found ${searchResults.length} notes related to your query. Here they are:`
                        : "I couldn't find any notes related to your query.",
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, aiMessage]);
                await saveChatMessage(aiMessage.content, false);

                setSourceNotesMap(prev => ({
                    ...prev,
                    [aiMessage.id]: searchResults
                }));

            }else{

                const recentHistory = messages.slice(-10).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                const { response, relevantNotes } = await generateResponse(userMessage.content, recentHistory);

                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response,
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, aiMessage]);
                const sourceNoteIds = relevantNotes.map(note => note.id);
                await saveChatMessage(aiMessage.content, false, sourceNoteIds);

                setSourceNotesMap(prev => ({
                    ...prev,
                    [aiMessage.id]: relevantNotes
                }));

                if(relevantNotes && relevantNotes.length > 0) setRelevantNotes(relevantNotes);
                else setRelevantNotes([]);
            }
        }catch(error){
            console.error('Error sending message:', error);
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }finally{
            setIsLoading(false);
        }
    };

    const navigateToNote = React.useCallback((noteId) => {
        if (!noteId) {
            console.error('Note ID is undefined or null');
            Toast.show({ text1: 'Internal error' });
            return;
        }
        console.log('Navigating to note:', noteId);
        const allNotes = [...Object.values(sourceNotesMap).flat(), ...relevantNotes, ...searchResults];
        const noteToOpen = allNotes.find(note => note.id === noteId);
        if(noteToOpen){
            navigation.navigate('NoteEditor', noteToOpen);
        }else{
            navigation.navigate('NoteEditor', { id: noteId });
        }
    }, [navigation, relevantNotes, sourceNotesMap, searchResults]);

    const renderItem = ({item}) => (
        <Message 
        message={item} 
        onNotePress={navigateToNote} 
        isUser={item.role === 'user'} 
        sourceNotes={memoizedSourceNotesMap[item.id] || []}/>
    );

    React.useEffect(() => {
        loadChatHistory();
    }, []);

    const loader = React.useMemo(() => (
        <View flex center>
            <ActivityIndicator size="large" color={Colors.blue} />
            <Text marginT-10>Loading chat history...</Text>
        </View>
    ), []);

    const empty = React.useMemo(() => (
        <View flex center>
            <Logo size={60}/>
            <View height={60}/>
            <Text text60 marginB-10>Welcome to 4note AI</Text>
            <Text text70 center marginB-20>Ask me anything about your notes!</Text>
            <Card padding-15 marginB-10 style={{ width: '90%' }} backgroundColor={Colors.bg1}>
                <TouchableOpacity onPress={() => setInputText('Find all my notes about machine learning')}>
                    <Text blue>Find all my notes about machine learning</Text>
                </TouchableOpacity>
            </Card>
            <Card padding-15 marginB-10 style={{ width: '95%' }} backgroundColor={Colors.bg1}>
                <TouchableOpacity onPress={() => setInputText('Summarize my recent notes')}>
                    <Text blue>Summarize my recent notes</Text>
                </TouchableOpacity>
            </Card>
            <Card padding-15 style={{ width: '90%' }} backgroundColor={Colors.bg1}>
                <TouchableOpacity onPress={() => setInputText('What was in my note about project planning?')}>
                    <Text blue>What was in my note about project planning?</Text>
                </TouchableOpacity>
            </Card>
        </View>
    ), []);

    const footer = React.useMemo(() => (
        <>
            {memoizedRelevantNotes.length > 0 ? <RelevantNotes notes={memoizedRelevantNotes} onNotePress={navigateToNote} /> : null}
            {isLoading ?
                <View paddingV-10 left>
                    <ThinkingAnimation />
                </View>
            : null}
            <View style={{ height: 60 }} />
        </>
    ), [memoizedRelevantNotes, isLoading]);

    const list = (
        <FlatList
        data={messages}
        ref={flatListRef}
        renderItem={renderItem}
        ListFooterComponent={footer}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => index}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}/>
    );

    const input = React.useMemo(() => (
        <View marginB-8>
            <Input 
            multiline 
            left={left} 
            bgColor={Colors.bg1} 
            placeholder='Search or Ask AI...'
            style={[Colors.shadow, { borderWidth: 1, borderColor: Colors.line }]}
            value={inputText}
            onChange={setInputText}
            right={
                <TouchableOpacity
                br100
                center
                marginR-10
                backgroundColor={Colors.blue}
                style={{ width: 36, height: 36 }}
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}>
                    <Ionicons name="send" size={18} color={Colors.white} />
                </TouchableOpacity>
            }/>
        </View>
    ), [inputText, isLoading, ]);

    return (

        <KeyboardAvoidingView behavior={isAndroid ? null : 'padding'} keyboardVerticalOffset={80} style={{ flex: 1 }}>
            <View flex bg-bg2 useSafeArea>
                <View flex paddingH-8>
                    {isLoading && messages.length === 0 ? loader : messages.length === 0 ? empty : list}
                </View>
                {input}
            </View>
        </KeyboardAvoidingView>
    );

};