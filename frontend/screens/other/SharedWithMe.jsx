import React from 'react';
import { auth, db } from '../../utils';
import { View, Colors } from 'react-native-ui-lib';
import { NoteBox, StateScreen } from '../../components';
import { FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function SharedWithMe() {

    const navigation = useNavigation();

    const [notes, setNotes] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const fetchSharedNotes = async () => {
        try {
            setLoading(true);
            const userEmail = auth.currentUser.email;
            const notesQuery = query(
                collection(db, 'notes'),
                where('viewers', 'array-contains', userEmail),
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
                    };
                });

                setNotes(sharedNotes);

            }
        }catch (error){
            console.error('Error fetching shared notes:', error);
        }finally{
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
    }, [navigation]);

    const renderItem = React.useCallback(({item}) => (
        <NoteBox onPress={() => navigation.navigate('NoteEditor', { ...item })} {...item}/>
    ), []);

    const emptyState = React.useMemo(() => (
        <StateScreen
        icon="share"
        type="material-community"
        title="No shared notes"
        subtitle="Notes shared with you will appear here"/>
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
            }/>
        </View>
    );

};