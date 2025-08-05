import React from 'react';
import { createFolder } from '../../functions';
import { Icon, Input } from '../../components';
import { useNavigation } from '@react-navigation/native';
import { View, Text, Colors, TouchableOpacity } from 'react-native-ui-lib';

export default function CreateFolder() {

    const fewNames = ['School', 'Work', 'StartUp', 'Famliy', 'Personal', 'Important'];
    const fewColors = ['#DF3C3E', '#F56950', '#F5B917', '#B1C734', '#66B134', '#65CED4'];

    const navigation = useNavigation();

    const value = React.useRef('');

    const [nameIndex, setNameIndex] = React.useState(null);
    const [colorIndex, setColorIndex] = React.useState(null);

    const selectName = (i1, i2) => {
        if(i1 === i2) setNameIndex(null);
        else setNameIndex(i1);
    };

    const selectColor = (i1, i2) => {
        if(i1 === i2) setColorIndex(null);
        else setColorIndex(i1);
    };

    const create = async(nIndex, cIndex) => {
        if(nIndex === null){
            if(value.current.trim().length === 0) return;
            else{
                createFolder(value.current.trim(), fewColors[cIndex] || null);
                navigation.goBack();
            }
        }else{
            createFolder(fewNames[nIndex], fewColors[cIndex] || null);
            navigation.goBack();
        }
    };

    const examples = React.useMemo(() => (
        <View paddingH-12 row style={{ flexWrap: 'wrap' }}>
            {fewNames.map((obj, i) => {
                const active = nameIndex === i;
                return (
                    <TouchableOpacity activeOpacity={0.5} marginL-8 marginT-8 key={i} onPress={() => selectName(i, nameIndex)}>
                        <View br100 row centerV paddingH-16 height={35} backgroundColor={active ? Colors.blue+'0A' : Colors.bg2} style={{ borderWidth: 1, borderColor: active ? Colors.blue : Colors.line }}>
                            {active ? <Icon name='check'/> : null}
                            <Text marginL-6={active} text70R gr color={active ? Colors.blue : Colors.text2}>{obj}</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    ), [nameIndex]);

    const colors = React.useMemo(() => (
        <View paddingH-12 row centerV>
            {fewColors.map((obj, i) => {
                const active = colorIndex === i;
                return (
                    <TouchableOpacity activeOpacity={0.5} marginL-8 key={i} onPress={() => selectColor(i, colorIndex)}>
                        <View br100 center width={32} height={32} backgroundColor={obj}>
                            {active ? <Icon name='check' color={Colors.white}/> : null}
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    ), [colorIndex]);

    return (

        <View useSafeArea bg-bg2 flex>
            <Text marginL-22 marginT-6 marginB-16 gs text60R text1>Create new folder</Text>
            <Input placeholder='Enter name for folder' bgColor={Colors.bg2} style={{ borderWidth: 1, borderColor: Colors.line }} onChange={e => value.current = e}/>
            <Text marginL-22 marginT-26 marginB-16 gs text60R text1>Ready name for folders</Text>
            {examples}
            <Text marginL-22 marginT-26 marginB-16 gs text60R text1>Color folders</Text>
            {colors}
            <View centerH width='100%'>
                <TouchableOpacity marginT-46 center br100 activeOpacity={0.5} 
                onPress={() => create(nameIndex, colorIndex)}
                style={{ width: '90%', height: 36, borderWidth: 1, borderColor: Colors.blue }}>
                    <Text blue text70 gs>Create folder</Text>
                </TouchableOpacity>
            </View>
        </View>

    );

};