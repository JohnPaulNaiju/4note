import React from 'react';
import Icon from './Icon';
import { Image } from 'expo-image';
import { timeAgo } from '../functions';
import { Dimensions } from 'react-native';
import { View, Text, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const width1 = width*0.5;
const width2 = width*0.43;

const NoteBox = ({id, title, cover, emoji, folder, timestamp, pinned, sharing, onPress, onLongPress}) => {

    const opacity = useSharedValue(0);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

    const handleLongPress = (e) => {
        const { pageX, pageY } = e.event.nativeEvent;
        onLongPress(pageX, pageY);
    };

    React.useEffect(() => {
        opacity.value = withTiming(1, { duration: 500 });
    }, []);

    const banner = React.useMemo(() => (
        cover ? 
        <Image
        recyclingKey={id} 
        source={{ uri: cover }} 
        placeholderContentFit='contain' 
        style={{ width: width2, height: 116, backgroundColor: Colors.bg1 }} 
        placeholder=''/>
        : null
    ), [cover]);

    const time = React.useMemo(() => <Text text80R text2 gr marginR-8>{timeAgo(timestamp)}</Text>, [timestamp]);

    return (

        <TouchableOpacity center paddingV-8 br100 activeOpacity={0.8} delayLongPress={250} onPress={onPress} onLongPress={handleLongPress} style={{ width: width1 }}>
            <View reanimated br60 bg-bg1 width={width2} style={[style, { borderWidth: 1, borderColor: Colors.line, overflow: 'hidden' }, Colors.shadow]}>
                {banner}
                {emoji ? <Text text20 marginL-6 style={{ marginTop: cover ? -26 : 8 }}>{emoji}</Text> : null}
                <Text text1 text60R gs marginH-14 marginT-16={!emoji} marginT-6={emoji} numberOfLines={2}>{title || 'Untitled'}</Text>
                <View paddingH-16 paddingB-12 paddingT-10 row centerV width={width2}>
                    {time}
                    {folder?.id ? 
                    <View marginR-6 bg-bg7 br100 paddingH-6 paddingV-2 style={{ maxWidth: '75%' }}>
                        <Text text2 text90R gr numberOfLines={1}># {folder?.name}</Text>
                    </View> : null}
                    {sharing ? <Icon name='share' size={12} color={Colors.icon}/> : null}
                </View>
                {pinned ? 
                <View absT absR marginR-16>
                    <View bg-blue center width={40} height={40} style={{ borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
                        <Icon name='pin' type='material-community' color={Colors.white}/>
                    </View>
                </View> : null}
            </View>
        </TouchableOpacity>

    );

};

export default React.memo(NoteBox);