import React from 'react';
import HomeScreen from './HomeScreen';
import useScreenOptions from './useScreenOptions';
import { createStackNavigator } from '@react-navigation/stack';
import { 
    CreateFolder, 
    AllFolders, 
    NoteEditor, 
    More, Recharge, 
    Media, Devices, Errors, Support, 
    MediaPicker, 
    EmojiPicker, FolderContent, 
    CreateNote, NoteInfo, FolderSelect, Lecture, 
    MindMap, SharedWithMe, SharedWithOthers,
    StudyPlan, StudyPlanDetails
} from '../screens';

const Stack = createStackNavigator();

export default function ScreenStack() {

    const screenOptions = useScreenOptions();

    return (

        <Stack.Navigator initialRouteName="Home" screenOptions={screenOptions.main}>
            <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }}/>
            <Stack.Screen name="CreateNote" component={CreateNote} options={screenOptions.createFolder}/>
            <Stack.Screen name="CreateFolder" component={CreateFolder} options={screenOptions.createFolder}/>
            <Stack.Screen name="AllFolders" component={AllFolders} options={screenOptions.allFolders}/>
            <Stack.Screen name="NoteEditor" component={NoteEditor} options={screenOptions.noteEditor}/>
            <Stack.Screen name="More" component={More} options={screenOptions.more}/>
            <Stack.Screen name="Recharge" component={Recharge} options={screenOptions.recharge}/>
            <Stack.Screen name="Media" component={Media} options={screenOptions.media}/>
            <Stack.Screen name="Devices" component={Devices} options={screenOptions.devices}/>
            <Stack.Screen name="Errors" component={Errors} options={screenOptions.errors}/>
            <Stack.Screen name="Support" component={Support} options={screenOptions.support}/>
            <Stack.Screen name="FolderSelect" component={FolderSelect} options={screenOptions.picker}/>
            <Stack.Screen name="MediaPicker" component={MediaPicker} options={screenOptions.picker}/>
            <Stack.Screen name="EmojiPicker" component={EmojiPicker} options={screenOptions.picker}/>
            <Stack.Screen name="FolderContent" component={FolderContent} options={screenOptions.folderContent}/>
            <Stack.Screen name="NoteInfo" component={NoteInfo} options={screenOptions.noteInfo}/>
            <Stack.Screen name="Lecture" component={Lecture} options={screenOptions.lecture}/>
            <Stack.Screen name="MindMap" component={MindMap} options={screenOptions.mindMap}/>
            <Stack.Screen name="SharedWithMe" component={SharedWithMe} options={screenOptions.SharedWithMe}/>
            <Stack.Screen name="SharedWithOthers" component={SharedWithOthers} options={screenOptions.SharedWithOthers}/>
            <Stack.Screen name="StudyPlan" component={StudyPlan} options={screenOptions.plan}/>
            <Stack.Screen name="StudyPlanDetails" component={StudyPlanDetails} options={screenOptions.schedule}/>
        </Stack.Navigator>

    );

};