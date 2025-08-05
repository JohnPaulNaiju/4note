import React from 'react';
import ScreenStack from './ScreenStack';
import DrawerContent from './DrawerContent';
import { Colors } from 'react-native-ui-lib';
import { useFolderStore, useNoteStore } from '../store';
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

export default function Main() {

    const screenOptions = {
        headerShown: false, 
        drawerType: 'front', 
        overlayColor: Colors.overlay, 
        drawerStyle: { 
            flex: 1, 
            width: '75%', 
            borderTopRightRadius: 30, 
            borderBottomRightRadius: 30, 
            backgroundColor: Colors.bg4, 
        } 
    };
    
    const options = { 
        sceneContainerStyle: { 
            backgroundColor: Colors.bg1 
        } 
    };

    const getFolders = useFolderStore((state) => state.getFolders);
    const getNotes = useNoteStore((state) => state.getNotes);

    React.useEffect(() => {
        getFolders();
        getNotes();
    }, []);

    return (

        <Drawer.Navigator initialRouteName='Screens' screenOptions={screenOptions} drawerContent={(props) => <DrawerContent {...props}/>}>
            <Drawer.Screen name="Screens" component={ScreenStack} options={options}/>
        </Drawer.Navigator>

    );

};