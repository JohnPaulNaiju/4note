import React from "react";
import { Icon, Logo } from "../components";
import { LinearGradient } from 'expo-linear-gradient';
import { DeviceEventEmitter, Platform } from "react-native";
import MaskedView from '@react-native-masked-view/masked-view';
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { Colors, TouchableOpacity, View, Text } from 'react-native-ui-lib';
import { TransitionPresets, CardStyleInterpolators } from '@react-navigation/stack';
import { useAnimatedStyle, useSharedValue, withTiming, withRepeat } from 'react-native-reanimated';

const isAndroid = Platform.OS === 'android';

const triggerInfo = () => DeviceEventEmitter.emit('noteInfo');
const triggerDownload = () => DeviceEventEmitter.emit('noteDownload');
const triggerAIChat = () => DeviceEventEmitter.emit('aiChat');

const ThinkingAnimation = ({text}) => {

    const translateX = useSharedValue(-100);

    React.useEffect(() => {
        translateX.value = withRepeat(
            withTiming(150, { duration: 2500 }),
            -1,
            false
        );
        return () => {
            translateX.value = 0;
        };
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    return (

        <MaskedView maskElement={
            <View center width={100} height={40}>
                <Text text70R white>{text}</Text>
            </View>
        }>
           <View bg-text2 width={100} height={40}>
                <View reanimated br100 bg-white width={40} height={40} overflow='hidden' style={animatedStyle}>
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[Colors.text2, Colors.grey50, Colors.grey50, Colors.text2, Colors.text2]} style={{ flex: 1 }}/>
                </View>
           </View>
        </MaskedView>

    );

};

export default () => {

    const navigation = useNavigation();

    const main = {
        gestureEnabled: false, 
        animationEnabled: true, 
        headerTitleAlign: 'center', 
        ...TransitionPresets.SlideFromRightIOS, 
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS, 
        headerStyle: { 
            elevation: 0, 
            shadowOpacity: 0, 
            borderBottomWidth: 0, 
            backgroundColor: Colors.bg2, 
        }, 
    };

    const left = {
        headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <View center flex width={60}>
                    <Icon name='chevron-back' type='ion'/>
                </View>
            </TouchableOpacity>
        ), 
    };

    const home = {
        ...main, 
        headerTitle: () => <Text text1 text50R gs>4note</Text>, 
        headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}>
                <View center flex width={60}>
                    <Icon name='menu' type='feather'/>
                </View>
            </TouchableOpacity>
        ), 
        headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('CreateNote')}>
                <View center flex width={70}>
                    <Icon name='edit-3' type='feather'/>
                </View>
            </TouchableOpacity>
        ), 
    };

    const ai = {
        ...main, 
        headerTitle: () => null, 
        headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}>
                <View center flex width={60}>
                    <Icon name='menu' type='feather'/>
                </View>
            </TouchableOpacity>
        ), 
        headerRight: () => null, 
    };

    const createFolder = {
        ...main, 
        headerShadowVisible: false, 
        headerStyle: { backgroundColor: Colors.bg2 }, 
        ...TransitionPresets?.[isAndroid ? 'BottomSheetAndroid' : 'ModalPresentationIOS'], 
        cardStyleInterpolator: isAndroid ? CardStyleInterpolators.forBottomSheetAndroid : CardStyleInterpolators.forModalPresentationIOS, 
        headerTitle: () => null, 
        headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <View center flex width={60}>
                    <Icon name='chevrons-down' type='feather'/>
                </View>
            </TouchableOpacity>
        ), 
        headerRight: () => null, 
    };

    const allFolders = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Folder manager</Text>, 
        headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('CreateFolder')}>
                <View center flex width={60}>
                    <Icon name='plus' type='feather'/>
                </View>
            </TouchableOpacity>
        ), 
    };

    const noteEditor = ({ route }) => {

        const isDisabled = route.params?.isDisabled;

        return {
            ...main, 
            headerLeft: () => (
                <TouchableOpacity onPress={() => {
                    if(route?.params?.isNew) navigation.navigate('Home');
                    else navigation.goBack();
                }}>
                    <View center flex width={60}>
                        <Icon name='chevron-back' type='ion'/>
                    </View>
                </TouchableOpacity>
            ), 
            headerTitle: () => null, 
            headerRight: () => {
                if(isDisabled) {
                    return (
                        <View row centerV flex width={120}>
                            <TouchableOpacity onPress={triggerAIChat}>
                                <View center flex width={60}>
                                    <Logo size={28} sparkle/>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={triggerDownload}>
                                <View center flex width={60}>
                                    <Icon name='download' type='feather'/>
                                </View>
                            </TouchableOpacity>
                        </View>
                    );
                }else{
                    return (
                        <View row centerV flex width={180}>
                            <TouchableOpacity onPress={triggerAIChat}>
                                <View center flex width={60}>
                                    <Logo size={28} sparkle/>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={triggerDownload}>
                                <View center flex width={60}>
                                    <Icon name='download' type='feather'/>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={triggerInfo}>
                                <View center flex width={60}>
                                    <Icon name='info' type='feather'/>
                                </View>
                            </TouchableOpacity>
                        </View>
                    );
                }
            },

        };
    };

    const more = {
        ...main, 
        ...left, 
        gestureEnabled: false, 
        headerTitle: () => <Text text1 text60R gs>More</Text>, 
        headerRight: () => null, 
    };

    const recharge = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Recharge</Text>, 
        headerRight: () => null, 
    };

    const media = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Media</Text>, 
        headerRight: () => null, 
    };

    const devices = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Linked Devices</Text>, 
        headerRight: () => null, 
    };

    const errors = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Failed note generations</Text>, 
        headerRight: () => null, 
    };

    const support = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Chat with us</Text>, 
        headerRight: () => null, 
    };

    const picker = {
        ...main, 
        headerShown: false, 
        ...TransitionPresets?.[isAndroid ? 'SlideFromRightIOS' : 'ModalPresentationIOS'], 
    };

    const folderContent = ({ route }) => ({
        ...main, 
        ...left, 
        headerTitle: () => (
            <View row center>
                <Text text1 text60R gs numberOfLines={1}>{route?.params?.name}</Text>
                <View br100 marginL-12 width={10} height={10} backgroundColor={route?.params?.color}/>
            </View>
        ), 
        headerRight: () => null, 
    });

    const noteInfo = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Note info</Text>, 
        headerRight: () => null, 
    };

    const profile = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Profile</Text>, 
        headerRight: () => null, 
    };

    const lecture = ({ route }) => ({
        ...main, 
        ...left, 
        headerTitle: () => route?.params?.text ? <ThinkingAnimation text={route?.params?.text}/> : <Text text1 text60R gs>Listen to Audio</Text>, 
        headerRight: () => null, 
    });

    const mindMap = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Mind Map</Text>, 
        headerRight: () => null, 
    };

    const SharedWithMe = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Shared With Me</Text>, 
        headerRight: () => null, 
    };

    const SharedWithOthers = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Shared With Others</Text>, 
        headerRight: () => null, 
    };

    const plan = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Study Plans</Text>, 
        headerRight: () => null, 
    };

    const schedule = {
        ...main, 
        ...left, 
        headerTitle: () => <Text text1 text60R gs>Daily Schedule</Text>, 
        headerRight: () => null, 
    };

    return { 
        main, 
        home, 
        createFolder, 
        allFolders, 
        noteEditor, 
        more, 
        recharge, 
        plan, 
        schedule, 
        media, devices, errors, support, picker, folderContent, noteInfo, ai, profile, lecture, mindMap, SharedWithMe, SharedWithOthers };

};