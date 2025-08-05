import React from 'react';
import { TouchableOpacity, View } from 'react-native-ui-lib';

const VideoBox = ({uri, width, bgColor, brColor, onPress}) => {

    return (

        <TouchableOpacity activeOpacity={0.5} onPress={onPress}>
            <View backgroundColor={bgColor} style={{ borderWidth: 1, borderColor: brColor }}>
            </View>
        </TouchableOpacity>

    );

};

export default React.memo(VideoBox);