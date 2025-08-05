import React from 'react';
import Input from './Input';
import Modal from 'react-native-modal';
import { Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { View, Text, Colors, TouchableOpacity } from 'react-native-ui-lib';

const { width } = Dimensions.get('window');
const width1 = width*0.85;
const isAndroid = Platform.OS === 'android';

const Prompt = ({visible, text1, text2, text1Press, text2Press, close, placeholder, value, onChange}) => {

    return (

        <Modal visible={Boolean(visible)} onDismiss={close} statusBarTranslucent style={{ margin: 0 }}>
            <View center bg-overlay flex>
                <KeyboardAvoidingView behavior={isAndroid ? null : 'padding'} keyboardVerticalOffset={120}>
                    <View br50 bg-bg1 centerH paddingT-18 width={width1}>
                        <Input multiline placeholder={placeholder} value={value} onChange={onChange} w={width*0.8}/>
                        <View marginT-12 row centerV width={width1} style={{ borderTopWidth: 1, borderColor: Colors.line }}>
                            <TouchableOpacity flex center activeOpacity={0.5} style={{ height: 46 }} onPress={text1Press}>
                                <Text blue text70R gs>{text1}</Text>
                            </TouchableOpacity>
                            <View bg-line width={1} height={46}/>
                            <TouchableOpacity flex center activeOpacity={0.5} style={{ height: 46 }} onPress={text2Press}>
                                <Text red text70R gr>{text2}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>

    );

};

export default React.memo(Prompt);