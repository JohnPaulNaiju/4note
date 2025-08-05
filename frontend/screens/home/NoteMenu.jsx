import React from 'react';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';
import { Icon } from '../../components';
import { Dimensions } from 'react-native';
import { useNoteStore2 } from '../../store';
import { pinNote, delNote } from '../../functions';
import { View, Colors, TouchableOpacity, Text } from 'react-native-ui-lib';
import { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const diameter= 200;
const childDiameter = 60;

const radius = diameter/2;
const childRadius = childDiameter/2;

const angles = [0, Math.PI / 3, 2 * Math.PI / 3];

const { width, height } = Dimensions.get('window');

const width1 = width*0.75;

const getPosition = (angle) => {
    return {
        right: radius + (radius - childRadius) * Math.cos(angle) - childRadius,
        bottom: radius + (radius - childRadius) * Math.sin(angle) - childRadius,
    };
};

const vibrate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
};

const NoteMenu = React.forwardRef((props, ref) => {

    const { navigation } = props;

    const noteParams = React.useRef({
        id: null, 
        pinned: null, 
    });

    const [isOpen, setIsOpen] = React.useState(false);
    const [coords, setCoords] = React.useState([0, 0]);

    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    const style1 = useAnimatedStyle(() => ({ opacity: opacity.value, zIndex: 999 }));
    const style2 = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }]}));

    const updateNote = useNoteStore2((state) => state.updateNote);
    const deleteNote = useNoteStore2((state) => state.deleteNote);

    const setParams = (id, pinned) => {
        noteParams.current.id = id;
        noteParams.current.pinned = pinned;
    };

    const getParams = () => {
        return { id: noteParams.current.id, pinned: noteParams.current.pinned };
    };

    const open = (id, pinned, x, y) => {
        setParams(id, pinned);
        setCoords([x - 100, y - 100]);
        setTimeout(() => {
            setIsOpen(2);
            opacity.value = withTiming(1, { duration: 300 });
            scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.bounce) }, () => {
                runOnJS(vibrate)();
            });
        }, 50);
    };

    const onClose = () => {
        setParams(null, null);
        setIsOpen(0);
    };

    const close = () => {
        opacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(onClose)();
        });
    };

    const onPin = () => {
        close();
        const { id, pinned } = getParams();
        pinNote(id, pinned);
        updateNote(id, { pinned: !pinned });
    };

    const navToInfo = () => {
        close();
        const { id } = getParams();
        navigation.navigate('NoteInfo', { id: id });
    };

    const onDelPress = () => {
        const { id } = getParams();
        delNote(id);
        deleteNote(id);
        onClose();
    };

    const afterBelow = (id, pinned) => {
        setIsOpen(0);
        setTimeout(() => {
            setIsOpen(1);
            setParams(id, pinned);
        }, 300);
    };

    const openAlert = () => {
        const { id, pinned } = getParams();
        opacity.value = withTiming(0, { duration: 100 });
        scale.value = withTiming(0, { duration: 100 }, () => {
            runOnJS(afterBelow)(id, pinned);
        });
    };

    React.useImperativeHandle(ref, () => {
        return {
            open(id, pinned, x, y){ open(id, pinned, x, y); },
            close(){ close(); }
        };
    }, []);

    if(isOpen === 1){

        return (

            <View center width={width} height='100%' bg-overlay absH absV>
                <View br50 bg-bg1 centerH paddingT-18 width={width1}>
                    <View center width={width*0.8}>
                        <Text text1 text70R gs marginH-16>Delete note</Text>
                        <Text text1 text80R gr marginH-16>Permanently delete this note</Text>
                    </View>
                    <View marginT-12 row centerV width={width1} style={{ borderTopWidth: 1, borderColor: Colors.line }}>
                        <TouchableOpacity flex center activeOpacity={0.5} style={{ height: 46 }} onPress={onClose}>
                            <Text blue text70R gs>No</Text>
                        </TouchableOpacity>
                        <View bg-line width={1} height={46}/>
                        <TouchableOpacity flex center activeOpacity={0.5} style={{ height: 46 }} onPress={onDelPress}>
                            <Text red text70R gr>Yes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

        );

    }

    else if(isOpen === 2){

        const options = [
            { angle: angles[0], icon: 'info', type: 'feather', color: Colors.blue, onPress: navToInfo }, 
            { angle: angles[1], icon: noteParams.current.pinned ? 'pin-outline' : 'pin', type: 'material-community', color: Colors.blue, onPress: onPin }, 
            { angle: angles[2], icon: 'trash-2', type: 'feather', color: Colors.red, onPress: openAlert }, 
        ];

        return (

            <Modal transparent statusBarTranslucent visible={isOpen===2} style={{ margin: 0 }}>
                <View reanimated flex backgroundColor={Colors.overlay} style={style1} width={width} height={height} onTouchEnd={close}>
                    <View reanimated br100 width={diameter} height={diameter} style={[style2, { left: coords[0], top: coords[1] }]}>
                        {options.map((item, index) => (
                            <View key={index} br100 bg-bg1 width={childDiameter} height={childDiameter} 
                            style={[getPosition(item.angle), { borderWidth: 1, borderColor: Colors.line, position: 'absolute', zIndex: 999 }]}>
                                <TouchableOpacity flex center activeOpacity={0.8} onPress={item.onPress}>
                                    <Icon name={item.icon} type={item.type} color={item.color}/>
                                </TouchableOpacity>
                            </View>
                        ))}
                        <View br100 bg-bg3 width={childDiameter} height={childDiameter} 
                        style={{ borderWidth: 1, borderColor: Colors.line, marginTop: 75, marginLeft: 75, zIndex: 999 }}>
                            <TouchableOpacity flex center activeOpacity={0.8} onPress={close}>
                                <Icon name='closecircleo' type='ant'/>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        );

    }

    return null;

});

export default React.memo(NoteMenu);