import React from 'react';
import { regex } from '../../functions';
import { functions } from '../../utils';
import { Icon, Input } from '../../components';
import Toast from 'react-native-toast-message';
import { httpsCallable } from 'firebase/functions';
import { View, TouchableOpacity, Colors } from 'react-native-ui-lib';

const Screen1 = ({setNext, setEmail, email}) => {

    const [loading, setLoading] = React.useState(false);

    const isValid = React.useMemo(() => regex.email.test(email), [email]);
    const disabled = React.useMemo(() => loading || !isValid, [loading, isValid]);

    const reqOTP = async(val) => {
        setLoading(true);
        const requestOTP = httpsCallable(functions, 'requestOTP');
        await requestOTP({ email: val }).then((res) => {
            const success = res.data.success;
            const msg = res.data.message;
            Toast.show({ text1: msg });
            if(success) setNext(true);
        }).catch((e) => {
            Toast.show({ text1: e.message });
        });
        setLoading(false);
    };

    const right = React.useMemo(() => (
        disabled ? null :
        <TouchableOpacity disabled={disabled} onPress={() => reqOTP(email)}>
            <View marginR-8 br100 bg-text1 center width={40} height={40}>
                <Icon name='arrow-right' type='octicons' color={Colors.bg1}/>
            </View>
        </TouchableOpacity>
    ), [email, disabled]);

    return (

        <Input 
        value={email} 
        right={right} 
        loading={loading} 
        bgColor={Colors.bg3} 
        placeholder='Email Address' 
        keyboardType='email-address'
        notValid={(email&&!isValid)} 
        onChange={e => setEmail(e)}/>

    );

};

export default React.memo(Screen1);