import React from 'react';
import Footer from './Footer';
import Screen1 from './Screen1';
import Screen2 from './Screen2';
import { Logo } from '../../components';
import { View, Text } from 'react-native-ui-lib';
import { KeyboardAvoidingView, Platform } from 'react-native';

const isAndroid = Platform.OS==='android';

export default function Main() {

    const [email, setEmail] = React.useState('');
    const [next, setNext] = React.useState(false);

    const screen = React.useMemo(() => next ? <Screen2 setNext={setNext} email={email}/> : <Screen1 setNext={setNext} email={email} setEmail={setEmail}/>, [next, email]);
    const effect = React.useMemo(() => <Logo size={168}/>, []);
    const footer = React.useMemo(() => <Footer/>, []);

    return (

        <View bg-bg2 flex useSafeArea centerH>
            <Text text1 text50R gs marginTop={isAndroid ? 56 : 26}>4note</Text>
            <View flex center absH absV>
                {effect}
            </View>
            <View flex/>
            <KeyboardAvoidingView behavior={isAndroid?null:'padding'} keyboardVerticalOffset={16}>
                {screen}
            </KeyboardAvoidingView>
            {footer}
        </View>

    );

};