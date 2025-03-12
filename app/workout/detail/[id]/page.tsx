"use client";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ClientWorkoutDetailPage from "./client-page";
import { useEffect, useState } from "react";

interface Machine {
  id: string;
  name: string;
  type: "cardio" | "strength";
}

interface ExerciseData {
  id: string;
  machine_id: string;
  weight_kg?: number;
  distance_meters?: number;
  duration_seconds: number;
  calories_burned: number;
  incline_degrees?: number;
  machine: Machine[] | null;
}

interface Exercise {
  id: string;
  machine_id: string;
  weight_kg: number | null;
  distance_meters: number | null;
  duration_seconds: number;
  calories_burned: number;
  incline_degrees: number | null;
  machines: {
    id: string;
    name: string;
    type: 'cardio' | 'strength';
    created_at: string;
    updated_at: string;
  };
}

interface WorkoutDetail {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  total_calories: number;
  total_duration: number;
  exercises: Exercise[];
  created_at: string;
  updated_at: string;
  ai_notes: string | null;
  ai_calculated_calories: number | null;
  ai_overall_recommendations: string | null;
}

export default async function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();

  console.log("Session----->", session);

/*   if (!session) {
    redirect('/auth/login');
  } */
  
  console.log("Fetching workout with ID:", id);
  
  // Fetch workout data
  const { data: workoutData, error: workoutError } = await supabase
   .from('workouts')
    .select(`*`)
    .eq("id", id)
    .eq("user_id", session?.user.id)
    .single();
  
  console.log("Fetched workout:", workoutData);

  if (!workoutData) {
    console.error("No workout data found");
    return <ClientWorkoutDetailPage error="Workout not found." />;
  }

  if (workoutError) {
    console.error("Error fetching workout:", workoutError);
    return <ClientWorkoutDetailPage error="Failed to fetch workout details. Please try again later." />;
  }
  
  // Fetch exercises for this workout with more detailed logging
  console.log("Fetching exercises for workout ID:", id);
  const { data: exercisesData, error: exercisesError } = await supabase
    .from("exercises")
    .select(`
      id,
      machine_id,
      weight_kg,
      distance_meters,
      duration_seconds,
      calories_burned,
      incline_degrees, 
      machines(*)
    `)
    .eq("workout_id", id);
  
  console.log("Raw exercises data:", exercisesData);
  
  if (exercisesError) {
    console.error("Error fetching exercises:", exercisesError);
    return <ClientWorkoutDetailPage error="Failed to fetch exercises. Please try again later." />;
  }
  
  // Process exercises with machine details
  const exercisesWithMachines: Exercise[] = exercisesData.map((exercise: any) => {
    const machineData = exercise.machines as Exercise['machines'];
    
    return {
      id: exercise.id,
      machine_id: exercise.machine_id,
      weight_kg: exercise.weight_kg,
      distance_meters: exercise.distance_meters,
      duration_seconds: exercise.duration_seconds,
      calories_burned: exercise.calories_burned,
      incline_degrees: exercise.incline_degrees,
      machines: {
        id: machineData.id,
        name: machineData.name,
        type: machineData.type as 'cardio' | 'strength',
        created_at: machineData.created_at,
        updated_at: machineData.updated_at
      }
    };
  });
  
  // Calculate total duration
  const totalDuration = exercisesWithMachines.reduce(
    (sum, exercise) => sum + exercise.duration_seconds,
    0
  );
  
  // Combine all the data
  const formattedWorkout: WorkoutDetail = {
    id: workoutData.id,
    user_id: workoutData.user_id,
    start_time: workoutData.start_time,
    end_time: workoutData.end_time,
    notes: workoutData.notes,
    total_calories: workoutData.total_calories,
    total_duration: totalDuration,
    exercises: exercisesWithMachines,
    created_at: workoutData.created_at,
    updated_at: workoutData.updated_at,
    ai_notes: workoutData.ai_notes,
    ai_calculated_calories: workoutData.ai_calculated_calories,
    ai_overall_recommendations: workoutData.ai_overall_recommendations,
  };

  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  // Format duration in minutes and seconds
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  // Format distance in meters or kilometers
  const formatDistance = (meters: number): string => {
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)}km` : `${meters}m`;
  };

  // Get machine type
  const getMachineType = (machine: Exercise['machines']): 'cardio' | 'strength' => {
    return machine.type;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="bg-black text-white rounded-lg shadow-xl p-6 mb-6">
        <h1 className="text-3xl font-bold mb-6 text-white border-b border-gray-700 pb-4">Workout Details</h1>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm text-gray-400">Start Time</p>
            <p className="text-lg font-semibold text-white">{formatDate(formattedWorkout.start_time)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm text-gray-400">End Time</p>
            <p className="text-lg font-semibold text-white">{formatDate(formattedWorkout.end_time)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-400">Notes</p>
            <p className="text-lg text-white">{formattedWorkout.notes || 'No notes'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm text-gray-400">Total Calories</p>
            <p className="text-lg font-semibold text-white">{formattedWorkout.total_calories} kcal</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm text-gray-400">Total Duration</p>
            <p className="text-lg font-semibold text-white">{formatDuration(formattedWorkout.total_duration)}</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-4">Exercises</h2>
        <div className="space-y-4">
          {formattedWorkout.exercises.map(exercise => {
            const machineType = getMachineType(exercise.machines);
            const isCardio = machineType === 'cardio';
            const isTreadmill = exercise.machines.name === 'Treadmill';

            return (
              <div key={exercise.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{exercise.machines.name}</h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      isCardio ? 'bg-blue-900 text-blue-200' : 'bg-red-900 text-red-200'
                    }`}>
                      {machineType.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">
                      {formatDuration(exercise.duration_seconds)}
                    </span>
                    <p className="text-sm text-gray-400">Duration</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-800 rounded p-3">
                    <span className="text-gray-400 text-sm">Calories</span>
                    <p className="text-lg font-bold text-white">{exercise.calories_burned} kcal</p>
                  </div>

                  {!isCardio && exercise.weight_kg && (
                    <div className="bg-gray-800 rounded p-3">
                      <span className="text-gray-400 text-sm">Weight</span>
                      <p className="text-lg font-bold text-white">
                        {exercise.weight_kg} kg
                        {exercise.weight_kg >= 9 && exercise.weight_kg <= 109 && (
                          <span className="text-xs text-gray-400 ml-1">(within range)</span>
                        )}
                      </p>
                    </div>
                  )}

                  {isTreadmill && (
                    <>
                      {exercise.distance_meters && (
                        <div className="bg-gray-800 rounded p-3">
                          <span className="text-gray-400 text-sm">Distance</span>
                          <p className="text-lg font-bold text-white">
                            {formatDistance(exercise.distance_meters)}
                            {exercise.distance_meters >= 100 && exercise.distance_meters <= 2000 && (
                              <span className="text-xs text-gray-400 ml-1">(within range)</span>
                            )}
                          </p>
                        </div>
                      )}
                      {exercise.incline_degrees && (
                        <div className="bg-gray-800 rounded p-3">
                          <span className="text-gray-400 text-sm">Incline</span>
                          <p className="text-lg font-bold text-white">
                            {exercise.incline_degrees}°
                            {exercise.incline_degrees >= 1 && exercise.incline_degrees <= 15 && (
                              <span className="text-xs text-gray-400 ml-1">(within range)</span>
                            )}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
