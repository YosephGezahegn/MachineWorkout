import { supabase } from "@/lib/supabase/client";



export const fetchWorkout = async (id: string, session: any) => {
    const query = supabase
        .from('workouts')
        .select(`*`)
        .eq("id", id)
        .eq("user_id", session?.user.id)
        .limit(1);

    const { data: workoutData, error: workoutError } = await query;

    console.log("Workout Data---->", workoutData);
    return workoutData;
};

export const fetchExercises = async (id: string) => {
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
            machine:machines(id, name, type)
        `)
        .eq("workout_id", id);

    return exercisesData;
};