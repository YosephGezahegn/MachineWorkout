"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { startOfWeek, addDays, format } from "date-fns";
import { Loader2 } from "lucide-react";

export function ProgressCharts() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const startDate = startOfWeek(new Date());
      const dates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

      const { data: workouts } = await supabase
        .from("workouts")
        .select(`
          *,
          exercises (*)
        `)
        .eq("user_id", session.user.id)
        .gte("start_time", startDate.toISOString())
        .order("start_time", { ascending: true });

      const chartData = dates.map(date => {
        const dayWorkouts = workouts?.filter(workout => 
          new Date(workout.start_time).toDateString() === date.toDateString()
        ) || [];

        return {
          date: format(date, "EEE"),
          calories: dayWorkouts.reduce((sum, workout) => 
            sum + (workout.total_calories || 0), 0),
          duration: dayWorkouts.reduce((sum, workout) => {
            if (workout.end_time && workout.start_time) {
              return sum + (new Date(workout.end_time).getTime() - 
                new Date(workout.start_time).getTime()) / (1000 * 60);
            }
            return sum;
          }, 0),
          exercises: dayWorkouts.reduce((sum, workout) => 
            sum + (workout.exercises?.length || 0), 0),
        };
      });

      setData(chartData);
      setLoading(false);
    };

    fetchWeeklyData();
  }, []);

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  return (
    <Tabs defaultValue="calories" className="space-y-4">
      <TabsList>
        <TabsTrigger value="calories">Calories</TabsTrigger>
        <TabsTrigger value="duration">Duration</TabsTrigger>
        <TabsTrigger value="exercises">Exercises</TabsTrigger>
      </TabsList>

      <TabsContent value="calories">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Calories Burned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="duration">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Workout Duration (minutes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="duration"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="exercises">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Exercise Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="exercises"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}