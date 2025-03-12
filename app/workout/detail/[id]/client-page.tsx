"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Clock, Dumbbell, Flame } from "lucide-react";
import {
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface Machine {
  name: string;
  type: "cardio" | "strength";
}

interface Exercise {
  id: string;
  machine_name: string;
  machine_type: "cardio" | "strength";
  weight_kg?: number;      // Required for strength machines (9kg-109kg)
  distance_meters?: number; // Only for treadmill (100m-2000m in 100m increments)
  duration_seconds: number; // Required for all (5min to 1hr = 300-3600 seconds)
  calories_burned: number;  // Required for all
  incline_degrees?: number; // Only for treadmill (1-15 degrees)
  machine: Machine;
}

interface WorkoutDetail {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  notes?: string;
  total_calories: number;
  total_duration: number;
  exercises: Exercise[];
  created_at: string;
  updated_at: string;
  ai_notes?: string;
  ai_calculated_calories?: number;
  ai_overall_recommendations?: string;
}

interface ClientWorkoutDetailPageProps {
  workout?: WorkoutDetail;
  error?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ClientWorkoutDetailPage({ workout, error }: ClientWorkoutDetailPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Prepare data for machine type distribution chart
  const prepareMachineTypeData = () => {
    if (!workout || !workout.exercises.length) return [];
    
    const machineTypes: Record<string, number> = {};
    
    workout.exercises.forEach(exercise => {
      const type = exercise.machine_type || "unknown";
      machineTypes[type] = (machineTypes[type] || 0) + 1;
    });
    
    return Object.entries(machineTypes).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  };

  // Prepare data for calories by exercise chart
  const prepareCaloriesData = () => {
    if (!workout || !workout.exercises.length) return [];
    
    return workout.exercises.map(exercise => ({
      name: exercise.machine_name,
      calories: exercise.calories_burned
    }));
  };

  if (error) {
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
              {error}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold ml-4">
            Workout Details
          </h1>
        </div>

        <div className="grid gap-6">
          {/* Workout Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Workout Summary</CardTitle>
              <CardDescription>
                {format(new Date(workout.start_time), 'PPP')} at {format(new Date(workout.start_time), 'p')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{formatDuration(workout.total_duration)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Dumbbell className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Exercises</p>
                    <p className="font-medium">{workout.exercises.length}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Flame className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Calories Burned</p>
                    <p className="font-medium">{workout.total_calories}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="exercises">Exercises</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Workout Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workout.notes && (
                      <div>
                        <h3 className="font-medium mb-1">Notes</h3>
                        <p className="text-muted-foreground">{workout.notes}</p>
                      </div>
                    )}
                    
                    {workout.ai_notes && (
                      <div>
                        <h3 className="font-medium mb-1">AI Analysis</h3>
                        <p className="text-muted-foreground">{workout.ai_notes}</p>
                      </div>
                    )}
                    
                    {workout.ai_overall_recommendations && (
                      <div>
                        <h3 className="font-medium mb-1">Recommendations</h3>
                        <p className="text-muted-foreground">{workout.ai_overall_recommendations}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Exercises Tab */}
            <TabsContent value="exercises">
              <Card>
                <CardHeader>
                  <CardTitle>Exercise Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workout.exercises.map((exercise) => (
                      <Card key={exercise.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{exercise.machine_name}</h3>
                              <p className="text-sm text-muted-foreground capitalize">
                                {exercise.machine_type} Machine
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Calories</p>
                              <p className="font-medium">{exercise.calories_burned}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Duration</p>
                              <p className="font-medium">{formatDuration(exercise.duration_seconds)}</p>
                            </div>
                            
                            {exercise.machine_type === "strength" && exercise.weight_kg && (
                              <div>
                                <p className="text-sm text-muted-foreground">Weight</p>
                                <p className="font-medium">{exercise.weight_kg} kg</p>
                              </div>
                            )}
                            
                            {exercise.machine_name.toLowerCase() === "treadmill" && exercise.distance_meters && (
                              <div>
                                <p className="text-sm text-muted-foreground">Distance</p>
                                <p className="font-medium">{exercise.distance_meters} m</p>
                              </div>
                            )}
                            
                            {exercise.machine_name.toLowerCase() === "treadmill" && exercise.incline_degrees && (
                              <div>
                                <p className="text-sm text-muted-foreground">Incline</p>
                                <p className="font-medium">{exercise.incline_degrees}°</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Workout Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Machine Type Distribution */}
                    <div className="h-80">
                      <h3 className="text-center font-medium mb-2">Machine Type Distribution</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepareMachineTypeData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {prepareMachineTypeData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Calories by Exercise */}
                    <div className="h-80">
                      <h3 className="text-center font-medium mb-2">Calories by Exercise</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={prepareCaloriesData()}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="calories"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
