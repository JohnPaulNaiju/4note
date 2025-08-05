import React from 'react';
import { useNoteStore } from '../store';
import Toast from 'react-native-toast-message';
import { Icon, StateScreen } from '../components';
import { auth, db, GEMINI_API_KEY } from '../utils';
import { useNavigation } from '@react-navigation/native';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { View, Text, Button, Colors, Card, Chip, TouchableOpacity, TextField } from 'react-native-ui-lib';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const StudyPlan = () => {

    const navigation = useNavigation();

    const [studyPlans, setStudyPlans] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [generating, setGenerating] = React.useState(false);
    const [selectedSubject, setSelectedSubject] = React.useState('');
    const [days, setDays] = React.useState('7');
    const [showForm, setShowForm] = React.useState(false);

    const notes = useNoteStore((state) => state.notes);

    React.useEffect(() => {
        loadStudyPlans();
    }, []);

    const loadStudyPlans = async (isRefreshing = false) => {
        try {
            if (!isRefreshing) {
                setLoading(true);
            }
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
            Toast.show({
                text1: 'Failed to load study plans',
                type: 'error'
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadStudyPlans(true);
    }, []);

    const getSubjects = () => {
        const subjects = new Set();
        notes.forEach(note => {
            if (note.folder) {
                // Handle case where folder might be an object with id and name
                if (typeof note.folder === 'object' && note.folder.name) {
                    subjects.add(note.folder.name);
                } else if (typeof note.folder === 'string') {
                    subjects.add(note.folder);
                }
            }
        });
        return Array.from(subjects);
    };

    const generateStudyPlan = async () => {
        if (!selectedSubject) {
            Toast.show({
                text1: 'Please select a subject',
                type: 'error'
            });
            return;
        }
        
        try {
            setGenerating(true);

            const subjectNotes = notes.filter(note => {
                if (typeof note.folder === 'object' && note.folder.name) {
                    return note.folder.name === selectedSubject;
                }
                return note.folder === selectedSubject;
            });
            
            if (subjectNotes.length === 0) {
                Toast.show({
                    text1: 'No notes found for this subject',
                    type: 'error'
                });
                setGenerating(false);
                return;
            }

            const notesContent = subjectNotes.map(note => {
                return `Title: ${note.title}\nContent: ${note.content.substring(0, 500)}...`;
            }).join('\n\n');

            const prompt = `
                You are an expert learning strategist. 
                Create a ${days}-day study plan for the subject "${selectedSubject}" based on these notes:
                \n\n${notesContent}\n\n
                The study plan should include:\n
                1. Daily topics to focus on\n
                2. Estimated study time for each topic\n
                3. Practice questions or exercises\n
                4. Knowledge gaps to address\n\nFormat the response as a structured JSON object with the following structure:
                \n{\n  "title": "Study Plan for ${selectedSubject}",
                \n  "duration": "${days} days",
                \n  "createdAt": "${new Date().toISOString()}",
                \n  "subject": "${selectedSubject}",
                \n  "days": [\n    {\n      "day": 1,\n      "topics": [\n        {\n          "title": "Topic title",\n          "duration": "45 minutes",
                \n          "description": "What to study",\n          "resources": ["Note titles or specific sections to review"]\n        }\n      ],
                \n      "practiceQuestions": ["Question 1", "Question 2"],\n      "knowledgeGaps": ["Specific concept to focus on"]\n    }\n  ]\n}"
            `;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Could not parse AI response');
            }
            
            const studyPlan = JSON.parse(jsonMatch[0]);

            const userId = auth.currentUser.uid;
            const studyPlansRef = doc(db, 'users', userId, 'studyPlans', 'plans');
            const studyPlansDoc = await getDoc(studyPlansRef);
            
            let updatedPlans = [];
            if (studyPlansDoc.exists()) {
                updatedPlans = studyPlansDoc.data().plans || [];
            }

            updatedPlans.unshift({
                ...studyPlan,
                id: Date.now().toString(),
                createdAt: Timestamp.now()
            });

            await setDoc(studyPlansRef, { plans: updatedPlans });

            setStudyPlans(updatedPlans);
            setShowForm(false);
            setSelectedSubject('');
            setDays('7');
            
            Toast.show({
                text1: 'Study plan generated successfully',
                type: 'default'
            });
            
        } catch (error) {
            console.error('Error generating study plan:', error);
            Toast.show({
                text1: 'Failed to generate study plan',
                text2: error.message,
                type: 'error'
            });
        } finally {
            setGenerating(false);
        }
    };

    const deletePlan = async (planId) => {
        Toast.show({ text1: 'Please wait...' });
        try {
            const userId = auth.currentUser.uid;
            const studyPlansRef = doc(db, 'users', userId, 'studyPlans', 'plans');
            const studyPlansDoc = await getDoc(studyPlansRef);
            
            if (studyPlansDoc.exists()) {
                const updatedPlans = studyPlansDoc.data().plans.filter(plan => plan.id !== planId);
                await setDoc(studyPlansRef, { plans: updatedPlans });
                setStudyPlans(updatedPlans);
                
                Toast.show({
                    text1: 'Study plan deleted',
                    type: 'default'
                });
            }
        } catch (error) {
            console.error('Error deleting study plan:', error);
            Toast.show({
                text1: 'Failed to delete study plan',
                type: 'error'
            });
        }
    };
    
    const viewPlanDetails = (plan) => {
        navigation.navigate('StudyPlanDetails', { plan });
    };
    
    const renderStudyPlanCard = (plan, index) => {
        return (
            <Card key={plan.id || index} marginB-16 padding-16  backgroundColor={Colors.bg1}>
                <View row spread centerV>
                    <Text text60 text1>{plan.title}</Text>
                    <TouchableOpacity onPress={() => deletePlan(plan.id)}>
                        <Icon name="trash" type="font-awesome" size={18} color={Colors.red30} />
                    </TouchableOpacity>
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
                    
                    <View row marginT-12>
                        <Chip label={`${plan.days.length} Days`} marginR-8 labelStyle={{ color: Colors.white }} 
                        backgroundColor={Colors.blue} containerStyle={{ borderWidth: 0 }}/>
                        <Chip label={`${plan.days.reduce((total, day) => total + day.topics.length, 0)} Topics`} 
                        backgroundColor={Colors.bg1} labelStyle={{ color: Colors.blue }} containerStyle={{ borderColor: Colors.blue }}/>
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

    const renderForm = () => {
        return (
            <Card padding-16 marginB-16 backgroundColor={Colors.bg1}>
                <Text text60 marginB-16>Create New Study Plan</Text>
                
                <Text text70 marginB-8>Select Subject</Text>
                <View marginB-16>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {getSubjects().map((subject, index) => (
                            <Chip
                                key={index}
                                label={subject}
                                marginR-8
                                containerStyle={{ borderColor: selectedSubject === subject ? Colors.blue : Colors.line }}
                                labelStyle={{ color: selectedSubject === subject ? Colors.blue : Colors.text2 }}
                                backgroundColor={Colors.bg1}
                                onPress={() => setSelectedSubject(subject)}
                            />
                        ))}
                    </ScrollView>
                </View>
                
                <Text text70 marginB-8>Study Duration (Days)</Text>
                <TextField
                    placeholder="Number of days"
                    value={days}
                    onChangeText={setDays}
                    keyboardType="numeric"
                    marginB-16
                />
                
                <View row spread>
                    <Button 
                    red
                        label="Cancel"
                        size="medium"
                        link
                        onPress={() => setShowForm(false)}
                    />
                    <Button 
                        label={generating ? 'Generating...' : 'Generate Plan'}
                        size="medium"
                        backgroundColor={Colors.blue}
                        disabled={generating || !selectedSubject}
                        onPress={generateStudyPlan}
                    />
                </View>
            </Card>
        );
    };

    return (
        <View flex bg-bg2>
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
                
                {showForm && renderForm()}
                
                {loading ? (
                    <View center padding-30>
                        <ActivityIndicator size="large" color={Colors.blue} />
                    </View>
                ) : studyPlans.length > 0 ? (
                    studyPlans.map((plan, index) => renderStudyPlanCard(plan, index))
                ) : (
                    <StateScreen
                        title="No Study Plans Yet"
                        subtitle="Create your first AI-generated study plan to optimize your learning"
                        label="Create Plan"
                        onPress={() => setShowForm(true)}
                    />
                )}
            </ScrollView>
            {!showForm && (
                        <View absB absH center>
                            <Button 
                            label="New Plan"
                            size="small"
                            marginB-26
                            style={{ width: 120, height: 36 }}
                            backgroundColor={Colors.blue}
                            onPress={() => setShowForm(true)}
                        />
                        </View>
                    )}
        </View>
    );
};

export default StudyPlan;