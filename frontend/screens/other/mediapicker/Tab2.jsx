import React from 'react';
import { Input } from '../../../components';
import { DeviceEventEmitter } from 'react-native';
import { Text, View, TouchableOpacity, Colors } from 'react-native-ui-lib';

const Tab2 = ({navigation, route}) => {

    const { event } = route.params;

    const link = React.useRef('');

    const submit = () => {
        if(link.current.trim().length === 0) return;
        DeviceEventEmitter.emit(event, link.current.trim());
        navigation.goBack();
    };

    return (

        <View flex>
            <Input 
            marginT-26 
            bgColor={Colors.bg2} 
            placeholder='Paste image link' 
            onChange={e => link.current = e} 
            style={{ borderWidth: 1, borderColor: Colors.line }}/>
            <Text text2 text80R gr marginT-8 marginL-26>Works with any online image</Text>
            <View centerH width='100%'>
                <TouchableOpacity marginT-16 center br100 activeOpacity={0.5} onPress={submit}
                style={{ width: '90%', height: 36, borderWidth: 1, borderColor: Colors.blue }}>
                    <Text blue text70 gs>Change cover</Text>
                </TouchableOpacity>
            </View>
        </View>

    );

};

export default React.memo(Tab2);