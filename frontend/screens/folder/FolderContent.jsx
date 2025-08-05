import React from 'react';
import NoteMenu from '../home/NoteMenu';
import { useNoteStore2 } from '../../store';
import { FlashList } from '@shopify/flash-list';
import { useShallow } from 'zustand/react/shallow';
import { StateScreen, NoteBox } from '../../components';
import { View, Text, Colors } from 'react-native-ui-lib';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function FolderContent() {

    const navigation = useNavigation();
    const route = useRoute();

    const { id, name, color, createdAt, timestamp } = route.params;

    const menuRef = React.useRef(null);

    const loading = useNoteStore2(useShallow((state) => state.loading));
    const notes = useNoteStore2(useShallow((state) => state.notes));
    const getNotes = useNoteStore2((state) => state.getNotes);
    const getNextNotes = useNoteStore2((state) => state.getNextNotes);

    const onPress = (item) => {
        navigation.navigate('NoteEditor', item);
    };

    const onLongPress = (id, pinned, x, y) => {
        menuRef.current?.open(id, pinned, x, y);
    };

    React.useLayoutEffect(() => {
        navigation.setParams({ id, name, color });
    }, [navigation]);

    React.useEffect(() => {
        getNotes(id);
    }, []);

    const renderItem = React.useCallback(({item}) => (
        <NoteBox 
        onPress={() => onPress(item)} 
        onLongPress={(x, y) => onLongPress(item.id, item.pinned, x, y)} 
        {...item}/>
    ), []);

    if(loading) return <StateScreen loader/>;
    else if(notes?.length === 0) return <StateScreen title='No notes' subtitle='Try adding notes to this folder'/>;

    return (

        <View flex useSafeArea bg-bg2 paddingT-6>
            <FlashList
            data={notes} 
            numColumns={2} 
            renderItem={renderItem} 
            estimatedItemSize={238} 
            onEndReachedThreshold={0.75} 
            keyExtractor={(item, _) => item.id} 
            showsVerticalScrollIndicator={false} 
            onEndReached={() => getNextNotes(id)}/>
            <View paddingH-16 width='100%' paddingT-12 paddingB-6 style={{ borderTopWidth: 1, borderTopColor: Colors.line }}>
                <Text text2 text80R gr>Total Notes: {route.params?.notes || 0}</Text>
                <Text text2 text90R gr>Created by you at {createdAt}</Text>
                <Text text2 text90R gr>Last changed on {timestamp}</Text>
            </View>
            <NoteMenu navigation={navigation} ref={menuRef}/>
        </View>

    );

};