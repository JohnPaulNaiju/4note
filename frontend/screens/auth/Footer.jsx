import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native-ui-lib';

const Footer = () => {

    return (

        <View center width='100%' marginBottom={16}>
            <View centerV row spread width='80%' height={80}>
                <TouchableOpacity>
                    <Text text70R text1 gr>Privacy policy</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Text text70R text1 gr>Terms of service</Text>
                </TouchableOpacity>
            </View>
            <Text text90R text2 gr center marginTop={-28}>By creating account you agree to follow our terms & privacy policy</Text>
        </View>

    );

};

export default React.memo(Footer);