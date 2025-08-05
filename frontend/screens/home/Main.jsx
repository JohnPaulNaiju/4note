import React from 'react';
import NoteMenu from './NoteMenu';
import FolderBar from './FolderBar';
import { Dimensions } from 'react-native';
import { useNoteStore } from '../../store';
import { View, Text } from 'react-native-ui-lib';
import { useShallow } from 'zustand/react/shallow';
import { MasonryFlashList } from '@shopify/flash-list';
import { StateScreen, NoteBox } from '../../components';
import { useNavigation, useScrollToTop } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const cw = width*0.92;

export default function Main() {

    const navigation = useNavigation();

    const menuRef = React.useRef(null);
    const scrollRef = React.useRef(null);

    useScrollToTop(scrollRef);

    const notes = useNoteStore(useShallow((state) => state.notes));
    const getNextNotes = useNoteStore((state) => state.getNextNotes);

    const onPress = (item) => {
        navigation.navigate('NoteEditor', item);
    };

    const onLongPress = (id, pinned, x, y) => {
        menuRef.current?.open(id, pinned, x, y);
    };

    const renderItem = React.useCallback(({item}) => (
        <NoteBox 
        onPress={() => onPress(item)} 
        onLongPress={(x, y) => onLongPress(item.id, item.pinned, x, y)} 
        {...item}/>
    ), []);

    const header = React.useMemo(() => (
        <View centerH width={width}>
            <FolderBar/>
            <View centerV height={42} width={cw}>
                <Text text1 text60R gs>Notes</Text>
            </View>
        </View>
    ), []);

    if(notes?.length === 0){

        return (

            <View flex>
                <FolderBar/>
                <StateScreen 
                marginT-180 
                title="No notes" 
                subtitle="Tap “Pen Icon” above to create a note" />
            </View>

        );

    }

    return (

        <View useSafeArea bg-bg2 flex centerH>
            <MasonryFlashList 
            data={notes} 
            numColumns={2} 
            ref={scrollRef} 
            renderItem={renderItem} 
            estimatedItemSize={238} 
            onEndReached={getNextNotes} 
            onEndReachedThreshold={0.75} 
            ListHeaderComponent={header} 
            keyExtractor={(item, _) => item.id} 
            showsVerticalScrollIndicator={false}/>
            <NoteMenu navigation={navigation} ref={menuRef}/>
        </View>

    );

};