import React from 'react';
import { getDate } from '../../functions';
import { useFolderStore } from '../../store';
import { FolderBox, Icon } from '../../components';
import { useShallow } from 'zustand/react/shallow';
import { Dimensions, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { View, Text, TouchableOpacity, Colors } from 'react-native-ui-lib';

const { width } = Dimensions.get('window');
const cw = width*0.92;

const FolderBar = () => {

    const navigation = useNavigation();

    const folders = useFolderStore(useShallow((state) => state.folders?.slice(0, 5)));

    const nav = (item) => {
        const date1 = getDate(item?.createdAt);
        const date2 = getDate(item?.timestamp);
        navigation.navigate('FolderContent', { ...item, createdAt: date1, timestamp: date2 });
    };

    const footer = React.useMemo(() => (
        <TouchableOpacity marginL-12 marginR-26 activeOpacity={0.5} onPress={() => navigation.navigate('CreateFolder')}>
            <View center br100 bg-bg1 height={42} width={42} style={{ borderWidth: 1, borderColor: Colors.line }}>
                <Icon name='plus' type='feather' color={Colors.text2}/>
            </View>
        </TouchableOpacity>
    ), []);

    const renderItem = React.useCallback(({item}) => (
        <FolderBox 
        type={0} 
        onPress={() => nav(item)} 
        {...item}/>
    ), []);

    if(folders?.length === 0) return null;

    return (

        <View bg-bg2 centerH width={width}>
            <View row centerV spread width={cw} height={32}>
                <Text text1 text60R gs>Folders</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AllFolders')}>
                    <View row centerV>
                        <Text blue text70R gr marginR-8>See all</Text>
                        <Icon name="right" type="ant" size={16}/>
                    </View>
                </TouchableOpacity>
            </View>
            <View centerV width={width} height={56}>
                <View width={width} height={46}>
                    <FlatList
                    horizontal 
                    data={folders} 
                    renderItem={renderItem} 
                    ListFooterComponent={footer} 
                    keyExtractor={(item, _) => item.id} 
                    showsHorizontalScrollIndicator={false} 
                    ListHeaderComponent={<View width={16}/>} 
                    ItemSeparatorComponent={<View width={12}/>}/>
                </View>
            </View>
        </View>

    );

};

export default React.memo(FolderBar);