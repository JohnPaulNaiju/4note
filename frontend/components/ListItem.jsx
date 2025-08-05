import React from 'react';
import Icon from './Icon';
import { View, Text, Avatar, TouchableOpacity, Colors } from 'react-native-ui-lib';

const ListItem = ({icon, avatar, title, subtitle, right, type, color, size, onPress, onLongPress, border, ...rest}) => {

    const iconview = React.useMemo(() => (
        icon?
        <View center width={60} height={52}>
            <Icon name={icon} type={type} color={color} size={size}/>
        </View>:null
    ), [icon]);

    const avatarview = React.useMemo(() => (
        avatar?
        <View center width={60} height={52}>
            <Avatar source={avatar} size={size}/>
        </View>:null
    ), [avatar]);

    const textview = React.useMemo(() => (
        <View centerV flex marginR-14>
            <Text text1 text70R gs color={color?color:null} numberOfLines={1}>{title}</Text>
            { subtitle ? <Text text2 text80R gr numberOfLines={2}>{subtitle}</Text> : null}
        </View>
    ), [title, subtitle]);

    const rightview = React.useMemo(() => right?right:null, [right]);

    return (

        <TouchableOpacity activeOpacity={0.5} onPress={onPress} onLongPress={onLongPress} {...rest}>
            <View row centerV width='100%' minHeight={52} style={{ borderBottomWidth: border ? 1.5 : 0, borderBottomColor: Colors.bg2 }}>
                {avatarview}
                {iconview}
                {textview}
                {rightview}
            </View>
        </TouchableOpacity>

    );

};

export default React.memo(ListItem);