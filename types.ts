
export enum AppTab {
  DASHBOARD = 'dashboard',
  CHAT = 'chat',
  HISTORY = 'history',
  MENU = 'menu',
  // Sub-pages accessible via Menu
  PANTRY = 'pantry',
  RECIPES = 'recipes',
  SCANNER = 'scanner',
  STATS = 'stats',
  POINTS_GUIDE = 'points_guide',
  WELLNESS_SETTINGS = 'wellness_settings'
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  isThinking?: boolean;
  recipeData?: StructuredRecipe; // For rich UI cards
}

export interface UserRecipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  macros?: {
    calories: string;
    protein: string;
    carbs: string;
    fats: string;
  };
}

export type Intensity = 'Baja' | 'Media' | 'Alta' | 'Extrema';

export interface ExerciseLog {
  type: 'exercise';
  id: string;
  name: string;
  time: string; // Format "HH:MM"
  intensity: Intensity;
  duration: number; // minutes
  caloriesBurned: number; // Estimated or manual
  timestamp: number;
  status?: 'completed'; // Exercises are usually completed when logged
}

export interface MealLog {
  type: 'meal';
  id: string;
  title: string;
  calories: number;
  isHealthy: boolean;
  scoreValue?: number; // New: Allows specific points (positive or negative)
  status: 'pending' | 'completed';
  timestamp: number; // Creation time
  consumedAt?: number; // Completion time
  userNotes?: string;
}

export type HistoryItem = MealLog | ExerciseLog;

export interface DailyPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
  explanation: string;
}

export interface SearchResult {
  text: string;
  sources: {
    title: string;
    uri: string;
  }[];
}

export interface StructuredRecipe {
  title: string;
  time: string;
  ingredients: string[];
  instructions: string[];
  macros: {
    calories: string;
    protein: string;
    carbs: string;
    fats: string;
  };
  missingIngredients?: string[]; // For "Compra Rápida"
}

export interface VisionResult {
  ingredients: string[];
  meals: {
    title: string;
    description: string;
  }[];
}

export interface WaterData {
  date: string; // YYYY-MM-DD
  count: number;
  lastSipTimestamp: number;
}

// --- V11 GAMIFICATION TYPES ---

export interface Streaks {
    nutrition: number;
    exercise: number;
    hydration: number;
    habits: number; // V12
}

export interface MetricBreakdown {
    current: number;
    max: number;
    percent: number;
    label: string; // e.g., "XP" or "Vasos"
}

export interface DailyBreakdown {
    nutrition: MetricBreakdown;
    exercise: MetricBreakdown;
    hydration: MetricBreakdown;
    totalXP: number;
}

export interface WeeklyStatsData {
    day: string;
    nutritionXP: number;
    exerciseMins: number;
    waterCups: number;
}

// --- V12 WELLNESS TYPES ---

export interface WellnessSettings {
    enableSleep: boolean;
    enableSteps: boolean;
    enableHabits: boolean;
}

export interface SleepLog {
    date: string; // YYYY-MM-DD
    hours: number;
}

export interface StepsLog {
    date: string; // YYYY-MM-DD
    count: number;
}

export interface Habit {
    id: string;
    title: string;
}

export interface HabitLog {
    date: string; // YYYY-MM-DD
    habitId: string;
}
