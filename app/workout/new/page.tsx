"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";
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
  weightKg?: number;
  inclineDegrees?: number;
  repetitions?: number;
  sets?: number;
  distanceMeters?: number;
  durationSeconds: number;
  caloriesBurned: number;
  notes?: string;
}

export default function NewWorkout() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutStartTime] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const fetchMachines = async () => {
      const { data } = await supabase
        .from("machines")
        .select("*")
        .order("name");

      if (data) {
        setMachines(data);
      }
      setLoading(false);
    };

    fetchMachines();
  }, []);

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        machineId: "",
        durationSeconds: 0,
        caloriesBurned: 0,
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = {
      ...updatedExercises[index],
      [field]: value,
    };
    setExercises(updatedExercises);
  };

  const getMachineType = (machineId: string): string | undefined => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.type;
  };

  const isTreadmill = (machineId: string): boolean => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.name === 'Treadmill';
  };

  const handleFinishWorkout = async () => {
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // Create workout
      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert([
          {
            user_id: session.user.id,
            start_time: workoutStartTime,
            end_time: new Date().toISOString(),
            total_calories: exercises.reduce((sum, ex) => sum + ex.caloriesBurned, 0),
          },
        ])
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Create exercises
      const exercisePromises = exercises.map((exercise) =>
        supabase.from("exercises").insert([
          {
            workout_id: workout.id,
            machine_id: exercise.machineId,
            weight_kg: exercise.weightKg,
            incline_degrees: exercise.inclineDegrees,
            repetitions: exercise.repetitions,
            sets: exercise.sets,
            distance_meters: exercise.distanceMeters,
            duration_seconds: exercise.durationSeconds,
            calories_burned: exercise.caloriesBurned,
            notes: exercise.notes,
          },
        ])
      );

      await Promise.all(exercisePromises);

      toast({
        title: "Success",
        description: "Workout completed successfully!",
      });

      router.push("/dashboard");
    } catch (error: any) {
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>New Workout</CardTitle>
            <Button onClick={addExercise}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {exercises.map((exercise, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">Exercise {index + 1}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExercise(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
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
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={Math.floor(exercise.durationSeconds / 60)}
                        onChange={(e) =>
                          updateExercise(
                            index,
                            "durationSeconds",
                            parseInt(e.target.value) * 60
                          )
                        }
                      />
                    </div>
                    {getMachineType(exercise.machineId) === 'strength' && (
                      <div className="space-y-2">
                        <Label>Weight (kg)</Label>
                        <Input
                          type="number"
                          value={exercise.weightKg || ""}
                          onChange={(e) =>
                            updateExercise(
                              index,
                              "weightKg",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                      </div>
                    )}
                    {getMachineType(exercise.machineId) === 'strength' && (
                      <div className="space-y-2">
                        <Label>Sets</Label>
                        <Input
                          type="number"
                          value={exercise.sets || ""}
                          onChange={(e) =>
                            updateExercise(index, "sets", parseInt(e.target.value))
                          }
                        />
                      </div>
                    )}
                    {getMachineType(exercise.machineId) === 'strength' && (
                      <div className="space-y-2">
                        <Label>Repetitions</Label>
                        <Input
                          type="number"
                          value={exercise.repetitions || ""}
                          onChange={(e) =>
                            updateExercise(
                              index,
                              "repetitions",
                              parseInt(e.target.value)
                            )
                          }
                        />
                      </div>
                    )}
                    {isTreadmill(exercise.machineId) && (
                      <div className="space-y-2">
                        <Label>Incline (degrees)</Label>
                        <Input
                          type="number"
                          value={exercise.inclineDegrees || ""}
                          onChange={(e) =>
                            updateExercise(
                              index,
                              "inclineDegrees",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                      </div>
                    )}
                    {getMachineType(exercise.machineId) === 'cardio' && (
                      <div className="space-y-2">
                        <Label>Distance (meters)</Label>
                        <Input
                          type="number"
                          value={exercise.distanceMeters || ""}
                          onChange={(e) =>
                            updateExercise(
                              index,
                              "distanceMeters",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                      </div>
                    )}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Input
                        value={exercise.notes || ""}
                        onChange={(e) =>
                          updateExercise(index, "notes", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Calories Burned</Label>
                      <Input
                        type="number"
                        value={exercise.caloriesBurned}
                        onChange={(e) =>
                          updateExercise(
                            index,
                            "caloriesBurned",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {exercises.length > 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={handleFinishWorkout}
                  disabled={saving}
                  className="w-full md:w-auto"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Finish Workout
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}