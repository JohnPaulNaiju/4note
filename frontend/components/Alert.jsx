import React from 'react';
import { Dimensions } from 'react-native';
import { View, Text, Colors, TouchableOpacity } from 'react-native-ui-lib';

const { width, height } = Dimensions.get('window');
const width1 = width*0.75;

const Alert = ({ visible, title, subtitle, text1, text2, text1Press, text2Press}) => {

    if(!visible) return null;

    return (

        <View center width={width} height={height} bg-overlay absH absV>
            <View br50 bg-bg1 centerH paddingT-18 width={width1} style={{ zIndex: 999 }}>
                <View center width={width*0.8}>
                    <Text text1 text70R gs marginH-16>{title}</Text>
                    <Text text1 text80R gr marginH-16>{subtitle}</Text>
                </View>
                <View marginT-12 row centerV width={width1} style={{ borderTopWidth: 1, borderColor: Colors.line }}>
                    <TouchableOpacity flex center activeOpacity={0.5} style={{ height: 46, zIndex: 99999 }} onPress={text1Press}>
                        <Text blue text70R gs>{text1}</Text>
                    </TouchableOpacity>
                    <View bg-line width={1} height={46}/>
                    <TouchableOpacity flex center activeOpacity={0.5} style={{ height: 46, zIndex: 99999 }} onPress={text2Press}>
                        <Text red text70R gr>{text2}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>

    );

};

export default React.memo(Alert);