import React from 'react';
import Header from './Header';
import { db, GEMINI_API_KEY } from '../../utils';
import Modal from 'react-native-modal';
import { Icon, Logo } from '../../components';
import { exportToPDF } from '../../utils/pdfExport';
import { auth, getMarkDownStyle } from '../../utils';
import Markdown from 'react-native-markdown-display';
import NoteAIChat from '../../components/NoteAIChat';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import MaskedView from '@react-native-masked-view/masked-view';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { Colors, TouchableOpacity, View, Text, Button } from 'react-native-ui-lib';
import { useAnimatedStyle, useSharedValue, withTiming, withRepeat } from 'react-native-reanimated';
import { KeyboardAvoidingView, Platform, TextInput, Keyboard, Dimensions, FlatList, DeviceEventEmitter } from 'react-native';

const { width, height } = Dimensions.get('window');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

const MarkDownAnimation = ({content}) => {

    const translateY = useSharedValue(-100);

    React.useEffect(() => {
        translateY.value = withRepeat(
            withTiming(height, { duration: 1000 }),
            -1,
            false
        );
        return () => {
            translateY.value = 0;
        };
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    return (

        <MaskedView maskElement={
            <View paddingH-16 paddingB-100 width={width} height={height}>
                <Markdown style={getMarkDownStyle()}>{content}</Markdown>
            </View>
        }>
           <View bg-text2 width={width} height={height}>
                <View reanimated bg-white height={height*0.4} overflow='hidden' style={animatedStyle}>
                    <LinearGradient colors={[Colors.text2, Colors.blue, Colors.blue, Colors.grey40, Colors.text2, Colors.text2]} style={{ flex: 1 }}/>
                </View>
           </View>
        </MaskedView>

    );

};

export default function Editor() {

    const navigation = useNavigation();
    const route = useRoute();

    const { id, content, title } = route.params;

    const newRef = React.useRef(!id);

    const [open, setOpen] = React.useState(false);
    const [prompt, setPrompt] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [showAIChat, setShowAIChat] = React.useState(false);
    const [noteContent, setNoteContent] = React.useState(content || '');

    const isDisabled = React.useMemo(() => route.params?.author !== auth.currentUser.uid, [route.params]);

    const noteId = React.useMemo(() => id || `note${auth.currentUser.uid}${Date.now()}`, [id]);

    const processPrompt = async (noteContent, prompt) => {

        if (!prompt.trim()) return;

        try {

            setIsLoading(true);
            Keyboard.dismiss();
            setOpen(false);
            
            const promptText = `
                You are a helpful AI assistant that helps users edit their notes.
                
                Current note content:\n${noteContent}\n
                User request:\n${prompt}\n
                Please modify the note content according to the user's request.
                Return ONLY the modified content, nothing else - no explanations or comments.
                Preserve markdown formatting.
            `;

            const result = await model.generateContent(promptText);
            const newContent = result.response.text().trim();

            if(newContent){

                setNoteContent(newContent);

                const noteRef = doc(db, 'notes', noteId);

                await updateDoc(noteRef, {
                    content: newContent,
                    timestamp: serverTimestamp(), 
                });

                setOpen(false);
                setPrompt('');
            }

        }catch(error){
            console.error('Error processing prompt:', error);
        }finally{
            setIsLoading(false);
        }
    };

    const header = React.useMemo(() => <Header newRef={newRef} noteId={noteId} isDisabled={isDisabled}/>, [isDisabled, noteId]);

    const footer = React.useMemo(() => (
        <View paddingH-16 paddingB-100>
            <Markdown style={getMarkDownStyle()}>{noteContent}</Markdown>
        </View>
    ), [noteContent]);

    const float = React.useMemo(() => (
        <View absB absR margin-16>
            <TouchableOpacity activeOpacity={0.6} onPress={() => setOpen(true)}>
                <View br100 bg-bg1 center width={55} height={55} style={Colors.shadow}>
                    <Icon name='wand-sparkles' type='font6' color={Colors.blue}/>
                </View>
            </TouchableOpacity>
        </View>
    ), []);

    React.useLayoutEffect(() => {
        navigation.setParams({ isNew: newRef.current, isDisabled: isDisabled });
    }, [navigation, isDisabled]);

    React.useEffect(() => {
        const sub1 = DeviceEventEmitter.addListener('noteInfo', () => {
            navigation.navigate('NoteInfo', { id: noteId });
        });
        const sub2 = DeviceEventEmitter.addListener('noteDownload', async () => {
            try {
                await exportToPDF(noteContent, title);
            } catch (error) {
                console.error('Error exporting PDF:', error);
            }
        });
        const sub3 = DeviceEventEmitter.addListener('aiChat', () => {
            setShowAIChat(true);
        });
        return () => {
            sub1.remove();
            sub2.remove();
            sub3.remove();
        };
    }, [navigation, noteId, noteContent, title]);

    return (

        <View flex bg-bg2 centerH>
            <FlatList
            ListHeaderComponent={header}
            ListFooterComponent={isLoading ? <MarkDownAnimation content={noteContent}/> : footer}
            style={{ height: '100%', width: width }}
            contentInsetAdjustmentBehavior='automatic'/>
            {isDisabled ? null : open ? false : float}

            {showAIChat ? 
            <NoteAIChat 
            visible={showAIChat} 
            onClose={() => setShowAIChat(false)} 
            noteId={noteId}
            noteContent={noteContent}
            noteTitle={title}/> : null}

            {isDisabled ? null : open ? 
            <Modal
            isVisible={open}
            avoidKeyboard={true}
            style={{ margin: 0, justifyContent: 'flex-end' }}
            onBackdropPress={() => !isLoading && setOpen(false)}
            onBackButtonPress={() => !isLoading && setOpen(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{ width: '100%' }}>
                    <View bg-bg1 paddingT-16 paddingB-16 style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>

                        <View row centerV paddingH-16 marginB-16>
                            <View row centerV flex>
                                <Logo size={28}/>
                                <Text text70 blue marginL-6>Edit note with AI</Text>
                            </View>
                            {!isLoading && (
                                <TouchableOpacity onPress={() => setOpen(false)}>
                                    <Icon name='xmark' type='font6' size={20} color={Colors.text2} />
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        <View paddingH-16>
                            <View style={{ backgroundColor: Colors.bg2, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                                <TextInput
                                    placeholder="Tell AI what to do with your note..."
                                    placeholderTextColor={Colors.text2}
                                    multiline
                                    numberOfLines={3}
                                    value={prompt}
                                    onChangeText={setPrompt}
                                    editable={!isLoading}
                                    style={{
                                        color: Colors.text1,
                                        fontSize: 16,
                                        lineHeight: 22,
                                        maxHeight: 100,
                                    }}/>
                            </View>
                            
                            <Button
                            bg-blue br40 white
                            disabled={isLoading || !prompt.trim()}
                            disabledBackgroundColor={Colors.grey50}
                            onPress={() => processPrompt(noteContent, prompt)}
                            label={isLoading ? 'Processing...' : 'Apply Changes'}/>
                            <View marginT-8>
                                <Text text90R grey40 center>Examples: "Add a section about...", "Fix grammar"</Text>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal> : null}
        </View>

    );
};
