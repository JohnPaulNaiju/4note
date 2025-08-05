import React from 'react';
import { Icon } from '../../components';
import { debounce, saveNoteMetaData } from '../../functions';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DeviceEventEmitter, ImageBackground, Platform } from 'react-native';
import { View, Text, Colors, TouchableOpacity, TextField } from 'react-native-ui-lib';

const isAndroid = Platform.OS === 'android';

const Header = ({ newRef, noteId, isDisabled }) => {

    const navigation = useNavigation();
    const route = useRoute();

    const disabled = isDisabled;

    const { title, cover, emoji, folder } = route.params;

    const tracker = React.useRef({ title, cover, emoji, folder });
    const [data, setData] = React.useState({ title, cover, emoji, folder });

    const onSave = debounce((value, prevFolderId) => {
        saveNoteMetaData(noteId, newRef.current, value, prevFolderId || null);
        if(newRef.current) newRef.current = false;
    }, 2000);

    const handleChange = React.useCallback((value, prevFolderId) => {
        tracker.current = { ...tracker.current, ...value };
        setData((state) => ({
            ...state, 
            ...value, 
        }));
        onSave(value, prevFolderId);
    }, [setData]);

    const emojiOpen = () => navigation.navigate('EmojiPicker');
    const coverOpen = () => navigation.navigate('MediaPicker', { type: 'photo', event: 'mediaSelect' });
    const folderOpen = () => navigation.navigate('FolderSelect', { id: tracker.current.folder?.id || undefined, name: tracker.current.folder?.name || undefined });

    React.useEffect(() => {
        const sub1 = DeviceEventEmitter.addListener('emojiSelect', (e) => handleChange({ emoji: e }));
        const sub2 = DeviceEventEmitter.addListener('mediaSelect', (e) => handleChange({ cover: e }));
        const sub3 = DeviceEventEmitter.addListener('folderSelect', (e) => handleChange({ folder: e }, tracker.current.folder?.id));
        return () => {
            sub1.remove();
            sub2.remove();
            sub3.remove();
        };
    }, [navigation]);

    const openMindMap = () => {
        navigation.navigate('MindMap', { id: noteId });
    };

    const section1 = React.useMemo(() => (
        <View row centerV spread width='92%' height={58}>
            <TouchableOpacity disabled={disabled} activeOpacity={0.5} onPress={coverOpen}>
                <View row centerV>
                    <Icon size={18} name='image' type='feather' color={Colors.icon}/>
                    <Text text2 gr text80 marginL-6>Add cover</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity disabled={disabled} activeOpacity={0.5} onPress={emojiOpen}>
                <View row centerV>
                    {data.emoji ? null : <Icon size={18} name='smile' type='feather' color={Colors.icon}/>}
                    <Text text2 gr text80 marginL-6>{data.emoji} {data.emoji ? 'Change emoji' : 'Add emoji'}</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity disabled={disabled} activeOpacity={0.5} onPress={folderOpen}>
                <View row centerV>
                    <Icon size={18} name='folder-minus' type='feather' color={Colors.icon}/>
                    <View marginL-6 maxWidth={90}>
                        <Text text2 gr text80 numberOfLines={1}>{data.folder?.id ? data.folder?.name : 'Select folder'}</Text>
                    </View>
                    <Icon size={20} name='chevron-small-down' type='entypo' color={Colors.icon}/>
                </View>
            </TouchableOpacity>
        </View>
    ), [data.emoji, data.folder]);

    const section2 = React.useMemo(() => (
        <View marginB-6 width='100%'>
            <View bg-bg1 width='100%' style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
                <ImageBackground width='100%' borderBottomLeftRadius={30} borderBottomRightRadius={30} style={{ height: 200 }} source={{ uri: data.cover }}>
                    <View row padding-16 flex right>
                        <TouchableOpacity disabled={disabled} activeOpacity={0.8} onPress={coverOpen}>
                            <View row centerV br100 paddingR-9 paddingL-2 height={30} backgroundColor={Colors.bg1+'BF'} style={{ borderWidth: 1, borderColor: Colors.line }}>
                                <Icon name='change-circle' color={Colors.icon}/>
                                <Text text2 text80R gr marginL-4>Change cover</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </ImageBackground>
            </View>
            <View flex row centerV spread paddingH-16 width='100%'>
                <TouchableOpacity disabled={disabled} activeOpacity={0.5} onPress={emojiOpen} style={{ marginTop: -46 }}>
                    {data.emoji ? <Text text10>{data.emoji}</Text> : <Icon size={60} name='emoji-flirt' type='entypo' color={Colors.icon}/>}
                </TouchableOpacity>
                <TouchableOpacity marginT-22 disabled={disabled} activeOpacity={0.5} onPress={folderOpen}>
                    <View row centerV>
                        <Icon size={18} name='folder-minus' type='feather' color={Colors.icon}/>
                        <View marginL-6 maxWidth={90}>
                            <Text text2 gr text80 numberOfLines={1}>{data.folder?.id ? data.folder?.name : 'Select folder'}</Text>
                        </View>
                        <Icon size={20} name='chevron-small-down' type='entypo' color={Colors.icon}/>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    ), [data.cover, data.emoji, data.folder]);

    return (

        <View centerH width='100%'>
            {data.cover ? section2 : section1}
            <View centerV width='92%' minHeight={44}>
                <TextField 
                multiline 
                maxLength={100} 
                text2 text40R gs 
                value={data.title} 
                placeholder='Untitled' 
                cursorColor={Colors.blue} 
                selectionHandleColor={Colors.blue} 
                placeholderTextColor={Colors.text2} 
                keyboardAppearance={Colors.getScheme()}
                onChangeText={e => {
                    if(!disabled) handleChange({ title: e })
                }} 
                selectionColor={isAndroid ? Colors.selection : Colors.blue}/>
            </View>
            <TouchableOpacity 
                style={{ marginTop: 10, marginBottom: 15 }}
                activeOpacity={0.7} 
                onPress={openMindMap}>
                <View row centerV bg-bg1 br100 paddingH-16 paddingV-8 style={{ borderWidth: 1, borderColor: Colors.line }}>
                    <Icon size={18} name='graph' type='material-community' color={Colors.blue}/>
                    <Text blue text80 marginL-6>View as Mind Map</Text>
                </View>
            </TouchableOpacity>
        </View>

    );

};

export default React.memo(Header);