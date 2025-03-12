"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ExerciseListProps {
  limit?: number;
}

export function ExerciseList({ limit }: ExerciseListProps) {
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchExercises = async () => {
      const { data: { session } } = await supabase.auth.getSession();
     
      if (!session) return;

      let query = supabase
        .from("exercises")
        .select(`
          *,
          workouts!inner(*),
          machines!inner(*)
        `)
        .eq("workouts.user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }


      const { data } = await query;
      console.log("Exercises Data---->", data);

      if (data) {
        setExercises(data);
      }

      setLoading(false);
    };

    fetchExercises();
  }, [limit]);

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Machine</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Calories</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exercises.map((exercise) => (
          <TableRow key={exercise.id}>
            <TableCell>
              {format(new Date(exercise.created_at), "MMM d, yyyy")}
            </TableCell>
            <TableCell>{exercise.machines.name}</TableCell>
            <TableCell>{Math.floor(exercise.duration_seconds / 60)}m</TableCell>
            <TableCell>{exercise.calories_burned}</TableCell>
            <TableCell>
              {exercise.weight_kg && `${exercise.weight_kg}kg `}
              {exercise.sets && exercise.repetitions && 
                `${exercise.sets}×${exercise.repetitions} `}
              {exercise.distance_meters && `${exercise.distance_meters}m`}
            </TableCell>
            <TableCell>
              <Button variant="outline" size="sm" onClick={() => router.push(`/workout/detail/${exercise.id}`)}>
                View Details
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}