import React from 'react';
import { auth } from '../../utils';
import { Input } from '../../components';
import { avatars, updateUser } from '../../functions';
import { FlatList, Animated, Dimensions } from 'react-native';
import { View, Text, Avatar, TouchableOpacity, Colors } from 'react-native-ui-lib';

const { width } = Dimensions.get('window');

const ITEM_SIZE = width*0.38;
const ITEM_SPACING = (width - ITEM_SIZE) / 2;

const Profile = () => {

    const scrollRef = React.useRef(null);
    const scrollX = React.useRef(new Animated.Value(0)).current;

    const [data, setData] = React.useState({
        displayName: auth.currentUser.displayName, 
        photoURL: auth.currentUser.photoURL, 
    });

    const [editMode, setEditMode] = React.useState(false);

    const handleChange = React.useCallback((value) => {
        setData((state) => ({
            ...state, 
            ...value, 
        }));
    }, [setData]);

    const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true });

    const onScrollEnd = (e) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / ITEM_SIZE);
        handleChange({ photoURL: avatars[i] });
    };

    const open = () => {
        setEditMode(true);
        const index = avatars.findIndex(item => item === auth.currentUser.photoURL);
        if(index !== -1){
            setTimeout(() => {
                scrollRef.current?.scrollToIndex({ animated: true, index: index });
            }, 100);
        }
    };

    const onSave = (name, url) => {
        updateUser(name, url);
        setEditMode(false);
    };

    const renderItem = React.useCallback(({item, index}) => {
        const inputRange = [(index - 1) * ITEM_SIZE, index * ITEM_SIZE, (index + 1) * ITEM_SIZE];
        const opacity = scrollX.interpolate({ inputRange, outputRange: [.8, 1, .8] });
        const scale = scrollX.interpolate({ inputRange, outputRange: [.7, 1, .7] });
        return (
            <View animated center width={ITEM_SIZE} height={ITEM_SIZE} style={{ opacity: opacity, transform: [{ scale: scale }] }}>
                <Avatar 
                size={ITEM_SIZE} 
                onPress={() => {}} 
                source={{ uri: item }} 
                backgroundColor={Colors.bg1}/>
            </View>
        );
    }, []);

    const list = React.useMemo(() => (
        <Animated.FlatList
        horizontal
        data={avatars}
        ref={scrollRef}
        bounces={false}
        onScroll={onScroll}
        renderItem={renderItem}
        decelerationRate='fast'
        style={{ flexGrow: 0 }}
        snapToInterval={ITEM_SIZE}
        onMomentumScrollEnd={onScrollEnd}
        keyExtractor={(_, index) => index}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: ITEM_SPACING }}/>
    ), []);

    const editprofile = React.useMemo(() => (
        <View centerH paddingT-26 width={width}>
            {list}
            <Input marginT-36 placeholder='Name' value={data.displayName} onChange={e => handleChange({ displayName: e })}/>
            <TouchableOpacity marginT-26 center br100 bg-blue activeOpacity={0.5} style={{ width: '90%', height: 36 }} onPress={() => onSave(data.displayName, data.photoURL)}>
                <Text white text70 gs>Save Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity marginT-16 center br100 activeOpacity={0.5} style={{ width: '90%', height: 36, borderWidth: 1, borderColor: Colors.blue }} onPress={() => setEditMode(false)}>
                <Text blue text70 gs>Cancel</Text>
            </TouchableOpacity>
        </View>
    ), [data]);

    const profile = React.useMemo(() => (
        <View centerH width='100%'>
            <View row centerV paddingH-22 width='100%' height={100}>
                <View flex centerV>
                    <Text text1 text70R gs numberOfLines={1}>{data.displayName || 'No name'}</Text>
                    <Text text2 text80R gr numberOfLines={1}>{auth.currentUser.email}</Text>
                </View>
                <Avatar 
                animate 
                size={80} 
                backgroundColor={Colors.bg1} 
                source={{ uri: data.photoURL || '' }} 
                name={data.displayName || auth.currentUser.email}/>
            </View>
            <TouchableOpacity marginT-26 center br100 bg-blue activeOpacity={0.5} style={{ width: '90%', height: 36 }} onPress={open}>
                <Text white text70 gs>Edit Profile</Text>
            </TouchableOpacity>
        </View>
    ), [data]);

    return editMode ? editprofile : profile;

};

export default React.memo(Profile);