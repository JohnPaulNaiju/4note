import React from 'react';
import { Colors, View, Text, TouchableOpacity } from 'react-native-ui-lib';
import { ActivityIndicator, ImageBackground } from 'react-native';

const StateScreen = ({loader, title, subtitle, source, label, onPress, ...rest}) => {

    return (
        <ImageBackground resizeMode='center' style={{ flex: 1, backgroundColor: Colors.bg2 }} source={source}>
            <View flex center paddingH-40 bg-bg2={!source} >
                {loader ? <ActivityIndicator size='large' color={Colors.blue}/> : null}
                {title ? <Text text1 text60R gs center marginT-12 {...rest}>{title}</Text> : null}
                {subtitle ? <Text text2 text70 gr center marginT-6>{subtitle}</Text> : null}
                {label && onPress ? 
                <TouchableOpacity marginT-16 onPress={onPress}>
                    <Text text70 blue style={{ fontWeight: 'bold' }}>{label}</Text>
                </TouchableOpacity> : null}
            </View>
        </ImageBackground>
    );
};

export default React.memo(StateScreen);