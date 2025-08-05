import React from 'react';
import { Colors } from 'react-native-ui-lib';
import { FlashList } from '@shopify/flash-list';
import { MediaBox, StateScreen } from '../../../components';
import { Dimensions, DeviceEventEmitter } from 'react-native';
import { getAssets, getNextAssets } from '../../../functions';

const { width } = Dimensions.get('window');
const imgWidth = width/3;

const SubTab1 = ({assetId, type, navigation, event}) => {

    const lastVisible = React.useRef(null);

    const [assets, setAssets] = React.useState(['_']);

    const setLastVisible = (val) => { 
        lastVisible.current = val;
    };

    const onPress = (val) => {
        DeviceEventEmitter.emit(event, `upload:${val}`);
        navigation.goBack();
    };

    const onEndReached = async(len) => {
        if(len >= 2){
            await getNextAssets(assetId, type, setAssets, lastVisible.current, setLastVisible);
        }
    };

    React.useEffect(() => {
        setTimeout(() => {
            getAssets(assetId, type, setAssets, setLastVisible);
        }, 100);
    }, []);

    const renderItem = React.useCallback(({item}) => (
        <MediaBox 
        type={type} 
        uri={item.uri} 
        width={imgWidth} 
        bgColor={Colors.bg1} 
        brColor={Colors.bg2} 
        onPress={() => onPress(item.uri)}/>
    ), []);

    if(assets[0] === '_') return <StateScreen loader/>;
    else if(assets.length === 0) return <StateScreen subtitle='No media'/>;

    return (

        <FlashList 
        data={assets} 
        numColumns={3} 
        renderItem={renderItem} 
        onEndReachedThreshold={0.75} 
        estimatedItemSize={imgWidth} 
        keyExtractor={(_, index) => index} 
        showsVerticalScrollIndicator={false} 
        onEndReached={() => onEndReached(assets.length)}/>

    );

};

export default React.memo(SubTab1);