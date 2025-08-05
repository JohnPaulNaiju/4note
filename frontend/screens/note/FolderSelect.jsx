import React from 'react';
import { useFolderStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { Icon, StateScreen } from '../../components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, TouchableOpacity, Colors } from 'react-native-ui-lib';
import { DeviceEventEmitter, Dimensions, FlatList, StatusBar } from 'react-native';

const { width } = Dimensions.get('window');
const cw = width*0.95;

const top = StatusBar.currentHeight;

export default function FolderSelect() {

    const navigation = useNavigation();
    const route = useRoute();

    const { id, name } = route.params;

    const folders = useFolderStore(useShallow((state) => state.folders));
    const getNextFolders = useFolderStore((state) => state.getNextFolders);

    const [selected, setSelected] = React.useState({
        id: id || undefined, 
        name: name || undefined, 
    });

    const onPress = (id1, name, id2) => {
        if(id1 === id2) setSelected({ id: null, name: null });
        else setSelected({ id: id1, name });
    };

    const onDone = (id1, name) => {
        if(id1 !== id) DeviceEventEmitter.emit('folderSelect', { id: id1, name });
        navigation.goBack();
    };

    const renderItem = React.useCallback(({item}) => (
        <TouchableOpacity activeOpacity={0.5} onPress={() => onPress(item.id, item.name, selected.id)}>
            <View centerH width={width}>
                <View centerV row paddingH-12 bg-bg1 width={cw} height={44}>
                    <Icon 
                    size={18} 
                    type={selected.id === item.id ? 'octicons' : 'feather'} 
                    color={selected.id === item.id ? Colors.blue : Colors.icon} 
                    name={selected.id === item.id ? 'check-circle-fill' : 'folder-minus'}/>
                    <Text text70R gr text1 marginH-12 numberOfLines={1}>{item.name}</Text>
                </View>
            </View>
        </TouchableOpacity>
    ), [selected.id]);

    const header = React.useMemo(() => (
        <View centerV row spread width={width} height={60}>
            <TouchableOpacity onPress={() => onDone(selected.id, selected.name)}>
                <View center width={80} height={60}>
                    <Icon name='check-circle' type='octicons'/>
                </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <View center width={80} height={60}>
                    <Icon name='closecircleo' type='ant'/>
                </View>
            </TouchableOpacity>
        </View>
    ), [selected.id]);

    return (

        <View flex useSafeArea bg-bg2 paddingTop={top}>
            {header}
            <View flex centerH>
                {folders.length === 0 ? <StateScreen title='No folders' subtitle='Create a folder to add note'/> : 
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
                </View> }
            </View>
        </View>

    );

};