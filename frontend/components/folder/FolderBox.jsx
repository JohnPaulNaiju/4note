import React from 'react';
import Type1 from './Type1';
import Type2 from './Type2';

const FolderBox = ({type, id, name, notes, color, onPress, onDelPress}) => {

    switch(type){
        case 0:
            return <Type1 id={id} name={name} onPress={onPress}/>;
        case 1:
            return <Type2 id={id} name={name} notes={notes} color={color} onPress={onPress} onDelPress={onDelPress}/>;
        default:
            return null;
    }

};

export default React.memo(FolderBox);