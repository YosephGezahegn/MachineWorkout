"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, ArrowLeft } from "lucide-react";
import { WorkoutTimer } from "@/components/workout/WorkoutTimer"
import { getWorkoutInsights, WorkoutData } from "@/lib/deepseek";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Machine {
  id: string;
  name: string;
  type: string;
}

interface Exercise {
  machineId: string;
  weightKg?: number; // Made nullable for cardio machines
  inclineDegrees?: number; // Made nullable for non-treadmill machines
  distanceMeters?: number; // Made nullable for non-cardio machines
  durationSeconds: number; // Required for all exercises
  caloriesBurned: number;
  notes?: string;
  resistanceLevel?: number;
  strideRate?: number;
  rpm?: number;
  strokesPerMinute?: number;
  speed?: number;
  intensityLevel?: number;
  sets?: number;
  repetitions?: number;
  lastUsed?: boolean; // New field to track if this is from last used settings
}

const DISTANCE_OPTIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 100);
const WEIGHT_OPTIONS = [9, 14, 18, 23, 27, 32, 36, 41, 46, 50, 55, 59, 64, 68, 73, 77, 82, 86, 91, 96, 100, 105, 109];
const SETS_OPTIONS = Array.from({ length: 5 }, (_, i) => i + 1);
const REPS_OPTIONS = [5, 7, 10, 12, 15, 18];
const RESISTANCE_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1); // 1-20
const INCLINE_OPTIONS = Array.from({ length: 15 }, (_, i) => i + 1); // 1-15 degrees
const SPEED_OPTIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5); // 0.5-10 mph
const INTENSITY_OPTIONS = ["Low", "Medium", "High", "Maximum"];
const RPM_OPTIONS = [40, 50, 60, 70, 80, 90, 100, 110, 120]; // Common RPM values
const STRIDE_RATE_OPTIONS = [100, 120, 140, 160, 180, 200]; // Strides per minute
const STROKES_OPTIONS = [20, 24, 26, 28, 30, 32, 34, 36]; // Strokes per minute
const DURATION_OPTIONS = [
  { label: "5 minutes", value: 300 },
  { label: "10 minutes", value: 600 },
  { label: "15 minutes", value: 900 },
  { label: "20 minutes", value: 1200 },
  { label: "25 minutes", value: 1500 },
  { label: "30 minutes", value: 1800 },
  { label: "1 hour", value: 3600 },
];

