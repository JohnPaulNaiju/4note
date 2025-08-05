import React from 'react';
import { Icon } from '../components';
import { Colors } from 'react-native-ui-lib';
import { Home, AI, Learning } from '../screens';
import useScreenOptions from './useScreenOptions';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

export default function HomeScreen() {

    const screenOptions = useScreenOptions();

    const tabOptions = ({route}) => ({
        tabBarStyle: { 
            borderTopWidth: 0, 
            backgroundColor: Colors.bg2, 
            elevation: 0, 
            shadowOpacity: 0, 
        },
        tabBarHideOnKeyboard: true, 
        tabBarActiveTintColor: Colors.blue, 
        tabBarInactiveTintColor:Colors.icon,
        tabBarLabel : () => null,
        tabBarIcon: ({ focused, color, size }) => {
            focused ? size = 30 : size = 24;
            switch(route.name){
                case 'Home':
                    return <Icon name='house' type='font6' size={size} color={color}/>;
                case 'Search':
                    return <Icon name='search' type='font-awesome' size={size} color={color}/>;
                case 'AI':
                    return <Icon name='sparkles' type='ion' size={size} color={color}/>;
                case 'Learning':
                    return <Icon name='graduation-cap' type='font-awesome' size={size} color={color}/>;
                default:
                    return null;
            }
        },
    });

    return (

        <Tab.Navigator initialRouteName='Home' screenOptions={tabOptions}>
            <Tab.Screen name="Home" component={Home} options={screenOptions.home}/>
            <Tab.Screen name="AI" component={AI} options={screenOptions.ai}/>
            <Tab.Screen name="Learning" component={Learning} options={screenOptions.home}/>
        </Tab.Navigator>

    );

};