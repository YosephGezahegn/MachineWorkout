"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Download, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkoutHistory {
  id: string;
  start_time: string;
  end_time: string;
  total_calories: number;
  exercises: Exercise[];
  ai_notes?: string;
  ai_recommendations?: string;
}

interface Exercise {
  id: string;
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
}

export default function WorkoutHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [workoutDates, setWorkoutDates] = useState<Date[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistory | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchWorkoutDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchWorkoutDetails(selectedDate);
    }
  }, [selectedDate]);

  const fetchWorkoutDates = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: workouts } = await supabase
      .from("workouts")
      .select("start_time")
      .eq("user_id", session.user.id);

    if (workouts) {
      const dates = workouts.map(w => new Date(w.start_time));
      setWorkoutDates(dates);
    }
    setLoading(false);
  };

  const fetchWorkoutDetails = async (date: Date) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // First, fetch the workouts for the selected date
      const { data: workoutsData, error: workoutsError } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());

      if (workoutsError) {
        console.error("Error fetching workouts:", workoutsError);
        setLoading(false);
        setSelectedWorkout(null);
        return;
      }

      if (!workoutsData || workoutsData.length === 0) {
        setSelectedWorkout(null);
        setLoading(false);
        return;
      }

      // Use the first workout from the day
      const workout = workoutsData[0];

      // Then, fetch the exercises for this workout
      const { data: exercisesData, error: exercisesError } = await supabase
        .from("exercises")
        .select("*")
        .eq("workout_id", workout.id);

      if (exercisesError) {
        console.error("Error fetching exercises:", exercisesError);
        setLoading(false);
        return;
      }

      // For each exercise, fetch the machine details
      const exercisesWithMachines = await Promise.all(
        exercisesData.map(async (exercise) => {
          const { data: machineData } = await supabase
            .from("machines")
            .select("name, type")
            .eq("id", exercise.machine_id)
            .single();

          return {
            ...exercise,
            machine_name: machineData?.name || "Unknown Machine",
            machine_type: machineData?.type || "unknown",
          };
        })
      );

      // Combine all the data
      const formattedWorkout: WorkoutHistory = {
        ...workout,
        exercises: exercisesWithMachines,
      };

      setSelectedWorkout(formattedWorkout);
    } catch (error) {
      console.error("Error in fetchWorkoutDetails:", error);
      setSelectedWorkout(null);
    }
    
    setLoading(false);
  };

  const exportWorkoutData = () => {
    if (!selectedWorkout) return;

    const workoutData = {
      date: format(selectedDate!, "yyyy-MM-dd"),
      totalCalories: selectedWorkout.total_calories,
      duration: format(new Date(selectedWorkout.end_time).getTime() - new Date(selectedWorkout.start_time).getTime(), "mm:ss"),
      aiNotes: selectedWorkout.ai_notes,
      aiRecommendations: selectedWorkout.ai_recommendations,
      exercises: selectedWorkout.exercises.map(exercise => ({
        machine: exercise.machine_name,
        machineType: exercise.machine_type,
        weight: exercise.weight_kg,
        distance: exercise.distance_meters,
        duration: exercise.duration_seconds,
        calories: exercise.calories_burned,
        notes: exercise.notes,
        incline: exercise.incline_degrees,
        resistance: exercise.resistance_level,
        speed: exercise.speed,
      })),
    };

    const blob = new Blob([JSON.stringify(workoutData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout-${format(selectedDate!, "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const navigateToWorkoutDetail = () => {
    if (!selectedWorkout) return;
    router.push(`/workout/detail/${selectedWorkout.id}`);
  };

  const navigateToExerciseDetail = (exerciseId: string) => {
    router.push(`/workout/exercise/${exerciseId}`);
  };

  const filteredExercises = selectedWorkout?.exercises.filter(exercise => {
    if (filterType === "all") return true;
    if (filterType === "strength") return exercise.machine_type === "strength";
    if (filterType === "cardio") return exercise.machine_type === "cardio";
    return true;
  });

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')}
            className="md:hidden"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Workout History</h1>
          {selectedWorkout && (
            <div className="flex gap-2">
              <Button onClick={navigateToWorkoutDetail} variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
              <Button onClick={exportWorkoutData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  workout: workoutDates,
                }}
                modifiersStyles={{
                  workout: {
                    fontWeight: "bold",
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    borderRadius: "4px",
                  },
                }}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : selectedWorkout ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Workout Details</CardTitle>
                      <Select
                        value={filterType}
                        onValueChange={setFilterType}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Filter type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="strength">Strength</SelectItem>
                          <SelectItem value="cardio">Cardio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Time</Label>
                        <p>{format(new Date(selectedWorkout.start_time), "HH:mm")}</p>
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <p>{format(new Date(selectedWorkout.end_time), "HH:mm")}</p>
                      </div>
                      <div>
                        <Label>Total Duration</Label>
                        <p>
                          {format(
                            new Date(selectedWorkout.end_time).getTime() -
                              new Date(selectedWorkout.start_time).getTime(),
                            "mm:ss"
                          )}
                        </p>
                      </div>
                      <div>
                        <Label>Total Calories</Label>
                        <p>{selectedWorkout.total_calories} kcal</p>
                      </div>
                    </div>
                    
                    {selectedWorkout.ai_notes && (
                      <div>
                        <Label>AI Analysis</Label>
                        <p className="text-sm text-muted-foreground">{selectedWorkout.ai_notes}</p>
                      </div>
                    )}
                    
                    {selectedWorkout.ai_recommendations && (
                      <div>
                        <Label>AI Recommendations</Label>
                        <p className="text-sm text-muted-foreground">{selectedWorkout.ai_recommendations}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {filteredExercises?.map((exercise, index) => (
                    <Card key={exercise.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="font-semibold">
                              {exercise.machine_name}
                            </h3>
                            <span className="text-sm text-muted-foreground">
                              {exercise.calories_burned} kcal
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {exercise.machine_type === "strength" && exercise.weight_kg && (
                              <div>
                                <Label>Weight</Label>
                                <p>{exercise.weight_kg} kg</p>
                              </div>
                            )}
                            
                            {exercise.machine_type === "cardio" && exercise.distance_meters && (
                              <div>
                                <Label>Distance</Label>
                                <p>{exercise.distance_meters}m</p>
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
                              <p>{Math.floor(exercise.duration_seconds / 60)}:{(exercise.duration_seconds % 60).toString().padStart(2, '0')}</p>
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
                          </div>
                          {exercise.notes && (
                            <div>
                              <Label>Notes</Label>
                              <p className="text-sm text-muted-foreground">{exercise.notes}</p>
                            </div>
                          )}
                          <div className="flex justify-end">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigateToExerciseDetail(exercise.id)}
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No workout found for selected date
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
