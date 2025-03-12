"use client";

import { useState, useEffect } from "react";
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
import { useRouter } from "next/navigation";

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
  name: string;
  machine_type: string;
  weight_kg?: number;
  duration_seconds?: number;
  distance_meters?: number;
  incline_degrees?: number;
  notes?: string;
  calories_burned?: number;
  intensity_level?: number;
}

export function History() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [workoutDates, setWorkoutDates] = useState<Date[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistory | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    const fetchWorkoutDates = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }

      const { data: workouts } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("start_time", { ascending: false });

      if (workouts) {
        const dates = workouts.map(workout => new Date(workout.start_time));
        setWorkoutDates(dates);
      }
      setLoading(false);
    };

    fetchWorkoutDates();
  }, [router]);
  const fetchWorkoutDetails = async (date: Date) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from("workouts")
      .select(`
        *,
        exercises (*)
      `)
      .eq("user_id", session.user.id)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time", { ascending: false });

    const { data: workouts } = await query;

    if (workouts && workouts.length > 0) {
      let filteredWorkout = workouts[0];
      
      if (filterType !== "all") {
        filteredWorkout = {
          ...filteredWorkout,
          exercises: filteredWorkout.exercises.filter(
            (exercise: Exercise) => {
              if (filterType === "strength") {
                return ["Leg Press", "Chest Press", "Shoulder Press", "Lat Pulldown", "Cable Row", "Smith Machine"].includes(exercise.machine_type);
              } else if (filterType === "cardio") {
                return ["Treadmill", "Elliptical", "Stationary Bike", "Rowing Machine"].includes(exercise.machine_type);
              }
              return true;
            }
          )
        };
      }
      
      setSelectedWorkout(filteredWorkout);
    } else {
      setSelectedWorkout(null);
    }
    
    setLoading(false);
  };


  useEffect(() => {
    if (selectedDate) {
      fetchWorkoutDetails(selectedDate);
    }
  }, [selectedDate, filterType]);


  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleViewWorkout = (workoutId: string) => {
    router.push(`/workout/detail/${workoutId}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => !workoutDates.some(
                  workoutDate => workoutDate.toDateString() === date.toDateString()
                )}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Filter Exercises</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-type">Machine Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger id="filter-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Exercises</SelectItem>
                      <SelectItem value="strength">Strength Machines</SelectItem>
                      <SelectItem value="cardio">Cardio Machines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : selectedWorkout ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Workout on {format(new Date(selectedWorkout.start_time), "MMMM d, yyyy")}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleViewWorkout(selectedWorkout.id)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Details
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <div className="font-medium">
                    {format(new Date(selectedWorkout.start_time), "h:mm a")}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <div className="font-medium">
                    {selectedWorkout.end_time 
                      ? format(new Date(selectedWorkout.end_time), "h:mm a") 
                      : "In Progress"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Calories Burned</Label>
                  <div className="font-medium">
                    {selectedWorkout.total_calories || 0} kcal
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Exercises</h3>
                <div className="space-y-4">
                  {selectedWorkout.exercises && selectedWorkout.exercises.length > 0 ? (
                    selectedWorkout.exercises.map((exercise) => (
                      <Card key={exercise.id}>
                        <CardContent className="p-4">
                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <Label className="text-sm text-muted-foreground">Exercise</Label>
                              <div className="font-medium">{exercise.name}</div>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground">Machine Type</Label>
                              <div className="font-medium">{exercise.machine_type}</div>
                            </div>
                            
                            {/* Display machine-specific metrics based on machine type */}
                            {["Leg Press", "Chest Press", "Shoulder Press", "Lat Pulldown", "Cable Row", "Smith Machine"].includes(exercise.machine_type) && (
                              <div>
                                <Label className="text-sm text-muted-foreground">Weight</Label>
                                <div className="font-medium">{exercise.weight_kg} kg</div>
                              </div>
                            )}
                            
                            {exercise.machine_type === "Treadmill" && (
                              <>
                                <div>
                                  <Label className="text-sm text-muted-foreground">Distance</Label>
                                  <div className="font-medium">{exercise.distance_meters} m</div>
                                </div>
                                <div>
                                  <Label className="text-sm text-muted-foreground">Incline</Label>
                                  <div className="font-medium">{exercise.incline_degrees}°</div>
                                </div>
                              </>
                            )}
                            
                            {/* Duration is shown for all exercise types */}
                            <div>
                              <Label className="text-sm text-muted-foreground">Duration</Label>
                              <div className="font-medium">
                                {exercise.duration_seconds ? formatDuration(exercise.duration_seconds) : "N/A"}
                              </div>
                            </div>
                            
                            {exercise.calories_burned && (
                              <div>
                                <Label className="text-sm text-muted-foreground">Calories</Label>
                                <div className="font-medium">{exercise.calories_burned} kcal</div>
                              </div>
                            )}
                          </div>
                          
                          {exercise.notes && (
                            <div className="mt-4">
                              <Label className="text-sm text-muted-foreground">Notes</Label>
                              <div className="text-sm mt-1">{exercise.notes}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No exercises found for this workout
                    </div>
                  )}
                </div>
              </div>
              
              {selectedWorkout.ai_notes && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">AI Analysis</h3>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm">{selectedWorkout.ai_notes}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {selectedWorkout.ai_recommendations && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Recommendations</h3>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm">{selectedWorkout.ai_recommendations}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {selectedDate 
                ? "No workouts found for the selected date" 
                : "Select a date to view workout history"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
