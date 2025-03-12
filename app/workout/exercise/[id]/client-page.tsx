"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Clock, Dumbbell, Flame } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Exercise {
  id: string;
  workout_id: string;
  machine_id: string;
  machine_name: string;
  machine_type?: string;
  weight_kg?: number;
  distance_meters?: number;
  duration_seconds: number;
  calories_burned: number;
  notes?: string;
  incline_degrees?: number;
  resistance_level?: number;
  stride_rate?: number;
  rpm?: number;
  strokes_per_minute?: number;
  speed?: number;
  intensity_level?: number;
  created_at: string;
  workout: {
    start_time: string;
  };
}

interface ExerciseHistory {
  id: string;
  workout_id: string;
  machine_id: string;
  weight_kg?: number;
  distance_meters?: number;
  duration_seconds: number;
  calories_burned: number;
  incline_degrees?: number;
  created_at: string;
}

export default function ExerciseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistory[]>([]);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    fetchExerciseDetails();
  }, [id]);

  const fetchExerciseDetails = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      // Fetch the exercise data
      const { data: exerciseData, error: exerciseError } = await supabase
        .from("exercises")
        .select("*")
        .eq("id", id)
        .single();

      if (exerciseError) {
        console.error("Error fetching exercise:", exerciseError);
        setLoading(false);
        return;
      }

      if (!exerciseData) {
        setLoading(false);
        return;
      }

      // Fetch the machine details
      const { data: machineData, error: machineError } = await supabase
        .from("machines")
        .select("name, type")
        .eq("id", exerciseData.machine_id)
        .single();

      if (machineError) {
        console.error("Error fetching machine:", machineError);
      }

      // Fetch the workout details to get start_time
      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .select("start_time")
        .eq("id", exerciseData.workout_id)
        .single();

      if (workoutError) {
        console.error("Error fetching workout:", workoutError);
      }

      // Combine all the data
      const formattedExercise: Exercise = {
        ...exerciseData,
        machine_name: machineData?.name || "Unknown Machine",
        machine_type: machineData?.type || "unknown",
        workout: {
          start_time: workoutData?.start_time || new Date().toISOString()
        },
        start_time: workoutData?.start_time || new Date().toISOString()
      };

      setExercise(formattedExercise);

      // Fetch exercise history for the same machine
      const { data: historyData, error: historyError } = await supabase
        .from("exercises")
        .select(`
          id,
          workout_id,
          machine_id,
          weight_kg,
          distance_meters,
          duration_seconds,
          calories_burned,
          incline_degrees,
          created_at
        `)
        .eq("machine_id", exerciseData.machine_id)
        .neq("id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (historyError) {
        console.error("Error fetching exercise history:", historyError);
      } else if (historyData) {
        setExerciseHistory(historyData);
      }
    } catch (error) {
      console.error("Error in fetchExerciseDetails:", error);
    }

    setLoading(false);
  };

  const navigateToWorkoutDetail = () => {
    if (!exercise) return;
    router.push(`/workout/detail/${exercise.workout_id}`);
  };

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Prepare data for history charts
  const prepareHistoryData = () => {
    if (!exerciseHistory.length) return [];
    
    return exerciseHistory.map((item, index) => {
      const date = new Date(item.created_at);
      return {
        name: format(date, 'MM/dd'),
        duration: Math.round(item.duration_seconds / 60), // Convert to minutes
        calories: item.calories_burned,
        weight: item.weight_kg || 0,
        distance: item.distance_meters || 0,
        incline: item.incline_degrees || 0,
        id: item.id,
        current: item.id === id,
      };
    });
  };

  // Helper function to safely get the first and last items from history
  const getFirstAndLastHistory = () => {
    if (exerciseHistory.length < 2) return { first: null, last: null };
    return {
      first: exerciseHistory[0],
      last: exerciseHistory[exerciseHistory.length - 1]
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Exercise not found or you don't have permission to view it.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { first: firstExercise, last: lastExercise } = getFirstAndLastHistory();

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Exercise Details</h1>
          <Button 
            variant="outline" 
            onClick={navigateToWorkoutDetail}
          >
            View Workout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">{exercise.machine_name}</CardTitle>
                <CardDescription>
                  {format(new Date(exercise.workout.start_time), "MMMM d, yyyy")} • {exercise.machine_type?.charAt(0).toUpperCase()}{exercise.machine_type?.slice(1)} Machine
                </CardDescription>
              </div>
              <div className="bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium">
                {exercise.calories_burned} kcal
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{formatDuration(exercise.duration_seconds)}</p>
              <p className="text-sm text-muted-foreground">Duration</p>
            </CardContent>
          </Card>

          {exercise.machine_type === "strength" && exercise.weight_kg && (
            <Card>
              <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
                <Dumbbell className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-2xl font-bold">{exercise.weight_kg} kg</p>
                <p className="text-sm text-muted-foreground">Weight</p>
              </CardContent>
            </Card>
          )}

          {exercise.machine_type === "cardio" && exercise.distance_meters && (
            <Card>
              <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 5L5 19"></path>
                  <path d="M21 5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5z"></path>
                </svg>
                <p className="text-2xl font-bold">{exercise.distance_meters} m</p>
                <p className="text-sm text-muted-foreground">Distance</p>
              </CardContent>
            </Card>
          )}

          {exercise.machine_name === "Treadmill" && exercise.incline_degrees && (
            <Card>
              <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <p className="text-2xl font-bold">{exercise.incline_degrees}°</p>
                <p className="text-sm text-muted-foreground">Incline</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
              <Flame className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{exercise.calories_burned}</p>
              <p className="text-sm text-muted-foreground">Calories</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exercise Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {exercise.machine_type === "strength" && exercise.weight_kg && (
                    <div>
                      <Label>Weight</Label>
                      <p>{exercise.weight_kg} kg</p>
                    </div>
                  )}
                  
                  {exercise.machine_type === "cardio" && exercise.distance_meters && (
                    <div>
                      <Label>Distance</Label>
                      <p>{exercise.distance_meters} m</p>
                    </div>
                  )}
                  
                  {exercise.machine_name === "Treadmill" && exercise.incline_degrees && (
                    <div>
                      <Label>Incline</Label>
                      <p>{exercise.incline_degrees}°</p>
                    </div>
                  )}
                  
                  <div>
                    <Label>Duration</Label>
                    <p>{formatDuration(exercise.duration_seconds)}</p>
                  </div>
                  
                  {exercise.resistance_level && (
                    <div>
                      <Label>Resistance</Label>
                      <p>Level {exercise.resistance_level}</p>
                    </div>
                  )}
                  
                  {exercise.speed && (
                    <div>
                      <Label>Speed</Label>
                      <p>{exercise.speed} km/h</p>
                    </div>
                  )}
                  
                  {exercise.rpm && (
                    <div>
                      <Label>RPM</Label>
                      <p>{exercise.rpm}</p>
                    </div>
                  )}
                  
                  {exercise.strokes_per_minute && (
                    <div>
                      <Label>Strokes/min</Label>
                      <p>{exercise.strokes_per_minute}</p>
                    </div>
                  )}
                  
                  {exercise.stride_rate && (
                    <div>
                      <Label>Stride Rate</Label>
                      <p>{exercise.stride_rate}</p>
                    </div>
                  )}
                  
                  {exercise.intensity_level && (
                    <div>
                      <Label>Intensity</Label>
                      <p>Level {exercise.intensity_level}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label>Calories</Label>
                    <p>{exercise.calories_burned} kcal</p>
                  </div>
                </div>
                
                {exercise.notes && (
                  <div>
                    <Label>Notes</Label>
                    <p className="text-sm text-muted-foreground mt-1">{exercise.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-6">
            {exerciseHistory.length > 1 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Performance History</CardTitle>
                    <CardDescription>
                      Your last {exerciseHistory.length} workouts with {exercise.machine_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={prepareHistoryData()}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 20,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" orientation="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          
                          {exercise.machine_type === "cardio" && (
                            <>
                              <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="duration" 
                                name="Duration (min)" 
                                stroke="#8884d8" 
                                activeDot={{ r: 8 }}
                                dot={{ 
                                  stroke: "#8884d8",
                                  strokeWidth: 2,
                                  r: 4,
                                  fill: "white"
                                }}
                              />
                              <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="calories" 
                                name="Calories" 
                                stroke="#82ca9d" 
                                activeDot={{ r: 8 }}
                                dot={{ 
                                  stroke: "#82ca9d",
                                  strokeWidth: 2,
                                  r: 4,
                                  fill: "white"
                                }}
                              />
                              {exercise.distance_meters && (
                                <Line 
                                  yAxisId="right"
                                  type="monotone" 
                                  dataKey="distance" 
                                  name="Distance (m)" 
                                  stroke="#ffc658" 
                                  activeDot={{ r: 8 }}
                                  dot={{ 
                                    stroke: "#ffc658",
                                    strokeWidth: 2,
                                    r: 4,
                                    fill: "white"
                                  }}
                                />
                              )}
                            </>
                          )}
                          
                          {exercise.machine_type === "strength" && (
                            <>
                              <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="weight" 
                                name="Weight (kg)" 
                                stroke="#8884d8" 
                                activeDot={{ r: 8 }}
                                dot={{ 
                                  stroke: "#8884d8",
                                  strokeWidth: 2,
                                  r: 4,
                                  fill: "white"
                                }}
                              />
                              <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="calories" 
                                name="Calories" 
                                stroke="#82ca9d" 
                                activeDot={{ r: 8 }}
                                dot={{ 
                                  stroke: "#82ca9d",
                                  strokeWidth: 2,
                                  r: 4,
                                  fill: "white"
                                }}
                              />
                            </>
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Progress Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {exercise.machine_type === "strength" && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Your weight progression on {exercise.machine_name} shows your strength development over time.
                          {firstExercise && lastExercise && 
                           lastExercise.weight_kg !== undefined && 
                           firstExercise.weight_kg !== undefined && 
                           lastExercise.weight_kg > firstExercise.weight_kg 
                            ? " You've been consistently increasing the weight, which is great for muscle growth and strength gains." 
                            : " Try to gradually increase the weight to continue challenging your muscles and making progress."}
                        </p>
                      </div>
                    )}
                    
                    {exercise.machine_type === "cardio" && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Your cardio performance on {exercise.machine_name} shows your endurance development.
                          {firstExercise && lastExercise && 
                           lastExercise.duration_seconds > firstExercise.duration_seconds 
                            ? " You've been increasing your workout duration, which helps improve cardiovascular health and endurance." 
                            : " Try to gradually increase your workout duration to continue improving your cardiovascular fitness."}
                          
                          {exercise.distance_meters && 
                           firstExercise && lastExercise && 
                           lastExercise.distance_meters !== undefined && 
                           firstExercise.distance_meters !== undefined && 
                           lastExercise.distance_meters > firstExercise.distance_meters 
                            ? " Your distance has also improved, showing better efficiency and stamina." 
                            : ""}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Not enough history data available for this exercise.
                  Complete more workouts with this machine to see your progress over time.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