export default function NewWorkout() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lastExercises, setLastExercises] = useState<{ [key: string]: Exercise }>({});
  const [workoutStartTime] = useState<string>(new Date().toISOString());
  const [aiInsights, setAiInsights] = useState<{
    notes: string;
    calculatedCalories: number;
    recommendations: string;
  } | null>(null);


  useEffect(() => {

    
    const fetchMachinesAndLastExercises = async () => {
      try {

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        // Fetch machines with their types
        const { data: machinesData } = await supabase
          .from("machines")
          .select("*")
          .order("name");

        if (!machinesData) {
          setLoading(false);
          return;
        }

        setMachines(machinesData);

        // Get exercises directly with a join to workouts
        const { data: exercisesData } = await supabase
          .from("exercises")
          .select("*")
          .eq('workouts.user_id', session.user.id)
          .order('workouts.created_at', { ascending: false });

        console.log("Exercises data:", exercisesData);

        if (exercisesData) {
          // Create a map of the most recent exercise for each machine
          const lastExercisesMap = {} as { [key: string]: Exercise };
          
          exercisesData.forEach(exercise => {
            // Only store if we haven't seen this machine yet (keeping the most recent)
            if (!lastExercisesMap[exercise.machine_id]) {
              const machine = machinesData.find(m => m.id === exercise.machine_id);
              if (!machine) return;

              const machineName = machine.name;
              
              // Base exercise with common fields
              const baseExercise = {
                machineId: exercise.machine_id,
                weightKg: machine.type === 'strength' ? exercise.weight_kg : undefined,
                inclineDegrees: machine.type === 'cardio' && getMachineName(exercise.machine_id) === 'Treadmill' ? exercise.incline_degrees : undefined,
                distanceMeters: machine.type === 'cardio' && getMachineName(exercise.machine_id) === 'Treadmill' ? exercise.distance_meters : undefined,
                durationSeconds: exercise.duration_seconds || DURATION_OPTIONS[1].value,
                caloriesBurned: exercise.calories_burned || 0,
                notes: exercise.notes || "",
                resistanceLevel: exercise.resistance_level,
                strideRate: exercise.stride_rate,
                rpm: exercise.rpm,
                strokesPerMinute: exercise.strokes_per_minute,
                speed: exercise.speed,
                intensityLevel: exercise.intensity_level,
                // UI-only fields for strength machines
                sets: machine.type === 'strength' ? 3 : undefined,
                repetitions: machine.type === 'strength' ? 10 : undefined,
                lastUsed: true
              };
            }
            return exercise;
          });

          console.log("Processed last exercises map:", lastExercisesMap);
          setLastExercises(lastExercisesMap);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMachinesAndLastExercises();
  }, []);

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        machineId: "",
        weightKg: undefined, // Will be set based on machine type
        distanceMeters: undefined, // Only for treadmill
        durationSeconds: DURATION_OPTIONS[1].value, // Default 10 minutes for all machines
        caloriesBurned: 0,
        resistanceLevel: undefined,
        inclineDegrees: undefined, // Only for treadmill
        strideRate: undefined,
        rpm: undefined,
        strokesPerMinute: undefined,
        speed: undefined,
        intensityLevel: undefined,
        // UI-only fields that won't be stored in the database
        sets: 3, // Default for UI display
        repetitions: 10, // Default for UI display
        notes: "",
        lastUsed: false
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updatedExercises = [...exercises];
    
    if (field === 'machineId') {
      // When machine is selected, populate with last used values if available
      const lastExercise = lastExercises[value];
      if (lastExercise) {
        updatedExercises[index] = {
          ...lastExercise,
          machineId: value,
          lastUsed: true
        };
      } else {
        // If no last exercise, reset to defaults
        updatedExercises[index] = {
          ...updatedExercises[index],
          machineId: value,
          weightKg: undefined,
          distanceMeters: undefined,
          durationSeconds: DURATION_OPTIONS[1].value,
          caloriesBurned: 0,
          resistanceLevel: undefined,
          inclineDegrees: undefined,
          strideRate: undefined,
          rpm: undefined,
          strokesPerMinute: undefined,
          speed: undefined,
          intensityLevel: undefined,
          sets: getMachineType(value) === 'strength' ? 3 : undefined,
          repetitions: getMachineType(value) === 'strength' ? 10 : undefined,
          notes: "",
          lastUsed: false
        };
      }
    } else {
      updatedExercises[index] = {
        ...updatedExercises[index],
        [field]: value,
        lastUsed: false // Mark as modified when any field is updated
      };
    }
    
    setExercises(updatedExercises);
  };

  const getMachineType = (machineId: string): string | undefined => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.type;
  };

  const getMachineName = (machineId: string): string | undefined => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.name;
  };

  const getAiInsights = async () => {
    // Set workout end time
    const workoutEndTime = new Date().toISOString();
    
    // Prepare workout data for DeepSeek API
    const workoutData: WorkoutData = {
      exercises: exercises.map(exercise => ({
        machineName: getMachineName(exercise.machineId) || "Unknown",
        machineType: getMachineType(exercise.machineId) || "Unknown",
        weightKg: exercise.weightKg,
        inclineDegrees: exercise.inclineDegrees,
        durationSeconds: exercise.durationSeconds,
        distanceMeters: exercise.distanceMeters,
        notes: exercise.notes
      })),
      totalDurationSeconds: exercises.reduce((sum, ex) => sum + ex.durationSeconds, 0),
      startTime: workoutStartTime,
      endTime: workoutEndTime
    };

    try {
      // Get AI insights from DeepSeek
      const insights = await getWorkoutInsights(workoutData);
      setAiInsights({
        notes: insights.aiNotes,
        calculatedCalories: insights.aiCalculatedCalories,
        recommendations: insights.aiOverallRecommendations
      });
      return insights;
    } catch (error) {
      console.error("Error getting AI insights:", error);
      return null;
    }
  };

  const handleFinishWorkout = async () => {
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // Set workout end time
      const workoutEndTime = new Date().toISOString();
      
      // Get AI insights
      const insights = await getAiInsights();
      
      // Calculate total calories (use AI-provided value if available)
      const totalCalories = insights && insights.aiCalculatedCalories > 0 
        ? insights.aiCalculatedCalories 
        : exercises.reduce((sum, ex) => sum + (ex.caloriesBurned || 0), 0);
      
      // First, insert the workout
      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert([
          {
            user_id: session.user.id,
            start_time: workoutStartTime,
            end_time: workoutEndTime,
            total_calories: totalCalories,
            notes: insights ? `${insights.aiNotes}\n\nRecommendations: ${insights.aiOverallRecommendations}` : "Completed workout"
          },
        ])
        .select()
        .single();

      if (workoutError) throw new Error(`Failed to save workout: ${workoutError.message}`);
      if (!workout) throw new Error("Workout created but no data returned");

      // Prepare exercise inserts based on machine type
      const exerciseInserts = exercises.map(exercise => ({
        workout_id: workout.id,
        machine_id: exercise.machineId,
        weight_kg: exercise.weightKg,
        incline_degrees: exercise.inclineDegrees,
        distance_meters: exercise.distanceMeters,
        duration_seconds: exercise.durationSeconds,
        calories_burned: exercise.caloriesBurned,
        notes: exercise.notes,
        resistance_level: exercise.resistanceLevel,
        stride_rate: exercise.strideRate,
        rpm: exercise.rpm,
        strokes_per_minute: exercise.strokesPerMinute,
        speed: exercise.speed,
        intensity_level: exercise.intensityLevel,
      }));

      // Insert all exercises in a single batch
      const { error: exercisesError } = await supabase
        .from("exercises")
        .insert(exerciseInserts);

      if (exercisesError) {
        console.error("Exercise insert error:", exercisesError);
        throw new Error(`Failed to save exercises: ${exercisesError.message}`);
      }

      toast({
        title: "Success",
        description: "Workout completed and analyzed successfully!",
      });

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Workout save error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">New Workout</h1>
          <Button onClick={addExercise}>
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        </div>

        <div className="space-y-6">
          {exercises.map((exercise, index) => (
            <Card key={index} className="w-full">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                  <h3 className="text-lg font-semibold">Exercise {index + 1}</h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <WorkoutTimer
                      duration={exercise.durationSeconds}
                      onComplete={() => {
                        toast({
                          title: "Exercise Complete",
                          description: `Exercise ${index + 1} timer finished!`,
                        });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExercise(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Machine</Label>
                    <Select
                      value={exercise.machineId}
                      onValueChange={(value) =>
                        updateExercise(index, "machineId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a machine" />
                      </SelectTrigger>
                      <SelectContent>
                        {machines.map((machine) => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select
                      value={exercise.durationSeconds.toString()}
                      onValueChange={(value) =>
                        updateExercise(index, "durationSeconds", parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((duration) => (
                          <SelectItem key={duration.value} value={duration.value.toString()}>
                            {duration.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Treadmill-specific fields */}
                  {getMachineName(exercise.machineId) === "Treadmill" && (
                    <>
                      <div className="space-y-2">
                        <Label>Distance (meters)</Label>
                        <Select
                          value={exercise.distanceMeters?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "distanceMeters", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select distance" />
                          </SelectTrigger>
                          <SelectContent>
                            {DISTANCE_OPTIONS.map((distance) => (
                              <SelectItem key={distance} value={distance.toString()}>
                                {distance}m
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Incline (degrees)</Label>
                        <Select
                          value={exercise.inclineDegrees?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "inclineDegrees", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select incline" />
                          </SelectTrigger>
                          <SelectContent>
                            {INCLINE_OPTIONS.map((incline) => (
                              <SelectItem key={incline} value={incline.toString()}>
                                {incline}°
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Speed (mph)</Label>
                        <Select
                          value={exercise.speed?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "speed", parseFloat(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select speed" />
                          </SelectTrigger>
                          <SelectContent>
                            {SPEED_OPTIONS.map((speed) => (
                              <SelectItem key={speed} value={speed.toString()}>
                                {speed} mph
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {getMachineName(exercise.machineId) === "Elliptical" && (
                    <>
                      <div className="space-y-2">
                        <Label>Resistance Level</Label>
                        <Select
                          value={exercise.resistanceLevel?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "resistanceLevel", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select resistance" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESISTANCE_LEVELS.map((level) => (
                              <SelectItem key={level} value={level.toString()}>
                                Level {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Stride Rate (SPM)</Label>
                        <Select
                          value={exercise.strideRate?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "strideRate", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select stride rate" />
                          </SelectTrigger>
                          <SelectContent>
                            {STRIDE_RATE_OPTIONS.map((rate) => (
                              <SelectItem key={rate} value={rate.toString()}>
                                {rate} SPM
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {getMachineName(exercise.machineId) === "Stationary Bike" && (
                    <>
                      <div className="space-y-2">
                        <Label>Resistance Level</Label>
                        <Select
                          value={exercise.resistanceLevel?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "resistanceLevel", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select resistance" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESISTANCE_LEVELS.map((level) => (
                              <SelectItem key={level} value={level.toString()}>
                                Level {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>RPM</Label>
                        <Select
                          value={exercise.rpm?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "rpm", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select RPM" />
                          </SelectTrigger>
                          <SelectContent>
                            {RPM_OPTIONS.map((rpm) => (
                              <SelectItem key={rpm} value={rpm.toString()}>
                                {rpm} RPM
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {getMachineName(exercise.machineId) === "Rowing Machine" && (
                    <>
                      <div className="space-y-2">
                        <Label>Resistance Level</Label>
                        <Select
                          value={exercise.resistanceLevel?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "resistanceLevel", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select resistance" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESISTANCE_LEVELS.map((level) => (
                              <SelectItem key={level} value={level.toString()}>
                                Level {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Strokes Per Minute</Label>
                        <Select
                          value={exercise.strokesPerMinute?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "strokesPerMinute", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select SPM" />
                          </SelectTrigger>
                          <SelectContent>
                            {STROKES_OPTIONS.map((spm) => (
                              <SelectItem key={spm} value={spm.toString()}>
                                {spm} SPM
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {getMachineName(exercise.machineId) === "Stair Climber" && (
                    <>
                      <div className="space-y-2">
                        <Label>Speed</Label>
                        <Select
                          value={exercise.speed?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "speed", parseFloat(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select speed" />
                          </SelectTrigger>
                          <SelectContent>
                            {SPEED_OPTIONS.map((speed) => (
                              <SelectItem key={speed} value={speed.toString()}>
                                {speed} steps/min
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Intensity Level</Label>
                        <Select
                          value={exercise.intensityLevel?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "intensityLevel", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select intensity" />
                          </SelectTrigger>
                          <SelectContent>
                            {INTENSITY_OPTIONS.map((intensity, i) => (
                              <SelectItem key={intensity} value={(i + 1).toString()}>
                                {intensity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Weight machine options */}
                  {getMachineType(exercise.machineId) === "strength" && (
                    <>
                      <div className="space-y-2">
                        <Label>Weight (kg)</Label>
                        <Select
                          value={exercise.weightKg?.toString() || ""}
                          onValueChange={(value) =>
                            updateExercise(index, "weightKg", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select weight" />
                          </SelectTrigger>
                          <SelectContent>
                            {WEIGHT_OPTIONS.map((weight) => (
                              <SelectItem key={weight} value={weight.toString()}>
                                {weight} kg
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Sets</Label>
                        <Select
                          value={exercise.sets?.toString() || "3"}
                          onValueChange={(value) =>
                            updateExercise(index, "sets", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sets" />
                          </SelectTrigger>
                          <SelectContent>
                            {SETS_OPTIONS.map((sets) => (
                              <SelectItem key={sets} value={sets.toString()}>
                                {sets} sets
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Repetitions</Label>
                        <Select
                          value={exercise.repetitions?.toString() || "10"}
                          onValueChange={(value) =>
                            updateExercise(index, "repetitions", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select reps" />
                          </SelectTrigger>
                          <SelectContent>
                            {REPS_OPTIONS.map((reps) => (
                              <SelectItem key={reps} value={reps.toString()}>
                                {reps} reps
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notes</Label>
                    <Input
                      value={exercise.notes || ""}
                      onChange={(e) =>
                        updateExercise(index, "notes", e.target.value)
                      }
                      placeholder="Add notes..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {aiInsights && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>AI Notes</Label>
                <p className="text-sm text-muted-foreground">{aiInsights.notes}</p>
              </div>
              <div className="grid gap-2">
                <Label>Calculated Calories</Label>
                <p className="text-sm text-muted-foreground">{aiInsights.calculatedCalories} calories</p>
              </div>
              <div className="grid gap-2">
                <Label>Recommendations</Label>
                <p className="text-sm text-muted-foreground">{aiInsights.recommendations}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={getAiInsights}
            disabled={exercises.length === 0 || saving}
          >
            Get AI Insights
          </Button>
          <Button
            onClick={handleFinishWorkout}
            disabled={exercises.length === 0 || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Finish Workout
          </Button>
        </div>
      </div>
    </div>
  );
}