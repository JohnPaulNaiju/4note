import React from 'react';
import { AuthScreen } from '../screens';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

export default function Auth() {

    return (

        <Stack.Navigator initialRouteName="Auth">
            <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false, gestureEnabled: false, animationEnabled: false }}/>
        </Stack.Navigator>

    );

};