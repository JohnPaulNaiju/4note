import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { View, Colors } from 'react-native-ui-lib';
import { getPexels, debounce } from '../../../functions';
import { DeviceEventEmitter, Dimensions } from 'react-native';
import { Input, MediaBox, StateScreen } from '../../../components';

const { width } = Dimensions.get('window');
const imgWidth = width/3;

const Tab3 = ({navigation, route}) => {

    const { event } = route.params;

    const index = React.useRef(1);
    const search = React.useRef('');

    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [loading2, setLoading2] = React.useState(false);

    const onPress = (value) => {
        DeviceEventEmitter.emit(event, value);
        navigation.goBack();
    };

    const getData = async(value) => {
        index.current = 1;
        const photos = await getPexels(value, index.current);
        setData(photos);
        setLoading(false);
        setLoading2(false);
    };

    const onEndReached = async(len) => {
        if(len >= 21){
            index.current = index.current + 1;
            setLoading2(true);

            const photos = await getPexels(
                search.current.trim().length === 0 ? search.current.trim() : false, 
                index.current
            );

            setData((state) => [...state, ...photos]);
            setLoading2(false);
        }
    };

    const onChange = debounce((value) => {
        getData(value);
    }, 1500);

    const handleChange = React.useCallback((value) => {
        search.current = value;
        setLoading2(true);
        onChange(value);
    }, []);

    React.useEffect(() => {
        getData(false);
    }, []);

    const renderItem = React.useCallback(({item}) => (
        <MediaBox 
        type='photo' 
        width={imgWidth} 
        bgColor={Colors.bg1} 
        brColor={Colors.bg2} 
        uri={item?.portrait} 
        onPress={() => onPress(item?.landscape)}/>
    ),[]);

    if(loading) return <StateScreen loader/>;
    else if(data.length === 0) return <StateScreen subtitle='No media'/>;

    return (

        <View flex>
            <View flex>
                <FlashList 
                data={data} 
                numColumns={3} 
                renderItem={renderItem} 
                estimatedItemSize={142} 
                onEndReachedThreshold={0.75} 
                keyExtractor={(_, index) => index} 
                keyboardShouldPersistTaps='handled' 
                showsVerticalScrollIndicator={false} 
                ListHeaderComponent={<View height={80}/>} 
                onEndReached={() => onEndReached(data.length)}/>
            </View>
            <View absT absH marginT-16>
                <Input 
                loading={loading2} 
                placeholder='Search' 
                onChange={handleChange} 
                bgColor={Colors.bg2+'EF'} 
                style={{ borderWidth: 1, borderColor: Colors.line }}/>
            </View>
        </View>

    );

};

export default React.memo(Tab3);