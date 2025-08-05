import React from 'react';
import { auth, db } from '../../utils';
import { getDate, timeAgo } from '../../functions';
import { FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon, NoteBox, StateScreen } from '../../components';
import { View, Text, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function SharedWithOthers() {

    const navigation = useNavigation();

    const [notes, setNotes] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const fetchSharedNotes = async () => {
        try {
            setLoading(true);

            const notesQuery = query(
                collection(db, 'notes'),
                where('author', '==', auth.currentUser.uid),
                where('sharing', '==', true),
                orderBy('timestamp', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(notesQuery).catch(console.log);

            if (snapshot?.empty) {
                setNotes([]);
            } else {
                const sharedNotes = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: getDate(data.createdAt),
                        timestamp: getDate(data.timestamp),
                        timeAgo: timeAgo(data.timestamp),
                        viewerCount: data.viewers ? data.viewers.length : 0
                    };
                });
                
                setNotes(sharedNotes);
            }
        } catch (error) {
            console.error('Error fetching shared notes:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchSharedNotes();
    }, []);

    React.useEffect(() => {
        fetchSharedNotes();
        const unsubscribe = navigation.addListener('focus', () => {
            fetchSharedNotes();
        });

        return unsubscribe;
    }, [navigation]);

    const renderItem = React.useCallback(({item}) => (
        <View marginB-16>
            <NoteBox onPress={() => navigation.navigate('NoteEditor', { ...item })} {...item}/>
            <View row centerV marginT-4 paddingH-8>
                <Icon name='users' type='feather' size={14} color={Colors.text2} />
                <Text text90 text2 marginL-4>Shared with {item.viewerCount} {item.viewerCount === 1 ? 'person' : 'people'}</Text>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('NoteInfo', { id: item.id })}
                    style={{ marginLeft: 'auto' }}
                >
                    <Text text90 blue>Manage</Text>
                </TouchableOpacity>
            </View>
        </View>
    ), []);

    const emptyState = React.useMemo(() => (
        <StateScreen
            icon="share-all-outline"
            type="material-community"
            title="No shared notes"
            subtitle="Notes you've shared with others will appear here"
        />
    ), []);

    if (loading && !refreshing) return <StateScreen loader title="Loading shared notes" />;

    return (
        <View flex bg-bg2 padding-16 useSafeArea>
            <FlatList
                data={notes}
                renderItem={renderItem}
                ListEmptyComponent={emptyState}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) => index}
                contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.text2}
                    />
                }
            />
        </View>
    );

};
