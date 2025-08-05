import React from 'react';
import { Icon } from '../components';
import { ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { exportToPDF } from '../utils/pdfExport';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, Button, Colors, Card, Chip, ExpandableSection, TouchableOpacity } from 'react-native-ui-lib';

const StudyPlanDetails = () => {

    const route = useRoute();
    const navigation = useNavigation();

    const { plan } = route.params;

    const [expandedDays, setExpandedDays] = React.useState({});

    const toggleDay = (dayIndex) => {
        setExpandedDays(prev => ({
            ...prev,
            [dayIndex]: !prev[dayIndex]
        }));
    };

    const handleExportToPDF = async () => {
        try {

            let markdown = `# ${plan.title}\n\n`;
            markdown += `**Subject:** ${plan.subject}\n`;
            markdown += `**Duration:** ${plan.duration}\n\n`;
            
            plan.days.forEach(day => {
                markdown += `## Day ${day.day}\n\n`;
                
                markdown += `### Topics\n\n`;
                day.topics.forEach(topic => {
                    markdown += `- **${topic.title}** (${topic.duration})\n`;
                    markdown += `  ${topic.description}\n`;
                    if (topic.resources && topic.resources.length > 0) {
                        markdown += `  **Resources:** ${topic.resources.join(', ')}\n`;
                    }
                    markdown += '\n';
                });
                
                if (day.practiceQuestions && day.practiceQuestions.length > 0) {
                    markdown += `### Practice Questions\n\n`;
                    day.practiceQuestions.forEach((question, index) => {
                        markdown += `${index + 1}. ${question}\n`;
                    });
                    markdown += '\n';
                }
                
                if (day.knowledgeGaps && day.knowledgeGaps.length > 0) {
                    markdown += `### Knowledge Gaps to Address\n\n`;
                    day.knowledgeGaps.forEach(gap => {
                        markdown += `- ${gap}\n`;
                    });
                    markdown += '\n';
                }
            });

            await exportToPDF(markdown, `${plan.title}`);

            Toast.show({
                text1: 'Study plan exported to PDF',
                type: 'default'
            });
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            Toast.show({
                text1: 'Failed to export study plan',
                type: 'error'
            });
        }
    };

    const renderTopicItem = (topic) => {
        return (
            <Card padding-12 marginB-8 key={topic.title} backgroundColor={Colors.bg1}>
                <View row spread centerV style={{ flexWrap: 'wrap' }}>
                    <Text text70 text1 style={{ fontWeight: 'bold' }}>{topic.title}</Text>
                    <Chip label={topic.duration} backgroundColor={Colors.blue} labelStyle={{ color: Colors.white }} containerStyle={{ borderWidth: 0 }}/>
                </View>
                
                <Text text80 marginT-8>{topic.description}</Text>
                
                {topic.resources && topic.resources.length > 0 && (
                    <View marginT-8>
                        <Text text80BO>Resources:</Text>
                        {topic.resources.map((resource, index) => (
                            <Text key={index} text80 marginL-8>• {resource}</Text>
                        ))}
                    </View>
                )}
            </Card>
        );
    };

    const renderDaySection = (day, index, len) => {

        const isExpanded = expandedDays[index] || false;
        const last = index === len - 1 || false;

        return (

            <View key={index} style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: Colors.line }}>
                <TouchableOpacity onPress={() => toggleDay(index)} padding-16>
                    <View row spread centerV>
                        <Text text60 text1 gb>{`Day ${day.day}`}</Text>
                        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} type="feather" size={20} color={Colors.icon}/>
                    </View>
                </TouchableOpacity>
                
                <ExpandableSection expanded={isExpanded}>
                    <View padding-16 paddingT-0>
                        <Text text70BO marginB-8 marginT-8>Topics</Text>
                        {day.topics.map(topic => renderTopicItem(topic))}
                        
                        {day.practiceQuestions && day.practiceQuestions.length > 0 && (
                            <View marginT-16>
                                <Text text70BO marginB-8>Practice Questions</Text>
                                {day.practiceQuestions.map((question, qIndex) => (
                                    <Text key={qIndex} text80 marginB-4 marginL-8>• {question}</Text>
                                ))}
                            </View>
                        )}
                        
                        {day.knowledgeGaps && day.knowledgeGaps.length > 0 && (
                            <View marginT-16>
                                <Text text70BO marginB-8>Knowledge Gaps to Address</Text>
                                {day.knowledgeGaps.map((gap, gIndex) => (
                                    <Text key={gIndex} text80 marginB-4 marginL-8>• {gap}</Text>
                                ))}
                            </View>
                        )}
                    </View>
                </ExpandableSection>
            </View>

        );

    };

    return (
        <View flex bg-bg2>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <Card padding-16 bg-bg1 backgroundColor={Colors.bg1}>
                    <View row spread centerV>
                        <Text text50 text1>{plan.title}</Text>
                    </View>
                    
                    <View row centerV marginT-8>
                        <Icon name="calendar" type="feather" size={16} color={Colors.icon}/>
                        <Text text80 text2 marginL-4>{plan.duration}</Text>
                    </View>
                    
                    <View row centerV marginT-8>
                        <Icon name="book" type="feather" size={16} color={Colors.icon}/>
                        <Text text80 text2 marginL-4>{plan.subject}</Text>
                    </View>
                    
                    <View row marginT-16>
                        <Button 
                            label="Export to PDF"
                            size="small"
                            backgroundColor={Colors.green}
                            marginR-8
                            iconSource={() => <View marginR-6><Icon name="file-pdf" type="font6" size={16} color={Colors.white}/></View>}
                            onPress={handleExportToPDF}
                        />
                        <Button 
                        blue
                            label="Back to Plans"
                            size="small"
                            link
                            onPress={() => navigation.goBack()}
                        />
                    </View>
                </Card>

                {plan?.days?.length > 0 ? 
                <Card marginV-16 backgroundColor={Colors.bg1}>
                    {plan?.days?.map((day, index) => renderDaySection(day, index, plan?.days?.length || 0))}
                </Card> : null}

            </ScrollView>
        </View>
    );
};

export default StudyPlanDetails;
