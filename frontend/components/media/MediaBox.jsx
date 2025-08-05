import React from 'react';
import ImageBox from './ImageBox';
import VideoBox from './VideoBox';

const MediaBox = ({type, uri, width, bgColor, brColor, onPress}) => {

    if(type === 'photo') return <ImageBox uri={uri} width={width} bgColor={bgColor} brColor={brColor} onPress={onPress}/>;
    else if(type === 'video') return <VideoBox uri={uri} width={width} bgColor={bgColor} brColor={brColor} onPress={onPress}/>;
    else return null;

};

export default React.memo(MediaBox);