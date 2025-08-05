//refer https://icons.expo.fyi/Index for available icons
// expo guide: https://docs.expo.dev/guides/icons/

import React from 'react';
import { Colors } from 'react-native-ui-lib';
import { Feather, FontAwesome5, FontAwesome, MaterialCommunityIcons, Foundation, Ionicons, Fontisto, Entypo, AntDesign, Octicons, SimpleLineIcons, MaterialIcons, FontAwesome6 } from '@expo/vector-icons';

const Icon = ({name, type, size = 24, color = Colors.blue}) => {

    switch(type){
        case 'feather':
            return <Feather name={name} color={color} size={size}/>;
        case 'font-awesome':
            return <FontAwesome5 name={name} color={color} size={size}/>;
        case 'font':
            return <FontAwesome name={name} color={color} size={size}/>;
        case 'material-community':
            return <MaterialCommunityIcons name={name} color={color} size={size}/>;
        case 'foundation':
            return <Foundation name={name} color={color} size={size}/>;
        case 'ion':
            return <Ionicons name={name} color={color} size={size}/>;
        case 'fontisto':
            return <Fontisto name={name} color={color} size={size}/>;
        case 'entypo':
            return <Entypo name={name} color={color} size={size}/>;
        case 'ant':
            return <AntDesign name={name} color={color} size={size}/>;
        case 'octicons':
            return <Octicons name={name} color={color} size={size}/>;
        case 'simple':
            return <SimpleLineIcons name={name} color={color} size={size}/>;
        case 'font6':
            return <FontAwesome6 name={name} color={color} size={size}/>;
        default:
            return <MaterialIcons name={name} color={color} size={size}/>;
    };

};

export default React.memo(Icon);