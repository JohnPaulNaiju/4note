import React from 'react';
import { Icon, Logo, Prompt } from '../../components';
import { Dimensions, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { View, Text, Colors, TouchableOpacity } from 'react-native-ui-lib';
import Toast from 'react-native-toast-message';
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../utils';
import { YoutubeTranscript } from 'youtube-transcript';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFile } from '../../functions';

const { width } = Dimensions.get('window');
const width1 = width*0.5;
const width2 = width*0.45;

const methods = [
    { 
        label: 'Audio', 
        subtitle: 'Ideal for medical notes, client notes, class notes, online meeting etc.', 
        icon: 'ear-listen', 
        type: 'font6', 
        route: 'Lecture', 
        placeholder: 'Enter the audio link', 
    }, 
    { 
        label: 'Documents', 
        subtitle: 'Generate clean notes from pdf etc.', 
        icon: 'file-text', 
        type: 'feather', 
        route: 'document', 
        placeholder: 'Enter the document link', 
    }, 
    { 
        label: 'YouTube', 
        subtitle: 'Generate clean notes from YouTube videos', 
        icon: 'youtube', 
        type: 'feather', 
        route: 'youtube', 
        placeholder: 'Enter the YouTube link' 
    }, 
    { 
        label: 'Prompt', 
        subtitle: 'Generate from simple prompt', 
        icon: 'keyboard', 
        type: 'font-awesome', 
        route: 'prompt', 
        placeholder: 'Enter the prompt'
    }, 
    { 
        label: 'Web Page', 
        subtitle: 'Generate clean notes from web page', 
        icon: 'web', 
        type: 'material-community', 
        route: 'webpage', 
        placeholder: 'Enter the web page link'
    }, 
];

const genNote = async(text, option, setStatus) => {
    try{

        let theText = text;

        setStatus('Starting...');

        const docRef = collection(db, 'note_ai');

        let transcript = null;

        if(option === 'youtube'){
            transcript = await YoutubeTranscript.fetchTranscript(theText).catch(e => {
                setStatus('Error fetching transcript');
                setTimeout(() => {
                    setStatus(null);
                }, 2000);
            });
        }else if(option === 'document'){
            const file = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });
            if(file.canceled){
                setStatus('Please select a valid pdf file');
                setTimeout(() => {
                    setStatus(null);
                }, 2000);
                return;
            }
            const url = await uploadFile(`${Date.now()}_doc.pdf`, file.assets[0].uri, setStatus);
            if(!url){
                setStatus('Error uploading file');
                setTimeout(() => {
                    setStatus(null);
                }, 2000);
                return;
            }else theText = url;
        }

        // if(theText?.length === 0){
        //     setStatus('Please enter a valid link or prompt');
        //     setTimeout(() => {
        //         setStatus(null);
        //     }, 2000);
        //     return;
        // }

        const data = {
            noteType: option, 
            text: theText, 
            author: auth.currentUser.uid, 
            timestamp: serverTimestamp(), 
            status: 'Starting...', 
            ...option === 'youtube' && { transcript: transcript.map(item => item.text).join(' ') }
        };

        const ref = await addDoc(docRef, data);

        const docRef2 = doc(db, 'note_ai', ref.id);

        const listener = onSnapshot(docRef2, (snap) => {
            const status = snap.data().status;
            setStatus(status);
            if(status === 'Completed'){
                listener();
                Toast.show({ text1: 'Note generated' });
            }else if(status?.toLowerCase()?.includes('error')){
                listener();
                Toast.show({ text1: 'Error generating note' });
                setTimeout(() => {
                    setStatus(null);
                }, 2000);
            }
        });

    }catch(e){
        Toast.show({ text1: 'An error occurred' });
        setStatus('An error occurred. Please try again');
        console.log(e);
    }
};

export default function CreateNote() {

    const navigation = useNavigation();

    const prompt = React.useRef('');

    const [open, setOpen] = React.useState(-1);
    const [status, setStatus] = React.useState(null);

    const onPress = (index) => {
        if([0,1].includes(index)){
            if(index === 0){
                navigation.goBack();
                setTimeout(() => {
                    navigation.navigate('Lecture');
                }, 200);
            }
            else if(index === 1) genNote('', 'document', setStatus);
            return;
        }
        setOpen(index);
    };

    const renderItem = React.useCallback(({item, index}) => (
        <TouchableOpacity activeOpacity={0.5} onPress={() => onPress(index)}>
            <View center width={width1} height={width1}>
                <View br50 bg-bg1 paddingR-12 paddingL-16 paddingT-16 width={width2} height={width2} style={[Colors.shadow, { overflow: 'hidden' }]}>
                    <Text text60R gs blue>{item.label}</Text>
                    <Text text80R gs text2>{item.subtitle}</Text>
                    <View flex bottom right>
                        <Icon name={item.icon} type={item.type} color={Colors.bg3} size={80}/>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    ), []);

    React.useEffect(() => {
        if(status === 'Completed') navigation.goBack();
        else if(status === 'Error generating note') setStatus(null);
    }, [status]);

    return (

        <View flex bg-bg2>
            {status === null ? 
            <FlatList
            data={methods}
            numColumns={2}
            renderItem={renderItem}
            keyExtractor={(_, index) => index}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View height={80}/>}
            ListHeaderComponent={<Text marginL-18 marginT-6 marginB-16 gs text60R text1>Create new note</Text>}/>
            :
            <View flex center>
                <Logo size={164}/>
                <Text text70R blue center marginT-32>{status}</Text>
            </View>
            }
            {open === -1 ?  null : 
            <Prompt 
            visible={open} 
            close={() => setOpen(-1)} 
            text1='Next' text2='Cancel' 
            text2Press={() => setOpen(false)} 
            onChange={e => prompt.current = e} 
            placeholder={methods[open]?.placeholder} 
            text1Press={() => {
                genNote(prompt.current.trim(), methods[open]?.route, setStatus);
                setOpen(-1);
            }}/> }
        </View>

    );

};