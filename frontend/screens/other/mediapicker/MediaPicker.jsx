import React from 'react';
import Tab1 from './Tab1';
import Tab2 from './Tab2';
import Tab3 from './Tab3';
import { StatusBar } from 'react-native';
import { View, Colors, TabController } from 'react-native-ui-lib';
import { useNavigation, useRoute } from '@react-navigation/native';

const top = StatusBar.currentHeight;

export default function MediaPicker() {

    const navigation = useNavigation();
    const route = useRoute();

    const { type } = route.params;

    const screens = [{ label: 'Upload' }, { label: 'Link' }];
    if(type === 'photo') screens.push({ label: 'Pexels' });

    return (

        <View flex useSafeArea bg-bg2 paddingTop={top}>
            <TabController items={screens}>
            <TabController.TabBar backgroundColor={Colors.bg2} selectedLabelColor={Colors.blue} labelColor={Colors.text2} labelStyle={{ fontFamily: 'Gilroy-SemiBold' }} selectedLabelStyle={{ fontFamily: 'Gilroy-SemiBold' }} indicatorStyle={{ backgroundColor: Colors.blue }}/>
                <View flex>
                    <TabController.TabPage index={0} lazy>
                        <Tab1 navigation={navigation} route={route}/>
                    </TabController.TabPage>
                    <TabController.TabPage index={1} lazy>
                        <Tab2 navigation={navigation} route={route}/>
                    </TabController.TabPage>
                    {type === 'photo' ? 
                    <TabController.TabPage index={2} lazy>
                        <Tab3 navigation={navigation} route={route}/>
                    </TabController.TabPage> : null }
                </View>
            </TabController>
        </View>

    );

};