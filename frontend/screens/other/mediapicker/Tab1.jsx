import React from 'react';
import SubTab1 from './SubTab1';
import { getAlbums } from '../../../functions';
import { StateScreen } from '../../../components';
import { View, Colors, TabController } from 'react-native-ui-lib';

const Tab1 = ({navigation, route}) => {

    const { type, event } = route.params;

    const [albums, setAlbums] = React.useState(['_']);

    React.useEffect(() => {
        setTimeout(() => {
            getAlbums(setAlbums);
        }, 100);
    }, []);

    if(albums[0] === '_') return <StateScreen loader/>;

    return (

        <TabController items={albums}>
            <TabController.TabBar backgroundColor={Colors.bg2} selectedLabelColor={Colors.blue} labelColor={Colors.text2} labelStyle={{ fontFamily: 'Gilroy-SemiBold' }} selectedLabelStyle={{ fontFamily: 'Gilroy-SemiBold' }} indicatorStyle={{ backgroundColor: Colors.transparent }}/>
            <View flex>
                {albums.map((obj, i) => 
                <TabController.TabPage index={i} key={i} lazy>
                    <SubTab1 navigation={navigation} type={type} assetId={obj.id} event={event}/>
                </TabController.TabPage>)}
            </View>
        </TabController>

    );

};

export default React.memo(Tab1);