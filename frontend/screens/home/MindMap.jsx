import React from 'react';
import { StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { View, Text, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Icon } from '../../components';
import Svg, { G, Line, Circle, Text as SvgText } from 'react-native-svg';
import Animated, { 
    useAnimatedStyle, 
    useSharedValue, 
    withSpring, 
    useAnimatedReaction,
    useAnimatedGestureHandler,
    runOnJS
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, GEMINI_API_KEY } from '../../utils';
import { doc, getDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const NODE_COLORS = [
    Colors.blue,
    Colors.green,
    Colors.orange1,
    Colors.purple1,
    Colors.red,
    Colors.yellow1,
];

const MindMapNode = ({ node, onPress, scaleValue }) => {

    const nodeSize = 80 * scaleValue;
    const fontSize = 10 * scaleValue;
  
  return (
    <G x={node.x} y={node.y}>
      {/* Draw connections to children */}
      {node.children?.map((child, index) => (
        <Line
          key={`line-${node.id}-${child.id}`}
          x1={0}
          y1={0}
          x2={child.x - node.x}
          y2={child.y - node.y}
          stroke={Colors.text2}
          strokeWidth={1 * scaleValue}
          opacity={0.6}
        />
      ))}
      
      {/* Draw the node */}
      <Circle
        r={nodeSize / 2}
        fill={NODE_COLORS[node.depth % NODE_COLORS.length]}
        opacity={0.8}
        onPress={() => onPress(node)}
      />
      
      {/* Node text */}
      <SvgText
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="bold"
        fill={Colors.white}
        x={0}
        y={fontSize / 3}
      >
        {node.label.length > 12 ? node.label.substring(0, 10) + '...' : node.label}
      </SvgText>
    </G>
  );
};

const MindMap = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const noteId = route.params?.id;
  
  const [loading, setLoading] = React.useState(true);
  const [note, setNote] = React.useState(null);
  const [mindMapData, setMindMapData] = React.useState(null);
  
  // For pan and zoom functionality
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  
  // Improved animated style with better spring configuration
  const panStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
    };
  });
  
  // Improved gesture handler using worklets for smoother performance
  const onGestureEvent = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      // Smooth, direct manipulation during the gesture
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: (event, ctx) => {
      // Apply gentle inertia at the end of the gesture
      const velocityFactor = 0.3;
      translateX.value = withSpring(
        ctx.startX + event.translationX + event.velocityX * velocityFactor,
        { damping: 20, stiffness: 90 }
      );
      translateY.value = withSpring(
        ctx.startY + event.translationY + event.velocityY * velocityFactor,
        { damping: 20, stiffness: 90 }
      );
      
      // Save the final position
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    },
  });
  
  // Handle zoom in/out with improved spring configuration
  const handleZoomIn = () => {
    scale.value = withSpring(Math.min(scale.value + 0.25, 2.5), { 
      damping: 20, 
      stiffness: 100,
      mass: 0.5
    });
  };
  
  const handleZoomOut = () => {
    scale.value = withSpring(Math.max(scale.value - 0.25, 0.5), { 
      damping: 20, 
      stiffness: 100,
      mass: 0.5
    });
  };
  
  const handleReset = () => {
    translateX.value = withSpring(0, { damping: 15, stiffness: 80 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 80 });
    scale.value = withSpring(1, { damping: 20, stiffness: 100 });
  };
  
  // Navigate to note when a node is pressed
  const handleNodePress = (node) => {
    if (node.id) {
      navigation.navigate('NoteEditor', { id: node.id });
    }
  };
  
  // Generate mind map data from note content using AI
  const generateMindMap = async (noteContent, noteTitle) => {
    try {
      // Truncate content if it's too long to avoid token limits
      const truncatedContent = noteContent.length > 2000 
        ? noteContent.substring(0, 2000) + '...' 
        : noteContent;
      
      // Create a prompt for mind map generation
      const prompt = `Create a mind map structure based on this note content. Extract main topics and subtopics.
      
Note title: ${noteTitle}
Note content: ${truncatedContent}

Format the response as a JSON object with this structure:
{
  "id": "root",
  "label": "${noteTitle}",
  "x": 0,
  "y": 0,
  "depth": 0,
  "children": [
    {
      "id": "topic1",
      "label": "Topic 1",
      "x": -150,
      "y": -100,
      "depth": 1,
      "children": [...]
    },
    ...
  ]
}

Ensure each node has a unique id, a short label (max 15 chars), x/y coordinates (arrange in a radial pattern from the center), depth level, and children array. Position main topics around the center node, and their subtopics around them. Limit to 3 levels of depth and max 15 total nodes.`;
      
      // Generate mind map using Gemini AI
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract the JSON object from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const mindMapJson = JSON.parse(jsonMatch[0]);
        
        // Process the mind map data to ensure proper positioning
        const processedData = processNodePositions(mindMapJson);
        return processedData;
      } else {
        throw new Error('Failed to parse mind map data');
      }
    } catch (error) {
      console.error('Error generating mind map:', error);
      // Create a simple fallback mind map with just the root node
      return {
        id: 'root',
        label: noteTitle || 'Note',
        x: 0,
        y: 0,
        depth: 0,
        children: []
      };
    }
  };
  
  // Process node positions to ensure they don't overlap
  const processNodePositions = (rootNode) => {
    // Simple function to adjust positions if needed
    // In a real implementation, you might want a more sophisticated layout algorithm
    const centerX = 0;
    const centerY = 0;
    const radius = 200; // Base radius for first level
    
    const processNode = (node, depth, index, totalSiblings, parentAngle) => {
      if (depth === 0) {
        // Root node stays at center
        node.x = centerX;
        node.y = centerY;
      } else {
        // Calculate position based on depth and index
        const angleStep = 2 * Math.PI / totalSiblings;
        // Calculate this node's angle based on parent angle and position in siblings
        let nodeAngle = parentAngle + (index - totalSiblings / 2) * angleStep * 0.8;
        
        const nodeRadius = radius * depth * 0.8;
        node.x = centerX + nodeRadius * Math.cos(nodeAngle);
        node.y = centerY + nodeRadius * Math.sin(nodeAngle);
      }
      
      // Process children recursively
      if (node.children && node.children.length > 0) {
        const childrenAngle = depth === 0 ? 0 : parentAngle; // For root, start at 0
        node.children.forEach((child, childIndex) => {
          processNode(
            child, 
            depth + 1, 
            childIndex, 
            node.children.length,
            depth === 0 ? (childIndex / node.children.length) * 2 * Math.PI : childrenAngle
          );
        });
      }
      
      return node;
    };
    
    return processNode(rootNode, 0, 0, 1, 0);
  };
  
  // Load note data
  React.useEffect(() => {
    const fetchNote = async () => {
      if (!noteId) {
        setLoading(false);
        Toast.show({ text1: 'No note ID provided' });
        return;
      }
      
      try {
        const noteRef = doc(db, 'notes', noteId);
        const noteSnap = await getDoc(noteRef);
        
        if (noteSnap.exists()) {
          const noteData = { id: noteSnap.id, ...noteSnap.data() };
          setNote(noteData);
          
          // Generate mind map from note content
          const mindMap = await generateMindMap(noteData.content, noteData.title);
          setMindMapData(mindMap);
        } else {
          Toast.show({ text1: 'Note not found' });
        }
      } catch (error) {
        console.error('Error fetching note:', error);
        Toast.show({ text1: 'Error loading note' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchNote();
  }, [noteId]);
  
  // State for tracking the current scale value
  const [currentScale, setCurrentScale] = React.useState(1);
  
  // Use useAnimatedReaction to safely track shared value changes
  useAnimatedReaction(
    () => scale.value,
    (currentValue) => {
      // This runs on the UI thread and then calls the worklet to update JS thread state
      runOnJS(setCurrentScale)(currentValue);
    },
    [scale]
  );
  
  // Render the mind map
  const renderMindMap = () => {
    if (!mindMapData) return null;
    
    // Recursive function to render nodes
    const renderNodes = (node) => {
      if (!node) return null;
      
      return (
        <React.Fragment key={`node-${node.id}`}>
          <MindMapNode 
            node={node} 
            onPress={handleNodePress} 
            scaleValue={currentScale}
          />
          {node.children?.map(child => renderNodes(child))}
        </React.Fragment>
      );
    };
    
    return renderNodes(mindMapData);
  };

  const styles = StyleSheet.create({
    svgContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden', // Prevent content from spilling outside container
    },
    controls: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: Colors.bg1,
      borderRadius: 10,
      padding: 5,
      flexDirection: 'column',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 1000, // Ensure controls are above other elements
    },
    controlButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 2, // Add spacing between buttons
    },
  });
  
  return (
    <View flex bg-bg2 useSafeArea>
      
      {loading ? (
        <View flex center>
          <ActivityIndicator size="large" color={Colors.blue} />
          <Text text70 text1 marginT-10>Generating mind map...</Text>
        </View>
      ) : (
        <View flex>
          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <Animated.View style={[styles.svgContainer, panStyle]}>
              <Svg width={width * 3} height={height * 3} viewBox={`${-width * 1.5} ${-height * 1.5} ${width * 3} ${height * 3}`}>
                {renderMindMap()}
              </Svg>
            </Animated.View>
          </PanGestureHandler>
          
          {/* Zoom controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
              <Icon name="add" size={24} color={Colors.text1} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
              <Icon name="remove" size={24} color={Colors.text1} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
              <Icon name="refresh" size={24} color={Colors.text1} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default MindMap;
