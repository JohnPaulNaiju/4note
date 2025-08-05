import React from 'react';
import { useFolderStore } from '../../store';
import { FolderBox } from '../../components';
import { View, Text } from 'react-native-ui-lib';
import { useShallow } from 'zustand/react/shallow';
import { Dimensions, FlatList } from 'react-native';
import { deleteFolder, getDate } from '../../functions';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const cw = width*0.92;

export default function AllFolders() {

    const navigation = useNavigation();

    const folders = useFolderStore(useShallow((state) => state.folders));
    const getNextFolders = useFolderStore((state) => state.getNextFolders);

    const nav = (item) => {
        const date1 = getDate(item?.createdAt);
        const date2 = getDate(item?.timestamp);
        navigation.navigate('FolderContent', { ...item, createdAt: date1, timestamp: date2 });
    };

    const renderItem = React.useCallback(({item}) => (
        <FolderBox 
        type={1} 
        onPress={() => nav(item)} 
        onDelPress={(id) => deleteFolder(id)} 
        {...item}/>
    ), []);

    return (

        <View flex bg-bg2 useSafeArea>
            <Text text1 text60R gs marginV-26 marginL-16>Folders</Text>
            <View flex centerH>
                <View centerH br50 bg-bg1 width={cw} style={{ overflow: 'hidden' }}>
                    <FlatList
                    data={folders}
                    renderItem={renderItem}
                    onEndReachedThreshold={0.75}
                    onEndReached={getNextFolders}
                    keyExtractor={(item, _) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ width: cw }}
                    ItemSeparatorComponent={() => <View bg-bg2 width={cw} height={2}/>}/>
                </View>
            </View>
        </View>

    );

};