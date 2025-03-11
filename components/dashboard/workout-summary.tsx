"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export function WorkoutSummary() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalCalories: 0,
    totalDuration: 0,
    exerciseCount: 0,
  });

  useEffect(() => {
    const fetchTodaysSummary = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: workouts } = await supabase
        .from("workouts")
        .select(`
          *,
          exercises (*)
        `)
        .eq("user_id", session.user.id)
        .gte("start_time", today.toISOString());

      if (workouts) {
        const totalCalories = workouts.reduce((sum, workout) => 
          sum + (workout.total_calories || 0), 0);
        
        const exerciseCount = workouts.reduce((sum, workout) => 
          sum + (workout.exercises?.length || 0), 0);

        const totalDuration = workouts.reduce((sum, workout) => {
          if (workout.end_time && workout.start_time) {
            return sum + (new Date(workout.end_time).getTime() - 
              new Date(workout.start_time).getTime()) / 1000;
          }
          return sum;
        }, 0);

        setSummary({
          totalCalories,
          totalDuration,
          exerciseCount,
        });
      }

      setLoading(false);
    };

    fetchTodaysSummary();
  }, []);

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Calories</p>
          <p className="text-2xl font-bold">{summary.totalCalories}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Exercises</p>
          <p className="text-2xl font-bold">{summary.exerciseCount}</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Duration</p>
        <p className="text-2xl font-bold">
          {Math.floor(summary.totalDuration / 60)}m {Math.floor(summary.totalDuration % 60)}s
        </p>
      </div>
    </div>
  );
}