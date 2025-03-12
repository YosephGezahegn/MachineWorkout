"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/header";
import { WorkoutSummary } from "@/components/dashboard/workout-summary";
import { ExerciseList } from "@/components/dashboard/exercise-list";
import { ProgressCharts } from "@/components/dashboard/progress-charts";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { History } from "@/components/workout/History";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { withAuth } from "@/hooks/use-auth";

function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user || undefined} />
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workouts">Workouts</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Today&apos;s Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <WorkoutSummary />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressCharts />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/workout/new">
                    <Button className="w-full">Start New Workout</Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline" className="w-full">View Profile</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="workouts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Workout History</CardTitle>
                <Link href="/workout/new">
                  <Button>Start New Workout</Button>
                </Link>
                <Link href="/workout/history">
                  <Button>View History</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <ExerciseList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressCharts />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
              </CardHeader>
              <CardContent>
                <History />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default withAuth(Dashboard);