import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ExerciseDetailPage from "./client-page";
import { createClient } from "@/lib/supabase/server";

// This function is required for static site generation with dynamic routes
export async function generateStaticParams() {
  try {
    // Create a Supabase client specifically for server-side operations
    const supabase = createClient();
    
    // Fetch all exercise IDs from your database
    const { data: exercises, error } = await supabase
      .from("exercises")
      .select("id");
    
    if (error) {
      console.error("Error fetching exercises:", error);
      // Return a fallback ID to prevent build failures
      return [{ id: "fallback-exercise-id" }];
    }
    
    // Make sure we have data before mapping
    if (!exercises || exercises.length === 0) {
      console.warn("No exercises found, using fallback ID");
      return [{ id: "fallback-exercise-id" }];
    }
    
    // Return an array of params objects
    console.log(`Generated static params for ${exercises.length} exercises`);
    return exercises.map((exercise: { id: string }) => ({
      id: exercise.id,
    }));
  } catch (error) {
    console.error("Error in generateStaticParams:", error);
    // Return a fallback ID to prevent build failures
    return [{ id: "fallback-exercise-id" }];
  }
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={<div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>}
    > 
      <ExerciseDetailPage params={params} />
    </Suspense>
  );
}
