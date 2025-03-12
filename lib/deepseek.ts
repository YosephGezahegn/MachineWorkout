// DeepSeek API client for generating AI workout insights
import OpenAI from "openai";

export interface WorkoutData {
  exercises: {
    machineName: string;
    machineType: string;
    weightKg?: number;
    inclineDegrees?: number;
    durationSeconds: number;
    distanceMeters?: number;
    notes?: string;
    resistanceLevel?: number;
    speed?: number;
    intensityLevel?: number;
    strideRate?: number;
    rpm?: number;
    strokesPerMinute?: number;
  }[];
  totalDurationSeconds: number;
  startTime: string;
  endTime: string;
}

export interface DeepseekResponse {
  aiNotes: string;
  aiCalculatedCalories: number;
  aiOverallRecommendations: string;
}

// Initialize the OpenAI client with DeepSeek API configuration
const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';

// Ensure the API key is properly formatted
const formattedApiKey = apiKey.startsWith('sk-') ? apiKey : `sk-${apiKey}`;

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: formattedApiKey,
  dangerouslyAllowBrowser: true // Allow usage in browser environment
});

export async function getWorkoutInsights(workoutData: WorkoutData): Promise<DeepseekResponse> {
  try {
    console.log("Starting workout insights generation...");
    
    // Format workout data for the prompt
    const workoutSummary = formatWorkoutSummary(workoutData);
    
    // Call DeepSeek API using OpenAI SDK
    console.log("Calling DeepSeek API...");
    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a fitness expert assistant. Analyze the following workout data and provide insights." 
        },
        {
          role: "user",
          content: workoutSummary
        }
      ],
      model: "deepseek-chat",
    });

    console.log("DeepSeek API response received");
    
    // Extract response content
    const responseContent = completion.choices[0].message.content || '';
    
    // Parse the response to extract insights
    const insights = parseInsightsFromResponse(responseContent, workoutData);
    
    return insights;
  } catch (error) {
    console.error("Error fetching workout insights:", error);
    
    // Provide more detailed error logging
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      
      // Check if it's an authentication error
      if (error.message.includes("Authentication") || error.message.includes("401")) {
        console.error("Authentication error. Please check your DeepSeek API key.");
      }
    }
    
    // Fall back to the estimated calorie calculation
    const estimatedCalories = estimateCalories(workoutData);
    
    return {
      aiNotes: "Unable to analyze workout data at this time. Using estimated values instead.",
      aiCalculatedCalories: estimatedCalories,
      aiOverallRecommendations: "Continue with your fitness journey. We recommend balancing cardio and strength training for optimal results."
    };
  }
}

// Helper function to format workout data into a readable summary for the AI
function formatWorkoutSummary(workoutData: WorkoutData): string {
  const { exercises, totalDurationSeconds, startTime, endTime } = workoutData;
  
  const durationMinutes = Math.round(totalDurationSeconds / 60);
  const exerciseSummaries = exercises.map(ex => {
    let summary = `- ${ex.machineName} (${ex.machineType}): ${Math.round(ex.durationSeconds / 60)} minutes`;
    
    if (ex.machineType === 'strength' && ex.weightKg) {
      summary += `, ${ex.weightKg}kg`;
    }
    
    if (ex.machineType === 'cardio') {
      if (ex.distanceMeters) summary += `, ${ex.distanceMeters}m`;
      if (ex.inclineDegrees) summary += `, incline: ${ex.inclineDegrees}°`;
    }
    
    return summary;
  }).join('\n');
  
  return `
Workout Summary:
- Total Duration: ${durationMinutes} minutes
- Start Time: ${new Date(startTime).toLocaleTimeString()}
- End Time: ${new Date(endTime).toLocaleTimeString()}
- Date: ${new Date(startTime).toLocaleDateString()}

Exercises:
${exerciseSummaries}

Please provide:
1. A brief analysis of this workout
2. Estimated calories burned
3. Recommendations for future workouts
`;
}

// Helper function to parse AI response into structured insights
function parseInsightsFromResponse(responseText: string, workoutData: WorkoutData): DeepseekResponse {
  // Default values
  let aiNotes = "Workout analysis complete.";
  let aiCalculatedCalories = estimateCalories(workoutData);
  let aiOverallRecommendations = "Keep up the good work!";
  
  // Try to extract sections from the response
  const analysisSectionMatch = responseText.match(/analysis|summary|overview/i);
  const caloriesSectionMatch = responseText.match(/calories|burned|energy/i);
  const recommendationsSectionMatch = responseText.match(/recommendations|suggestions|advice|tips/i);
  
  if (analysisSectionMatch) {
    const analysisIndex = responseText.indexOf(analysisSectionMatch[0]);
    const nextSectionIndex = findNextSectionIndex(responseText, analysisIndex);
    if (nextSectionIndex > analysisIndex) {
      aiNotes = responseText.substring(analysisIndex, nextSectionIndex).trim();
    }
  }
  
  // Try to extract calories number
  const caloriesMatch = responseText.match(/(\d+)(?:\s*[-–]\s*\d+)?\s*calories/i);
  if (caloriesMatch && caloriesMatch[1]) {
    aiCalculatedCalories = parseInt(caloriesMatch[1], 10);
  }
  
  // Extract recommendations
  if (recommendationsSectionMatch) {
    const recommendationsIndex = responseText.indexOf(recommendationsSectionMatch[0]);
    aiOverallRecommendations = responseText.substring(recommendationsIndex).trim();
  }
  
  return {
    aiNotes,
    aiCalculatedCalories,
    aiOverallRecommendations
  };
}

// Helper function to find the next section in the response text
function findNextSectionIndex(text: string, startIndex: number): number {
  const sectionKeywords = ['analysis', 'summary', 'overview', 'calories', 'burned', 'energy', 
                          'recommendations', 'suggestions', 'advice', 'tips'];
  
  let minIndex = text.length;
  
  for (const keyword of sectionKeywords) {
    const keywordIndex = text.indexOf(keyword, startIndex + 10); // Look after current section
    if (keywordIndex > startIndex && keywordIndex < minIndex) {
      minIndex = keywordIndex;
    }
  }
  
  return minIndex;
}

// Fallback function to estimate calories if AI doesn't provide them
function estimateCalories(workoutData: WorkoutData): number {
  const totalDuration = workoutData.totalDurationSeconds;
  let baseCalories = 0;
  
  // Calculate calories based on exercise types and duration
  workoutData.exercises.forEach(exercise => {
    const durationMinutes = exercise.durationSeconds / 60;
    
    if (exercise.machineType === 'cardio') {
      // Cardio machines burn more calories
      if (exercise.machineName === 'Treadmill') {
        // Treadmill with incline burns more
        const inclineFactor = exercise.inclineDegrees ? 1 + (exercise.inclineDegrees / 15) : 1;
        baseCalories += 8 * durationMinutes * inclineFactor;
      } else if (exercise.machineName === 'Rowing Machine') {
        baseCalories += 10 * durationMinutes;
      } else {
        baseCalories += 7 * durationMinutes;
      }
    } else if (exercise.machineType === 'strength') {
      // Weight machines - calories based on weight
      const weightFactor = exercise.weightKg ? exercise.weightKg / 50 : 1;
      baseCalories += 5 * durationMinutes * weightFactor;
    }
  });
  
  // Round to nearest whole number
  return Math.round(baseCalories);
}
