import React from 'react';
import { BackHandler } from 'react-native';
import { functions, auth } from '../../utils';
import { Icon, Input } from '../../components';
import Toast from 'react-native-toast-message';
import { httpsCallable } from 'firebase/functions';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { View, Colors, TouchableOpacity } from 'react-native-ui-lib';

const Screen2 = ({setNext, email}) => {

    const [loading, setLoading] = React.useState(false);
    const [value, setValue] = React.useState('');

    const disabled = React.useMemo(() => loading || value.trim().length !== 6, [value, loading]);

    const verify = async(email, otp) => {
        setLoading(true);
        const verifyOTP = httpsCallable(functions, 'verifyOTP');
        await verifyOTP({ email: email, otp: otp }).then(async(res) => {
            const success = res.data.success;
            const msg = res.data.message;
            const key = res.data.key;
            Toast.show({ text1: msg });
            if(!success) setNext(false);
            else if(success) await signInWithEmailAndPassword(auth, email, key);
        }).catch((e) => {
            Toast.show({ text1: e.message });
        });
        setLoading(false);
    };

    const right = React.useMemo(() => (
        disabled ? null :
        <TouchableOpacity disabled={disabled} onPress={() => verify(email, value)}>
            <View marginR-8 br100 bg-text1 center width={40} height={40}>
                <Icon name='arrow-right' type='octicons' color={Colors.bg1}/>
            </View>
        </TouchableOpacity>
    ), [value, disabled, email]);

    React.useEffect(() => {
        const subscribe = BackHandler.addEventListener('hardwareBackPress', () => {
            setNext(false);
            return true;
        });
        return () => subscribe.remove();
    }, []);

    return (

        <Input 
        value={value} 
        right={right} 
        maxLength={6} 
        loading={loading} 
        bgColor={Colors.bg3} 
        keyboardType='number-pad'
        onChange={e => setValue(e)}
        placeholder='One Time Password'/>

    );

};

export default React.memo(Screen2);