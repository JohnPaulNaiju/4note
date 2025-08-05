import React from 'react';
import Icon from './Icon';
import { View, Colors } from 'react-native-ui-lib';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const Logo = ({size, sparkle, ...rest}) => {

    const rotation = useSharedValue(0);

    React.useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, {
                duration: 2000,
                easing: Easing.linear, 
            }),
            -1,
            false
        );
    }, [rotation]);

    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

    return (

        <MaskedView maskElement={
            <View center width={size} height={size} {...rest}>
                <Icon name={sparkle ? 'sparkles' : 'gesture'} type={sparkle ? 'ion' : null} size={size-4} color={Colors.white}/>
            </View>
        }>
            <View reanimated br100 width={size} height={size} overflow='hidden' style={animatedStyle} {...rest}>
                <LinearGradient colors={Colors.grad} style={{ flex: 1 }}/>
            </View>
        </MaskedView>

    );

};

export default React.memo(Logo);