import React from 'react';
import Icon from '../Icon';
import { View, Text, TouchableOpacity, Colors, Drawer } from 'react-native-ui-lib';
import { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

const Type2 = ({id, name, notes, color, onPress, onDelPress}) => {

    const height = useSharedValue(48);

    const style = useAnimatedStyle(() => ({ height: height.value }));

    const onDelClick = () => {
        height.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(onDelPress)(id);
        });
    };

    return (

        <Drawer 
        useNativeAnimations 
        style={{ width: '100%' }} 
        rightItems={[
            {
                icon: 'trash-2', 
                type: 'feather', 
                color: Colors.white, 
                background: Colors.blue, 
                onPress: () => onDelClick(), 
            }
        ]}>
            <View bg-bg1 width='100%'>
                <TouchableOpacity activeOpacity={0.5} onPress={onPress} style={{ width: '100%' }}>
                    <View reanimated bg-bg1 row centerV spread paddingH-16 width='100%' style={style}>
                        <View row centerV maxWidth='60%'>
                            <Icon name='folder-minus' type='feather' color={Colors.icon}/>
                            <View marginH-12 br100 width={10} height={10} backgroundColor={color}/>
                            <Text text1 text70R gr numberOfLines={1}>{name}</Text>
                        </View>
                        <View row centerV>
                            <Text text2 text70R gr marginR-8>{notes || 0}</Text>
                            <Icon name='chevron-right' type='feather' size={20}/>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        </Drawer>

    );

};

export default React.memo(Type2);