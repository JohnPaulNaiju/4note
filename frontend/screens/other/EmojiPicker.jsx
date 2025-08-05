import React from 'react';
import { useEmojiStore } from '../../store';
import { Icon, Input } from '../../components';
import { FlashList } from '@shopify/flash-list';
import { useShallow } from 'zustand/react/shallow';
import { useNavigation } from '@react-navigation/native';
import { Dimensions, DeviceEventEmitter, StatusBar } from 'react-native';
import { View, Text, TouchableOpacity, Colors } from 'react-native-ui-lib';

const { width } = Dimensions.get('window');
const cw = width/6;

const top = StatusBar.currentHeight;

export default function EmojiPicker() {

    const navigation = useNavigation();

    const data = useEmojiStore(useShallow((state) => state.emojis));
    const getEmojis = useEmojiStore((state) => state.getEmojis);

    const [search, setSearch] = React.useState('');
    const [selected, setSelected] = React.useState(null);

    const close = () => navigation.goBack();

    const onPress = (emoji) => {
        if(emoji) DeviceEventEmitter.emit('emojiSelect', emoji);
        close();
    };

    const handleChange = React.useCallback((value) => {
        setSearch(value);
    }, []);

    React.useEffect(() => {
        getEmojis();
    }, []);

    const filteredData = React.useMemo(() => data.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase())), [search, data]);

    const renderItem = React.useCallback(({item}) => (
        <TouchableOpacity activeOpacity={0.5} onPress={() => setSelected(item.emoji)}>
            <View br30 center width={cw} height={cw}>
                <Text text20>{item.emoji}</Text>
            </View>
        </TouchableOpacity>
    ), []);

    if(data.length === 0){

        return (

            <View bg-bg1 flex useSafeArea paddingTop={top}>
                <View centerV row spread width={width} height={60}>
                    <View/>
                    <TouchableOpacity onPress={close}>
                        <View center width={80} height={60}>
                            <Icon name='closecircleo' type='ant'/>
                        </View>
                    </TouchableOpacity>
                </View>
                <View center flex>
                    <Text text70R gs text2 center>Your emojis are loading...{"\n"}Hang tight!</Text>
                </View>
            </View>

        );

    }

    return (

        <View flex useSafeArea bg-bg2 paddingTop={top}>
            <View centerV row spread width={width} height={60}>
                <TouchableOpacity onPress={() => onPress(selected)}>
                    <View center width={80} height={60}>
                        <Icon name='check-circle' type='octicons'/>
                    </View>
                </TouchableOpacity>
                <Text text30>{selected}</Text>
                <TouchableOpacity onPress={close}>
                    <View center width={80} height={60}>
                        <Icon name='closecircleo' type='ant'/>
                    </View>
                </TouchableOpacity>
            </View>
            <Input 
            value={search} 
            bgColor={Colors.bg2} 
            onChange={handleChange} 
            placeholder='Search...' 
            style={{ borderWidth: 1, borderColor: Colors.line }}/>
            <View flex>
                <FlashList 
                numColumns={6} 
                data={filteredData} 
                estimatedItemSize={71} 
                renderItem={renderItem} 
                keyExtractor={(_, index) => index} 
                keyboardShouldPersistTaps='handled' 
                showsVerticalScrollIndicator={false}/>
            </View>
        </View>

    );

};