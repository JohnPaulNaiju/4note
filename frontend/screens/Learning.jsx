import React from 'react';
import { auth, db } from '../utils';
import { ScrollView, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { doc, getDoc } from 'firebase/firestore';
import { Icon, StateScreen } from '../components';
import { useNavigation } from '@react-navigation/native';
import { View, Text, Button, Colors, Card, Chip, TabController } from 'react-native-ui-lib';

const Learning = () => {

    const navigation = useNavigation();

    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [studyPlans, setStudyPlans] = React.useState([]);
    const [knowledgeGaps, setKnowledgeGaps] = React.useState([]);
    const [selectedTab, setSelectedTab] = React.useState(0);

    const loadData = async (isRefreshing = false) => {
        try {
            if (!isRefreshing) {
                setLoading(true);
            }
            await Promise.all([
                loadStudyPlans(),
                analyzeKnowledgeGaps()
            ]);
        } catch (error) {
            console.error('Error loading learning data:', error);
            Toast.show({
                text1: 'Failed to load learning data',
                type: 'error'
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadData(true);
    }, []);
    
    const loadStudyPlans = async () => {
        try {
            const userId = auth.currentUser.uid;
            const studyPlansRef = doc(db, 'users', userId, 'studyPlans', 'plans');
            const studyPlansDoc = await getDoc(studyPlansRef);
            
            if (studyPlansDoc.exists()) {
                setStudyPlans(studyPlansDoc.data().plans || []);
            } else {
                setStudyPlans([]);
            }
        } catch (error) {
            console.error('Error loading study plans:', error);
            setStudyPlans([]);
        }
    };

    const analyzeKnowledgeGaps = async () => {
        try {
            const userId = auth.currentUser.uid;
            const studyPlansRef = doc(db, 'users', userId, 'studyPlans', 'plans');
            const studyPlansDoc = await getDoc(studyPlansRef);
            
            let gaps = [];
            
            if (studyPlansDoc.exists()) {
                const plans = studyPlansDoc.data().plans || [];
                
                plans.forEach(plan => {
                    plan.days.forEach(day => {
                        if (day.knowledgeGaps && day.knowledgeGaps.length > 0) {
                            day.knowledgeGaps.forEach(gap => {
                                gaps.push({
                                    id: `${plan.id}-${day.day}-${Math.random().toString(36).substr(2, 9)}`,
                                    gap,
                                    subject: plan.subject,
                                    planTitle: plan.title,
                                    day: day.day,
                                    planId: plan.id
                                });
                            });
                        }
                    });
                });
            }
            
            setKnowledgeGaps(gaps);
        } catch (error) {
            console.error('Error analyzing knowledge gaps:', error);
            setKnowledgeGaps([]);
        }
    };
    
    const navigateToStudyPlan = () => {
        navigation.navigate('StudyPlan');
    };
    
    const viewPlanDetails = (plan) => {
        navigation.navigate('StudyPlanDetails', { plan });
    };

    React.useEffect(() => {
        loadData();
    }, []);

    const renderStudyPlanCard = (plan, index) => {
        return (
            <Card key={plan.id || index} marginB-16 padding-16  backgroundColor={Colors.bg1}>
                <View row spread centerV>
                    <Text text60 text1>{plan.title}</Text>
                </View>
                
                <View marginT-8>
                    <View row centerV marginB-8>
                        <Icon name="calendar" type="feather" size={16} color={Colors.icon} marginR-4 />
                        <Text text80 text2 marginL-4>{plan.duration}</Text>
                    </View>
                    
                    <View row centerV marginB-8>
                        <Icon name="book" type="feather" size={16} color={Colors.icon} marginR-4 />
                        <Text text80 text2 marginL-4>{plan.subject}</Text>
                    </View>
                    
                    <Button 
                        label="View Plan"
                        marginT-16
                        size="small"
                        outline
                        outlineColor={Colors.blue}
                        onPress={() => viewPlanDetails(plan)}
                    />
                </View>
            </Card>
        );
    };

    const renderKnowledgeGapCard = (gap, index) => {
        return (
            <Card key={gap.id || index} marginB-16 padding-16  backgroundColor={Colors.bg1}>
                <View row spread centerV>
                    <Chip label={gap.subject} labelStyle={{ color: Colors.white }} 
                    backgroundColor={Colors.blue} containerStyle={{ borderWidth: 0 }} marginB-8 />
                </View>
                
                <Text text70 marginB-8>{gap.gap}</Text>
                
                <View row centerV marginT-8>
                    <Icon name="info-circle" type="font-awesome" size={16} color={Colors.icon} />
                    <Text text80 text2 marginL-4>From {gap.planTitle}, Day {gap.day}</Text>
                </View>
                
                <Button 
                blue
                    label="View Full Plan"
                    marginT-16
                    size="small"
                    link
                    onPress={() => {
                        const plan = studyPlans.find(p => p.id === gap.planId);
                        if (plan) viewPlanDetails(plan);
                    }}
                />
            </Card>
        );
    };

    const renderEmptyState = () => {
        return (
            <StateScreen
                title="No Study Plans Yet"
                subtitle="Create your first AI-generated study plan to optimize your learning"
                label="Create Plan"
                onPress={navigateToStudyPlan}
            />
        );
    };

    if (loading) return <StateScreen loader={true} />;

    return (
        <View flex bg-bg2>
            <View row spread centerV paddingH-16 paddingV-12>
                <Text text50 blue gb>Learning Path</Text>
                <Button 
                    label="New Plan"
                    size="small"
                    backgroundColor={Colors.blue}
                    onPress={navigateToStudyPlan}
                />
            </View>

            <TabController
            initialIndex={selectedTab}
            onChangeIndex={index => setSelectedTab(index)}
            items={[{label: 'Study Plans'}, {label: 'Knowledge Gaps'}]}>
                <TabController.TabBar 
                labelColor={Colors.text} 
                backgroundColor={Colors.bg2} 
                selectedLabelColor={Colors.blue} 
                indicatorStyle={{ backgroundColor: Colors.blue, height: 2 }}/>
                
                <View flex bg-bg2>
                    <TabController.TabPage index={0}>
                        <ScrollView 
                            contentContainerStyle={{ padding: 16 }}
                            refreshControl={
                                <RefreshControl 
                                    refreshing={refreshing} 
                                    onRefresh={onRefresh}
                                    colors={[Colors.blue]}
                                    tintColor={Colors.blue}
                                />
                            }
                        >
                            {studyPlans.length > 0 ? (
                                studyPlans.map((plan, index) => renderStudyPlanCard(plan, index))
                            ) : renderEmptyState()}
                        </ScrollView>
                    </TabController.TabPage>
                    
                    <TabController.TabPage index={1}>
                        <ScrollView 
                            contentContainerStyle={{ padding: 16 }}
                            refreshControl={
                                <RefreshControl 
                                    refreshing={refreshing} 
                                    onRefresh={onRefresh}
                                    colors={[Colors.blue]}
                                    tintColor={Colors.blue}
                                />
                            }
                        >
                            {knowledgeGaps.length > 0 ? (
                                knowledgeGaps.map((gap, index) => renderKnowledgeGapCard(gap, index))
                            ) : (
                                <StateScreen
                                    title="No Knowledge Gaps Identified"
                                    subtitle="Create a study plan to identify knowledge gaps in your learning"
                                    label="Create Plan"
                                    onPress={navigateToStudyPlan}
                                />
                            )}
                        </ScrollView>
                    </TabController.TabPage>
                </View>
            </TabController>
        </View>

    );

};

export default Learning;