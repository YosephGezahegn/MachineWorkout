export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          achieved_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          achieved_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          achieved_at?: string
          created_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          workout_id: string
          machine_id: string
          weight_kg: number | null
          incline_degrees: number | null
          repetitions: number | null
          sets: number | null
          distance_meters: number | null
          duration_seconds: number | null
          calories_burned: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          machine_id: string
          weight_kg?: number | null
          incline_degrees?: number | null
          repetitions?: number | null
          sets?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          calories_burned?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          machine_id?: string
          weight_kg?: number | null
          incline_degrees?: number | null
          repetitions?: number | null
          sets?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          calories_burned?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      machines: {
        Row: {
          id: string
          name: string
          type: Database["public"]["Enums"]["exercise_type"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: Database["public"]["Enums"]["exercise_type"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["exercise_type"]
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          weight_kg: number | null
          height_cm: number | null
          fitness_level: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          fitness_level?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          fitness_level?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          start_time: string
          end_time: string | null
          total_calories: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_time: string
          end_time?: string | null
          total_calories?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_time?: string
          end_time?: string | null
          total_calories?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Enums: {
      exercise_type: "cardio" | "strength" | "flexibility" | "balance"
    }
  }
}