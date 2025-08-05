import React from 'react';
import Profile from './Profile';
import { auth } from '../../utils';
import { Dimensions, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon, ListItem, Alert } from '../../components';
import { View, Colors, Text } from 'react-native-ui-lib';

const { width } = Dimensions.get('window');
const cw = width*0.92;

const right = <View marginR-16><Icon name='chevron-right' type='feather' size={20}/></View>;

const logOut = async() => {
    //reset the stores here
    await auth.signOut();
};

export default function More() {

    const navigation = useNavigation();

    const [isOpen, setIsOpen] = React.useState(false);

    const handleOpen = () => setIsOpen(true);

    const view = React.useMemo(() => (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View flex centerH>
                <Profile/>
                <View marginT-36 centerH br50 bg-bg1 width={cw} style={{ overflow: 'hidden' }}>
                    <ListItem border icon='share' type='material-community' title='Shared with me' right={right} onPress={() => navigation.navigate('SharedWithMe')}/>
                    <ListItem icon='share-all-outline' type='material-community' title='Shared with others' right={right} onPress={() => navigation.navigate('SharedWithOthers')}/>
                </View>
                <View marginT-26 centerH br50 bg-bg1 width={cw} style={{ overflow: 'hidden' }}>
                    <ListItem border icon='image' type='feather' title='Media and storage' right={right} onPress={() => navigation.navigate('Media')}/>
                    <ListItem border icon='battery-charging' type='feather' title='Recharge 4note' right={right} onPress={() => navigation.navigate('Recharge')}/>
                    <ListItem border icon='devices' title='Linked devices' right={right} onPress={() => navigation.navigate('Devices')}/>
                    <ListItem icon='error-outline' title='Failed note generations' right={right} onPress={() => navigation.navigate('Errors')}/>
                </View>
                <View marginT-26 centerH br50 bg-bg1 width={cw} style={{ overflow: 'hidden' }}>
                    <ListItem icon='chatbubbles-outline' type='ion' title='Chat with us' right={right} onPress={() => navigation.navigate('Support')}/>
                </View>
                <View marginT-26 centerH br50 bg-bg1 width={cw} style={{ overflow: 'hidden' }}>
                    <ListItem icon='log-out' type='feather' title='Log out' color={Colors.red} onPress={handleOpen}/>
                </View>
                <View centerH flex bottom marginV-100>
                    <Text text2 text90R gr>Developed and maintained by</Text>
                    <Text text2 text70R gr>4note Labs, Inc.</Text>
                </View>
            </View>
        </ScrollView>
    ), []);

    return (

        <View flex bg-bg2 useSafeArea>
            <View flex>
                {view}
            </View>
            {isOpen ? 
            <Alert 
            visible={isOpen} 
            close={() => setIsOpen(false)} 
            title='Are you sure about this' 
            subtitle='I wanna log out' text1='No' text2='Yes' text1Press={() => setIsOpen(false)} text2Press={() => logOut()}/> : null}
        </View>

    );

};