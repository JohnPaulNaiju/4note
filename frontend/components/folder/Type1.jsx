import React from 'react';
import { View, Text, Colors, TouchableOpacity } from 'react-native-ui-lib';

const Type1 = ({id, name, onPress}) => {

    return (

        <TouchableOpacity activeOpacity={0.5} onPress={onPress}>
            <View paddingH-16 br100 bg-bg1 centerV height={42} style={{ borderWidth: 1, borderColor: Colors.line }}>
                <Text text70 text2 gs>{name}</Text>
            </View>
        </TouchableOpacity>

    );

};

export default React.memo(Type1);