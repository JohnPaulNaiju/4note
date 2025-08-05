import React from 'react';
import { useNoteStore3 } from '../../store';
import Toast from 'react-native-toast-message';
import { getDate, regex } from '../../functions';
import { useShallow } from 'zustand/react/shallow';
import { useRoute } from '@react-navigation/native';
import { KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Icon, Input, ListItem, StateScreen, Alert } from '../../components';
import { View, Text, Colors, Switch, TouchableOpacity } from 'react-native-ui-lib';

const isAndroid = Platform.OS === 'android';

export default function NoteInfo() {

    const route = useRoute();

    const { id } = route.params;

    const email = React.useRef('');
    const inpRef = React.useRef(null);

    const [open, setOpen] = React.useState(0);
    const [searchTerm, setSearchTerm] = React.useState('');

    const metaData = useNoteStore3(useShallow((state) => state.metaData));
    const viewers = useNoteStore3(useShallow((state) => state.viewers));
    const loading = useNoteStore3(useShallow((state) => state.loading));

    const getMetaData = useNoteStore3((state) => state.getMetaData);
    const addViewers = useNoteStore3((state) => state.addViewers);
    const deleteViewer = useNoteStore3((state) => state.deleteViewer);
    const clearAll = useNoteStore3((state) => state.clearAll);
    const toggleSharing = useNoteStore3((state) => state.toggleSharing);

    const filteredViewers = React.useMemo(() => viewers.filter(item => item.toLowerCase().includes(searchTerm.trim().toLowerCase())), [searchTerm, viewers]);

    const onAdd = () => {
        if(email.current.trim().length === 0) return;
        if(regex.email.test(email.current.trim())){ 
            addViewers(id, [email.current.trim()]);
        }else Toast.show({ text1: 'Invalid email' });
    };

    const handleClose = () => {
        setOpen(0);
        email.current = '';
    };

    const clearInp = () => {
        email.current = '';
        inpRef.current?.clear();
        setSearchTerm('');
    };

    const onDelPress = () => {
        deleteViewer(id, email.current);
        handleClose();
    };

    const clearAllViewers = () => {
        clearAll(id);
        handleClose();
    };

    const handleChange = React.useCallback((value) => {
        setSearchTerm(value);
        email.current = value;
    }, [setSearchTerm]);

    React.useEffect(() => {
        getMetaData(id);
    }, []);

    const renderItem = React.useCallback(({item}) => (
        <ListItem title={item} right={
            <View center width={50}>
                <TouchableOpacity flex center activeOpacity={0.5} onPress={() => {
                    setOpen(1);
                    email.current = item;
                }}>
                    <Icon name='trash-2' type='feather' color={Colors.icon}/>
                </TouchableOpacity>
            </View>
        }/>
    ), []);

    const header = React.useMemo(() => (
        <View marginV-26 centerH width='100%'>
            <View br60 bg-bg1 padding-16 width='95%' style={Colors.shadow}>
                <Text text60R gs text1>{metaData?.title || 'Untitled'}</Text>
                <Text text70R gr text2>{`Created by You on ${getDate(metaData?.createdAt)}`}</Text>
            </View>
            <View marginT-16 br60 row centerV spread bg-bg1 padding-16 width='95%' style={Colors.shadow}>
                <View>
                    <Text text60R gs text1>Share note</Text>
                    <Text text70R gr text2>You can add viewers upto 100 users</Text>
                    <Text text80R gs blue>{viewers.length}/100 viewers</Text>
                </View>
                <View center width={70}>
                    <Switch value={metaData?.sharing} offColor={Colors.bg2} onColor={Colors.blue} thumbColor={Colors.white} onValueChange={() => toggleSharing(id)}/>
                </View>
            </View>
            {viewers.length === 0 ? null : 
            <TouchableOpacity marginT-16 activeOpacity={0.5} style={{ width: '95%' }} onPress={() => setOpen(2)}>
                <View br60 bg-bg1 padding-16 style={Colors.shadow}>
                    <Text text70R gs red>Delete all viewers</Text>
                    <Text text80R gr text2>Alternatively show can just turn off sharing</Text>
                </View>
            </TouchableOpacity>}
        </View>
    ), [metaData, viewers]);

    const right = React.useMemo(() => (
        <View row centerV>
            <TouchableOpacity activeOpacity={0.5} onPress={clearInp}>
                <View center height={50} width={30}>
                    <Icon name='closecircleo' type='ant' color={searchTerm.length > 0 ? Colors.text1 : Colors.icon}/>
                </View>
            </TouchableOpacity>
            <TouchableOpacity disabled={searchTerm.length === 0} activeOpacity={0.5} onPress={onAdd}>
                <View center height={50} width={60}>
                    <Icon name='plus' type='feather' color={searchTerm.length > 0 ? Colors.text1 : Colors.icon}/>
                </View>
            </TouchableOpacity>
        </View>
    ), [searchTerm]);

    const empty = React.useMemo(() => (
        <View br60 bg-bg1 padding-16 center width='95%' style={Colors.shadow}>
            <Text text1 text70R gs>No viewers</Text>
        </View>
    ), []);

    if(loading) return <StateScreen loader/>;

    return (

        <KeyboardAvoidingView behavior={isAndroid ? null : 'padding'} keyboardVerticalOffset={120} style={{ flex: 1 }}>
            <View flex bg-bg2 useSafeArea centerH>
                {header} 
                {filteredViewers.length === 0 ? empty : 
                <View br60 bg-bg1 padding-16 width='95%' style={[Colors.shadow, { overflow: 'hidden' }]}>
                    <FlatList 
                    data={filteredViewers} 
                    renderItem={renderItem} 
                    keyExtractor={(_, index) => index} 
                    showsVerticalScrollIndicator={false} 
                    ItemSeparatorComponent={<View bg-bg1 height={1.5} width='100%'/>}/>
                </View>}
                <View flex/>
                <Input 
                ref={inpRef} 
                right={right} 
                bgColor={Colors.bg2} 
                onChange={handleChange} 
                placeholder='Enter email address' 
                style={{ borderWidth: 1, borderColor: Colors.line }}/>
                {open === 1 ? 
                <Alert 
                visible={open === 1}
                title='Delete viewer' 
                subtitle='Delete this viewer from viewing your note'
                text1='No'
                text2='Yes'
                close={handleClose} 
                text2Press={onDelPress} 
                text1Press={handleClose}/> : null}
                {open === 2 ? 
                <Alert 
                visible={open === 2}
                title='Delete all viewer' 
                subtitle='Delete all viewers from viewing your note. Alternatively show can just turn off sharing.'
                text1='No'
                text2='Yes'
                close={handleClose} 
                text1Press={handleClose}
                text2Press={clearAllViewers}/> : null}
            </View>
        </KeyboardAvoidingView>

    );

};