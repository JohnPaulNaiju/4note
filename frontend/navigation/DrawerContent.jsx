import React from 'react';
import { auth } from '../utils';
import { getDate } from '../functions';
import { useFolderStore } from '../store';
import { Icon, Logo } from '../components';
import Toast from 'react-native-toast-message';
import { useShallow } from 'zustand/react/shallow';
import { useNavigation } from '@react-navigation/native';
import { Dimensions, Platform, FlatList } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar, Colors, Text, TouchableOpacity, View } from 'react-native-ui-lib';

const isAndroid = Platform.OS === 'android';

const { height } = Dimensions.get('window');
const ch = isAndroid ? height*0.97 : height*0.9;

const screens = [
    { label: 'Shared with me', icon: 'share', type: 'material-community', route: 'SharedWithMe' }, 
    { label: 'Media', icon: 'image', type: 'feather', route: 'Media' }, 
    { label: 'Recharge', icon: 'battery-charging', type: 'feather', route: 'Recharge' }, 
    { label: 'More', icon: 'view-stream', type: 'material', route: 'More' }, 
];

const DrawerContent = (props) => {

    const navigation = useNavigation();

    const folders = useFolderStore(useShallow((state) => state.folders?.slice(0, 3)));

    const [isDark, setIsDark] = React.useState(Colors.getScheme() === 'dark');

    const toggleDarkMode = async(val) => {
        setIsDark(val);
        Toast.show({ text1: 'Reopen app to view changes' });
        await AsyncStorage.setItem('theme', val ? 'dark' : 'light');
    };

    const nav = (item) => {
        const date1 = getDate(item?.createdAt);
        const date2 = getDate(item?.timestamp);
        navigation.navigate('FolderContent', { ...item, createdAt: date1, timestamp: date2 });
    };

    const renderItem = React.useCallback(({item}) => (
        <TouchableOpacity style={{ width: '100%' }} onPress={() => nav(item)}>
            <View paddingH-26 centerV width='100%' height={48}>
                <Text text2 text70 gr numberOfLines={1}>{item.name}</Text>
            </View>
        </TouchableOpacity>
    ), []);

    const folderEmpty = React.useMemo(() => (
        <View marginT-16 marginB-36 flex center>
            <View flex center>
                <Text text70 text2 gr>No Folders</Text>
                <Text text80 text2 gr>Tap “Button” to create a folder</Text>
            </View>
            <TouchableOpacity marginT-26 center br100 activeOpacity={0.5} 
            onPress={() => navigation.navigate('CreateFolder')}
            style={{ width: '100%', height: 36, borderWidth: 1, borderColor: Colors.blue }}>
                <Text blue text70 gs>Create folder</Text>
            </TouchableOpacity>
        </View>
    ), []);

    const folderview = React.useMemo(() => (
        <View marginT-16 marginB-36 width='100%'>
            <View br10 marginL-16 width='100%' style={{ borderLeftWidth: 3, borderLeftColor: Colors.line2 }}>
                <FlatList
                data={folders}
                scrollEnabled={false}
                estimatedItemSize={48}
                renderItem={renderItem}
                keyExtractor={(item, _) => item.id}
                showsVerticalScrollIndicator={false}/>
            </View>
            <TouchableOpacity marginT-26 center br100 activeOpacity={0.5} 
            onPress={() => navigation.navigate('AllFolders')}
            style={{ width: '100%', height: 36, borderWidth: 1, borderColor: Colors.blue }}>
                <Text blue text70 gs>Manage folders</Text>
            </TouchableOpacity>
        </View>
    ), [folders]);

    const menu = React.useMemo(() => (
        screens.map((obj, i) => (
        <TouchableOpacity key={i} activeOpacity={0.5} onPress={() => navigation.navigate(obj.route)}>
            <View row centerV spread width='100%' height={48}>
                <View marginL-6 row centerV>
                    <Icon name={obj.icon} type={obj.type}/>
                    <Text marginL-16 text70 text2 gr>{obj.label}</Text>
                </View>
                <Icon name='right' type='ant' size={16}/>
            </View>
        </TouchableOpacity>))
    ), []);

    const themeMenu = React.useMemo(() => (
        <View row br100 padding-4 bg-bg5 width='100%' height={56}>
            <TouchableOpacity br100 row center flex bg-bg6={!isDark} activeOpacity={0.8} onPress={() => toggleDarkMode(false)}>
                <Icon name='sun' type='feather' color={isDark ? Colors.text2 : Colors.blue}/>
                <Text marginL-8 text70R gr blue={!isDark} text2={isDark}>Light</Text>
            </TouchableOpacity>
            <TouchableOpacity br100 row center flex bg-bg6={isDark} activeOpacity={0.8} onPress={() => toggleDarkMode(true)}>
                <Icon name='moon' type='feather' color={isDark ? Colors.blue : Colors.text2}/>
                <Text marginL-8 text70R gr blue={isDark} text2={!isDark}>Dark</Text>
            </TouchableOpacity>
        </View>
    ), [isDark]);

    return (

        <DrawerContentScrollView {...props} scrollEnabled={false} removeClippedSubviews renderToHardwareTextureAndroid style={{ backgroundColor: Colors.bg4, borderTopRightRadius: 30, borderBottomRightRadius: 30 }}>
            <View useSafeArea flex height={ch}>
                <View flex paddingH-20>
                    <View row centerV spread>
                        <Logo size={56}/>
                        <Avatar 
                        animate 
                        size={60} 
                        backgroundColor={Colors.bg2} 
                        onPress={() => navigation.navigate('More')} 
                        source={{ uri: auth.currentUser.photoURL || '' }} 
                        name={auth.currentUser.displayName || auth.currentUser.email}/>
                    </View>
                    <View flex marginT-26>
                        {menu}
                        <View marginV-26 br60 marginL-8 bg-line2 width='95%' height={2}/>
                        <View paddingL-6 row centerV width='100%' height={48}>
                            <Icon name="folder-minus" type="feather"/>
                            <Text marginL-16 text70 text2 gr>Folders</Text>
                        </View>
                        {folders.length === 0 ? folderEmpty : folderview}
                    </View>
                    {themeMenu}
                </View>
            </View>
        </DrawerContentScrollView>

    );

};

export default React.memo(DrawerContent);