import React from 'react';
import { Image } from 'expo-image';
import { TouchableOpacity, View } from 'react-native-ui-lib';

const ImageBox = ({uri, width, bgColor, brColor, onPress}) => {

    return (

        <TouchableOpacity activeOpacity={0.5} onPress={onPress}>
            <View backgroundColor={bgColor} style={{ borderWidth: 1, borderColor: brColor }}>
                <Image
                recyclingKey={uri} 
                source={{ uri: uri }} 
                placeholderContentFit='contain' 
                style={{ width: width, height: width }} 
                placeholder=''/>
            </View>
        </TouchableOpacity>

    );

};

export default React.memo(ImageBox);